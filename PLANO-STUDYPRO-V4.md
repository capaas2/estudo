# StudyPro v4 — Plano de Reconstrução Detalhado

> Documento de planejamento técnico para ser usado como contexto/instrução para o **Antigravity** desenvolver a v4 do StudyPro. Esta versão substitui a anterior: backend migra de Supabase para **Appwrite** (benefício do GitHub Student Pack válido durante toda a faculdade, não só alguns meses), o **Calendário foi removido**, e cada página do app está especificada em detalhe — o que mostra, quais dados usa, o que a IA faz nela, e como ela se conecta com as outras.

---

## 0. Resumo Executivo

A v4 mantém a essência do StudyPro v3 (gestão de estudos de Medicina com IA integrada em quase toda tela), mas muda três coisas estruturais a pedido seu:

1. **Backend sai do Supabase e vai para o Appwrite.** O plano Education do Appwrite, feito em parceria com o GitHub Student Developer Pack, dá acesso ao equivalente do plano Pro **durante toda a sua vida de estudante verificado** — não é um crédito que acaba em alguns meses, é "throughout the course of your student career". Isso resolve sua exigência principal: usar um benefício do pack que dure a faculdade inteira, não só um trimestre.
2. **Sem Calendário nesta versão.** FullCalendar, sincronização com Google Calendar e a tela de calendário inteira saem do escopo. Tarefas e Revisões continuam tendo data, só que em lista — não em grade de calendário.
3. **Domínio já existe** — não há necessidade de usar o benefício de domínio do pack; só falta apontar o DNS pra onde o app for hospedado.

O resto do documento detalha, página por página, como cada parte do app vai funcionar e se conectar dentro dessa nova arquitetura.

---

## 1. Diagnóstico do v3 (contexto, não muda)

### 1.1 O que existia

Dashboard, Períodos → Matérias → Workspace (12 abas, incluindo Calendário e Tutoria), Banco de Questões, Simulados, Revisões, Flashcards, Tutoria, Calendário com Google Calendar, Arquivos, Analytics, Configurações, e 11 funções de IA (Gemini + OpenRouter) cobrindo desde correção de discursiva até geração de plano semanal.

### 1.2 Pontos fortes a preservar

Modelo de dados maduro, prompts de IA bem desenhados (regras explícitas de rigor, JSON consistente, fallback de 5 modelos gratuitos), design system dark/glass já estabelecido em `globals.css`, chaves de IA protegidas no servidor.

### 1.3 Dívidas técnicas identificadas

100% client-side rendering, TanStack Query instalado e nunca usado, sem middleware de auth, zero testes, IA síncrona sem fila/retry, schema sem migrations versionadas, onboarding hardcoded pro seu currículo específico, token do Google Calendar em `localStorage`, componentes de 500+ linhas, tipagem `any` em pontos críticos.

---

## 2. Objetivos da v4

1. **Fundação técnica sólida** — SSR/RSC, testes mínimos, observabilidade real via Sentry.
2. **IA assíncrona e resiliente** — tarefas pesadas (PDF, Clube de Revista) saem do caminho síncrono e vão para Funções do Appwrite, com retry e status real de progresso.
3. **Redesign de UX/UI** — design system consolidado, componentes menores, navegação sem duplicação.
4. **Pronto para multiusuário, sem virar produto agora** — wizard de currículo no lugar de scripts SQL manuais.

---

## 3. Arquitetura

### 3.1 Por que Appwrite no lugar de Supabase

O Supabase não é benefício do GitHub Student Pack — você paga (ou usa o free tier, que tem limites de projeto pausado por inatividade). O Appwrite é parceiro oficial do pack desde 2024, e a redação do próprio benefício é explícita: acesso gratuito ao plano Education (equivalente a 2 projetos no nível Pro, ~US$ 40/mês de valor cada) **durante toda a sua carreira de estudante**, válido até você se graduar e deixar de ser membro do GitHub Education. Isso é categoricamente diferente de um crédito de US$ 100-200 que acaba em meses.

E não é só banco de dados: o Appwrite é uma plataforma completa — Auth, Databases (com relacionamentos e queries entre tabelas), Storage, Functions (serverless, com cron nativo), Realtime e Messaging (push/e-mail) — tudo na mesma conta gratuita. Isso significa que o **worker assíncrono** que antes seria um Droplet pago da DigitalOcean também passa a ser gratuito: Appwrite Functions já suporta execução agendada por cron (a cada minuto, se preciso) e timeout de até 15 minutos por execução, o que é mais que suficiente para os jobs de IA deste app.

> Ressalva honesta: o Appwrite anunciou em fevereiro de 2026 que projetos do **plano Free** sem atividade de desenvolvimento por 7 dias são pausados automaticamente (cron e Functions agendadas param de rodar). A documentação não deixa 100% claro se o plano Education (que tem limites de uso equivalentes ao Pro) está sujeito à mesma regra do Free. Vale confirmar isso diretamente no painel ao criar o projeto — se a pausa por inatividade se aplicar, a mitigação é simples: um ping periódico (ex.: o próprio cron diário de revisões) mantém o projeto "ativo".

### 3.2 Stack final

| Camada | Ferramenta | Observação |
|---|---|---|
| Frontend | Next.js 16 (App Router, Server Components) | Hospedado no Vercel (free/Hobby) — é o caminho mais maduro pra SSR de Next.js; o Appwrite também tem Hosting, mas prefiro não apostar a entrega inteira do front numa integração menos testada |
| Auth | Appwrite Account/Sessions | Sessão via cookie, lida no middleware do Next.js |
| Banco de dados | Appwrite Databases (Tables/Rows) | Substitui as 17 tabelas do Postgres |
| Arquivos | Appwrite Storage | Substitui Supabase Storage |
| Jobs assíncronos | Appwrite Functions (Node.js runtime) | Substitui o worker da DigitalOcean |
| Progresso em tempo real | Appwrite Realtime | Substitui polling manual |
| Notificações | Appwrite Messaging | Push/e-mail de revisão pendente (novo, opcional) |
| IA | Gemini + OpenRouter (chamados de dentro das Functions ou de API routes leves) | Mesma estratégia de hoje, só muda de onde é chamado |
| Observabilidade | Sentry (plano estudante, renovável a cada ano) | Frontend + Functions |
| Domínio | O que você já tem | Só apontar DNS pro Vercel |

### 3.3 Dois projetos Appwrite: Produção e Staging

O plano Education libera 2 projetos com limites de Pro. Em vez de gastar isso com "2 apps diferentes", uso os 2 exatamente como staging/produção:

- **Projeto `studypro-prod`**: dados reais, o app de verdade.
- **Projeto `studypro-staging`**: cópia do schema (sem os dados sensíveis, ou com uma amostra), onde o Antigravity testa mudanças de schema e Functions antes de tocar em produção.

Isso resolve, de graça, o mesmo problema que antes eu ia resolver gastando crédito da Azure — e sem depender de um crédito que expira.

### 3.4 Tabelas do banco (mapeamento do schema atual)

| Tabela (Appwrite) | Equivalente no v3 | Relacionamentos principais |
|---|---|---|
| `periods` | `Period` | 1 → N `subjects_workspace` |
| `materias` | `Materia` | 1 → N `subjects_workspace`, `questoes`, `notes` |
| `subjects_workspace` | `SubjectWorkspace` | pertence a `period` + `materia` |
| `subtemas` | `Subtema` | pertence a `materia` |
| `questoes` | `Questao` | pertence a `materia`/`subtema`; referenciada por `respostas_simulado` |
| `simulados` | `Simulado` | 1 → N `respostas_simulado`, 1 → 1 `analises_simulado` |
| `respostas_simulado` | `RespostaSimulado` | pertence a `simulado` + `questao` |
| `notes` | `Note` | hierarquia pai-filho + **backlinks** (novo, ver 6.5) |
| `reviews` | `Review` | pertence a `materia`/`questao` |
| `flashcards` + `flashcard_reviews` | `Flashcard`, `FlashcardReview` | `flashcard_reviews` ganha os campos do algoritmo **FSRS** no lugar do SM-2 |
| `goals` / `productivity_logs` | `Goal`, `ProductivityLog` | alimentam o painel de metas/streak (novo, ver 6.12) |
| `embeddings` | *novo* | pertence a `note` ou `arquivo`; vetor gerado pela API de embeddings do Gemini, usado pelo IA Copilot |
| `jobs` | *novo* | rastreia execuções de Functions assíncronas, pra UI mostrar progresso real via Realtime |

**O que sai do schema:** `CalendarEvent` (calendário removido), `TutoringGroup`/`TutoringSection` (Tutoria passa a ser um `tipo` dentro de `notes`), campo `google_token` de `UserPreferences`.

### 3.5 Funções Appwrite (o "worker" de antes)

| Função | Disparo | O que faz | Tempo esperado |
|---|---|---|---|
| `extrair-questoes-pdf` | Chamada direta (usuário envia PDF) | Extrai texto do PDF, manda pro Gemini/OpenRouter, retorna questões estruturadas | segundos a poucos minutos |
| `analisar-clube-revista` | Chamada direta | Lê PDF do artigo, gera resumo/metodologia/vieses/perguntas via IA | até alguns minutos (PDFs grandes) |
| `gerar-flashcards-lote` | Chamada direta | A partir de uma Nota/Arquivo, gera N flashcards via IA | segundos |
| `corrigir-discursiva` | Chamada direta | Corrige resposta discursiva de simulado | segundos |
| `analisar-desempenho-simulado` | Evento (ao finalizar simulado) | Gera análise de desempenho + cria `reviews` automaticamente pros erros | até 1 minuto |
| `recalcular-revisoes` | Cron diário | Recalcula fila de repetição espaçada (FSRS) de todos os usuários | minutos |
| `gerar-plano-semanal` | Cron semanal | Gera o plano de estudo da semana sem o usuário pedir | minutos |
| `gerar-embedding` | Evento (nota/arquivo criado ou editado) | Chama a API de embeddings do Gemini e grava em `embeddings` | segundos |
| `responder-copiloto` | Chamada direta | Recebe pergunta, busca embeddings mais similares (calculado na própria função, sem `pgvector`), monta prompt com contexto e chama o Gemini | segundos |

Todas escrevem progresso na tabela `jobs`; o frontend assina aquele documento via Appwrite Realtime e atualiza a tela sem precisar dar refresh.

### 3.6 Busca semântica sem `pgvector`

Como o Appwrite não tem um índice de vetores nativo, a v4 guarda o embedding (um array de números) como atributo na tabela `embeddings`, e a comparação de similaridade (cosseno) é calculada dentro da própria Function `responder-copiloto`, em memória. Para o volume de dados de uma pessoa estudando (centenas a poucos milhares de notas/arquivos), isso é rápido o suficiente — não precisa de um banco de vetores dedicado.

### 3.7 Permissões (equivalente ao RLS do Postgres)

O Appwrite não tem Row Level Security como o Postgres; em vez disso, cada linha criada ganha permissões explícitas (`read("user:ID")`, `update("user:ID")`, `delete("user:ID")`), configuradas automaticamente pelo SDK no momento da criação. O efeito prático — cada usuário só vê e edita os próprios dados — é o mesmo que as policies de RLS faziam no Supabase.

### 3.8 O que fica de fora do núcleo da arquitetura

- **Calendário** (FullCalendar + Google Calendar): removido nesta versão.
- **DigitalOcean / Azure**: deixam de ser parte obrigatória da arquitetura, porque os créditos deles não satisfazem "gratuito durante toda a faculdade" — ficam como opção futura caso surja uma necessidade pontual (ex.: rodar algo que exija mais de 15 minutos de execução, o que as Functions do Appwrite não cobrem).
- **Domínio do pack** (Namecheap/.tech): não necessário, você já tem domínio.

---

## 4. Benefícios do GitHub Student Pack usados

| Benefício | Papel no projeto | Por que é durável |
|---|---|---|
| **Appwrite Education** | Banco de dados, Auth, Storage, Functions (worker), Realtime, Messaging — o backend inteiro | Válido durante toda a sua carreira de estudante, renovado automaticamente enquanto você estiver verificado no GitHub Education |
| **Sentry (plano estudante)** | Observabilidade: erros, performance, replay de sessão, no frontend e nas Functions | Limite de 1 ano, mas renovável a cada novo ano de matrícula — não é um crédito que se esgota |

DigitalOcean, Azure, MongoDB, domínio e demais benefícios do pack ficam fora do núcleo desta arquitetura pelo motivo explicado na seção 3.8 — não satisfazem o critério de durabilidade que você definiu como prioridade.

---

## 5. Sitemap (visão geral)

```
/onboarding                          (só no primeiro login)
/                                    Dashboard
/periodos                            Lista de períodos
/periodos/[id]                       Matérias daquele período
/periodos/[id]/[subjectId]           Workspace da matéria (abas internas)
/questoes                            Banco de Questões (global, filtro de matéria)
/simulados                           Lista de simulados
/simulados/criar                     Criar simulado
/simulados/[id]/executar             Executar simulado
/simulados/[id]/resultado            Resultado + análise
/flashcards                          Flashcards (global, filtro de matéria)
/revisoes                            Fila de revisão (global, filtro de matéria)
/arquivos                            Arquivos + Biblioteca de Conteúdo Interativo
/analytics                           Analytics (global, filtro de matéria)
/copiloto                            IA Copilot (global; contextual quando aberto de dentro do workspace)
/configuracoes                       Perfil, segurança, Saúde do App, Metas/Streak
```

Note que **Flashcards, Revisões, Questões, Arquivos e Analytics não existem em duas implementações** (uma global e outra dentro do workspace). É um único componente por funcionalidade (ex.: `<QuestoesView materiaId?: string />`) que recebe `materiaId` como prop — quando acessado pela barra lateral, sem filtro fixo (mostra seletor de matéria); quando acessado de dentro do workspace de uma matéria, o `materiaId` já vem preso e o seletor fica escondido. Mesma tela, dois contextos, zero código duplicado.

---

## 6. Especificação Detalhada de Cada Página

### 6.1 Onboarding — `/onboarding`

**Quando aparece:** primeiro login, quando o usuário ainda não tem nenhum documento em `periods`.
**Mostra:** wizard em 3 passos — (1) nome do curso e quantidade de períodos; (2) para cada período, adicionar matérias (nome, cor, carga horária — opcional); (3) opção "carregar meu currículo de Medicina como sugestão" (pré-popula com o que você já tem hoje, totalmente editável antes de confirmar).
**Dados:** cria documentos em `periods` e `subjects_workspace`.
**Ações:** avançar/voltar entre passos, editar/remover itens, pular etapas opcionais.
**IA:** nenhuma.
**Liga com:** ao concluir, redireciona para o Dashboard (`/`).

### 6.2 Dashboard — `/`

**Mostra:** gráfico de evolução de notas, lista de conteúdos com mais erros, cards de período com progresso agregado, painel de metas/streak (novo, seção 6.12), insights de IA com indicação de quando foram gerados pela última vez, ações rápidas.
**Dados:** lê `simulados`, `respostas_simulado`, `periods`, `subjects_workspace`, `reviews` (contagem pendente), `goals`/`productivity_logs`.
**Ações:** clicar num período → `/periodos/[id]`; ações rápidas → `/simulados/criar`, `/revisoes`, `/flashcards`; botão "atualizar insights" chama a IA de forma síncrona (é rápido).
**IA:** os insights já vêm pré-computados pela Function `gerar-plano-semanal`/cron, mas o usuário pode forçar uma atualização manual.
**Liga com:** é o hub central — todo módulo principal é alcançável a partir daqui.

### 6.3 Períodos — `/periodos`

**Mostra:** todos os períodos cadastrados, com progresso agregado das matérias de cada um.
**Dados:** lê `periods` + contagem agregada de `subjects_workspace`.
**Ações:** criar novo período, editar/arquivar período existente.
**IA:** nenhuma.
**Liga com:** clicar num card → `/periodos/[id]`.

### 6.4 Detalhe do Período — `/periodos/[id]`

**Mostra:** matérias daquele período em cards (status, progresso, professor, carga horária).
**Dados:** lê/escreve `subjects_workspace` filtrado por `period_id`.
**Ações:** adicionar/editar/arquivar matéria.
**IA:** nenhuma.
**Liga com:** clicar numa matéria → `/periodos/[id]/[subjectId]` (workspace).

### 6.5 Workspace da Matéria — `/periodos/[id]/[subjectId]`

Shell com abas internas. Cada aba reaproveita o componente da página global correspondente (seção 5), com `materiaId` travado.

- **Visão Geral**: resumo da matéria — progresso, próximas revisões, últimas notas, atalhos para as outras abas.
- **Notas**: editor Tiptap (tabelas, código, highlight, listas). Ganha duas coisas novas: **backlinks** (referência cruzada entre notas, estilo "ver também", em vez de só hierarquia pai-filho) e um campo `tipo` que pode ser `comum`, `resumo-ia` ou **`tutoria`** — é aqui que a antiga funcionalidade de Tutoria vive agora, sem tabela própria: uma nota tipo `tutoria` tem campo de data e aparece numa lista filtrada por esse tipo, ordenada cronologicamente, sem precisar de grade de calendário.
- **Tarefas**: lista simples com data, ordenada cronologicamente (sem calendário).
- **Revisões**: `<RevisoesView materiaId={id} />` — fila de repetição espaçada (FSRS) filtrada pra essa matéria.
- **Flashcards**: `<FlashcardsView materiaId={id} />` — deck da matéria, criação manual ou via IA a partir de uma Nota/Arquivo.
- **Arquivos**: `<ArquivosView materiaId={id} />` — upload de material e a Biblioteca de Conteúdo Interativo filtrada pra essa matéria (seção 6.10).
- **Questões**: `<QuestoesView materiaId={id} />` — banco de questões filtrado pra essa matéria.
- **Analytics**: `<AnalyticsView materiaId={id} />` — desempenho específico da matéria.
- **IA Copilot**: mesmo `/copiloto`, mas com o contexto de busca semântica restrito às notas/arquivos dessa matéria.
- **Clube de Revista**: upload de artigo científico em PDF → Function `analisar-clube-revista` → resultado com resumo, metodologia, vieses/limitações, aplicabilidade clínica e perguntas pra debate.

**Liga com:** é o nó central de uma matéria — todas as abas levam a visões já filtradas das páginas globais; o link inverso (de uma página global de volta pro workspace) acontece clicando no nome da matéria em qualquer card de questão/flashcard/nota.

### 6.6 Banco de Questões — `/questoes`

**Mostra:** lista/grid de questões com filtros — matéria, subtema, dificuldade, tags e, **novo**, banca/estado/ano/instituição (padrão das plataformas de preparação pra residência).
**Dados:** lê/escreve `questoes`.
**Ações:** criar questão manualmente, importar de PDF (Function `extrair-questoes-pdf`, assíncrona), gerar gabarito/explicação via IA (síncrono, é rápido), favoritar questão (novo).
**IA:** síncrona para gabarito simples; assíncrona (Function) pra extração de PDF.
**Liga com:** questões favoritadas/com erro alimentam a criação automática de Simulados (6.7) e a fila de Revisões (6.9); clicar na matéria de uma questão → workspace daquela matéria.

### 6.7 Simulados — `/simulados`, `/simulados/criar`, `/simulados/[id]/executar`, `/simulados/[id]/resultado`

**Criar:** seleção manual de questões, ou automática (a Function escolhe priorizando seus erros anteriores).
**Executar:** cronômetro; **novo** — modo "Tutor" (mostra dicas durante a prova) vs. "Cronometrado" (sem ajuda, treino pra prova real).
**Resultado:** nota, correção de discursivas via IA (Function `corrigir-discursiva`), análise de desempenho (Function `analisar-desempenho-simulado`, com status de progresso via Realtime), e criação automática de `reviews` para cada erro.
**Dados:** `simulados`, `respostas_simulado`, `analises_simulado`.
**Liga com:** puxa questões de `/questoes`; o resultado empurra revisões pra `/revisoes` automaticamente.

### 6.8 Flashcards — `/flashcards`

**Mostra:** decks por matéria, fila de revisão calculada pelo **algoritmo FSRS** (no lugar do SM-2 atual).
**Ações:** criar manualmente, gerar via IA a partir de texto colado ou de uma Nota/Arquivo específico, revisar (marcar fácil/médio/difícil, o que recalcula o próximo intervalo via FSRS).
**Dados:** `flashcards`, `flashcard_reviews`.
**IA:** Function `gerar-flashcards-lote`.
**Liga com:** pode ser disparado a partir de uma Nota ("gerar flashcards desta nota") ou de uma Questão errada.

### 6.9 Revisões — `/revisoes`

**Mostra:** fila de repetição espaçada — hoje, atrasadas, futuras — recalculada todo dia pela Function `recalcular-revisoes`.
**Dados:** `reviews`.
**IA:** nenhuma na tela; a Function que recalcula prioridades roda em background.
**Liga com:** alimentada automaticamente por erros de Simulado (6.7) e por Flashcards/Notas marcadas para revisão.

### 6.10 Arquivos — `/arquivos`

**Mostra:** upload de PDFs/imagens por matéria, e uma seção filtrável "Conteúdo Interativo" — é aqui que entra a **Biblioteca de Mnemônicos Visuais**: seus artefatos HTML/SVG de imunologia e histologia, embutidos como `iframe` sandboxed dentro do app, com tags e busca, em vez de ficarem soltos fora dele.
**Dados:** `arquivos` (texto extraído de PDF fica em `texto_extraido`, gerado pela Function de extração).
**Ações:** upload, extrair texto, marcar como "conteúdo interativo" (com o HTML/SVG anexado), favoritar.
**Liga com:** arquivos alimentam o Clube de Revista, a extração de questões e os embeddings do IA Copilot.

### 6.11 Analytics — `/analytics`

**Mostra:** gráficos de desempenho (Recharts) por matéria/período, análise textual gerada por IA.
**Dados:** lê `simulados`, `respostas_simulado`, `reviews`, `flashcard_reviews`.
**IA:** síncrona para poucos simulados; vira Function se for processar o histórico inteiro de uma vez.
**Liga com:** clicar numa matéria com baixo desempenho → workspace daquela matéria, aba Questões já filtrada pelos erros.

### 6.12 Configurações — `/configuracoes`

**Mostra:** perfil e segurança (senha, e-mail), preferências de tema, e dois painéis novos: **Saúde do App** (taxa de sucesso de IA por provedor, erros recentes e latência, alimentado pelo Sentry) e **Metas/Streak** (sequência de dias estudando, metas semanais — reaproveitando o schema `Goal`/`ProductivityLog` que no v3 não tinha tela).
**Liga com:** "Saúde do App" é só leitura, voltada pra você acompanhar a estabilidade do próprio app.

### 6.13 IA Copilot — `/copiloto`

**Mostra:** chat livre com a IA, grounded (RAG) no conteúdo que você mesmo escreveu — notas e arquivos.
**Como funciona:** a Function `responder-copiloto` recebe a pergunta, gera o embedding dela, compara com os embeddings já calculados de notas/arquivos (seção 3.6), pega os mais relevantes como contexto, e só então chama o Gemini/OpenRouter pra responder.
**Contexto:** quando acessado pela barra lateral, busca em tudo; quando acessado de dentro do workspace de uma matéria, a busca fica restrita ao conteúdo daquela matéria.
**Liga com:** respostas podem citar uma nota específica, com link direto pra abrir ela.

---

## 7. Fluxos de Interligação (cenários ponta a ponta)

Pra deixar concreto como as páginas conversam entre si:

1. **Erro em Simulado → Revisão → Flashcard → Nota.** Você erra uma questão no simulado; a Function de análise cria uma `review` automaticamente; ao revisar, você pode gerar um flashcard daquele tópico; o flashcard, por sua vez, pode linkar de volta pra nota original onde o assunto foi estudado (se existir backlink).
2. **Nota de aula → Flashcards → fila de Revisão.** Você escreve uma nota; clica em "gerar flashcards desta nota"; os flashcards entram no deck da matéria e, pelo FSRS, entram na fila de `/revisoes` quando vencerem.
3. **PDF de artigo → Clube de Revista → Arquivos/Notas.** Você sobe um PDF na aba Arquivos da matéria; abre o Clube de Revista, que processa esse mesmo PDF; o resultado fica salvo e acessível tanto pela aba Clube de Revista quanto referenciado no Arquivo original.
4. **Pergunta no IA Copilot → Nota citada.** Você pergunta algo; a resposta cita uma nota específica que você escreveu há semanas; clicar nela abre a nota direto no workspace da matéria correspondente.

---

## 8. Roadmap em Fases

### Fase 0 — Fundação e Infraestrutura
- [ ] Repositório novo (`studypro-v4`).
- [ ] Dois projetos Appwrite criados (`studypro-prod`, `studypro-staging`).
- [ ] Tabelas/relacionamentos da seção 3.4 criados no staging.
- [ ] Sentry criado (frontend + Functions).
- [ ] Middleware de auth do Next.js funcionando contra o staging.

### Fase 1 — Núcleo de Dados, Auth e Onboarding
- [ ] Auth via Appwrite (sessão em cookie, middleware de proteção de rota).
- [ ] Wizard de Currículo (`/onboarding`).
- [ ] Dashboard e `/periodos` como Server Components.

### Fase 2 — Núcleo de Estudo
- [ ] Workspace da matéria com as abas da seção 6.5.
- [ ] Componentes unificados (`QuestoesView`, `RevisoesView`, `FlashcardsView`, `ArquivosView`, `AnalyticsView`) usados tanto global quanto dentro do workspace.
- [ ] Notas com backlinks e o tipo `tutoria`.
- [ ] Testes mínimos: cálculo de progresso da matéria, cálculo de FSRS.

### Fase 3 — Avaliação e Functions de IA
- [ ] Banco de Questões com filtros novos (banca/estado/ano/instituição).
- [ ] Simulados com modo Tutor vs. Cronometrado.
- [ ] Functions da seção 3.5 publicadas e testadas no staging.
- [ ] Cron de revisão diária e plano semanal automático.
- [ ] Sentry instrumentando todas as chamadas de IA.

### Fase 4 — Redesign e Novas Funcionalidades
- [ ] Design system consolidado, auditoria de responsividade mobile.
- [ ] IA Copilot com RAG (`embeddings` + `responder-copiloto`).
- [ ] Biblioteca de Conteúdo Interativo/Mnemônicos dentro de Arquivos.
- [ ] Painel de Saúde do App e Metas/Streak em Configurações.

### Fase 5 — Migração e Lançamento
- [ ] Migração de dados reais (seção 9).
- [ ] Apontar o domínio que você já tem pro Vercel.
- [ ] Alertas do Sentry configurados.
- [ ] Retrospectiva e ajuste do `AGENTS.md` pro próximo ciclo.

---

## 9. Migração de Dados (Supabase → Appwrite)

Diferente da versão anterior deste plano (que assumia continuar no Supabase), agora é uma migração de **plataforma**, não só de schema — merece mais cuidado.

1. O Appwrite tem uma ferramenta oficial de migração em Settings → Migrations → Import Data → Supabase: você informa host/porta/usuário/senha do Postgres (Settings → Database no Supabase) e o endpoint/API key (Settings → API), escolhe os recursos e ele migra contas, linhas e arquivos de storage automaticamente.
2. **Limitações conhecidas e documentadas pelo próprio Appwrite**: índices avançados, funções do Postgres e agendamentos não são migrados (não é problema aqui, porque essa lógica está sendo reescrita do zero nas Functions da seção 3.5); usuários que logaram via OAuth (se houver) precisam reautenticar depois.
3. **Sempre rodar primeiro no `studypro-staging`**, nunca direto em produção. Validar contagem de registros, integridade dos relacionamentos e permissões antes de repetir o processo no `studypro-prod`.
4. Fazer backup (`pg_dump`) do Supabase atual antes de iniciar, independentemente da ferramenta de migração funcionar bem.

---

## 10. Como Usar Este Plano com o Antigravity

Salve este arquivo como `PLANO.md` na raiz do novo repositório e referencie-o no `AGENTS.md`.

Prompt de início pra Fase 0:

```
Leia PLANO.md inteiro antes de começar. Estamos na Fase 0 (Fundação e
Infraestrutura). Não escreva nenhuma feature de produto ainda.

Tarefas desta sessão:
1. Inicializar o repositório com Next.js 16 + TypeScript + Tailwind.
2. Configurar o SDK do Appwrite (node-appwrite no servidor,
   appwrite no cliente) e criar as tabelas/relacionamentos descritos
   na seção 3.4 no projeto de staging (vou criar os dois projetos
   manualmente e te passar os IDs e API keys).
3. Criar middleware.ts de autenticação usando sessão do Appwrite.
4. Deixar claro no README quais passos eu preciso fazer manualmente
   (criar os 2 projetos no Appwrite, criar o projeto no Sentry) —
   você não tem acesso a essas credenciais.

Critério de aceite: app builda, login funciona contra o projeto de
staging do Appwrite, rota protegida redireciona corretamente sem
sessão.
```

Repita o padrão pras fases seguintes: "Leia PLANO.md, estamos na Fase N, critério de aceite é X."

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Plano Education do Appwrite estar sujeito à mesma pausa por inatividade do plano Free | Confirmar diretamente no painel ao criar o projeto; se aplicável, o próprio cron diário de revisões mantém o projeto ativo |
| Migração Supabase → Appwrite perder dados/relacionamentos | Sempre migrar primeiro no staging, validar contagens e integridade antes de tocar produção; backup `pg_dump` prévio |
| Function com timeout de 15 minutos não ser suficiente pra algum PDF muito grande | Quebrar o processamento em lotes menores antes de cair nesse limite; se mesmo assim não bastar, essa é a única situação em que valeria reconsiderar um worker externo |
| Ficar dependente de um único fornecedor (Appwrite) pra Auth+DB+Storage+Functions | É open-source e self-hostável — se um dia você se formar e perder o plano Education, dá pra migrar pra uma instância própria sem reescrever a aplicação |
| Reescrita completa desmotivar pelo tamanho | Fases pequenas com critério de aceite claro, cada uma já "usável" |

---

## 12. Checklist Resumido

- [ ] Fase 0 — Infra (repo, 2 projetos Appwrite, Sentry) concluída
- [ ] Fase 1 — Dados, auth, onboarding concluída
- [ ] Fase 2 — Núcleo de estudo (workspace unificado) concluída
- [ ] Fase 3 — Avaliação + Functions de IA concluída
- [ ] Fase 4 — Redesign + IA Copilot com RAG + Biblioteca de Mnemônicos concluída
- [ ] Fase 5 — Migração de dados + domínio + lançamento concluída
