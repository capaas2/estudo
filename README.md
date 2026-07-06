# StudyPro v4

Plataforma completa de estudos para Medicina, construída com Next.js 16 + Appwrite + Gemini IA.

## 🚀 Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Appwrite (Auth, Database, Storage)
- **IA:** Gemini 2.0 Flash (embeddings, geração de questões, flashcards, mnemônicos, copiloto RAG)
- **State:** Zustand + React Query
- **Animações:** Framer Motion
- **Flashcards:** Algoritmo FSRS v4 (Free Spaced Repetition Scheduler)

## 📋 Funcionalidades

| Módulo | Descrição |
|---|---|
| **Auth** | Login/cadastro via Appwrite, sessão em cookie |
| **Onboarding** | Wizard 3 passos (perfil, períodos, matérias) |
| **Dashboard** | Stats, ações rápidas, atividade recente |
| **Períodos** | CRUD com progresso, matérias vinculadas |
| **Workspace** | 10 tabs por matéria (notas, tarefas, revisões, flashcards, arquivos, questões, analytics, IA copilot, clube de revista) |
| **Simulados** | Criar (manual/automático), executar (cronometrado/tutor), resultado com análise |
| **Flashcards** | FSRS v4, browse por deck, review mode com ratings |
| **Questões** | Banco com filtros, geração via IA, favoritar |
| **Revisões** | Auto-criadas por erros de simulado, repetição espaçada |
| **IA Copilot** | Chat RAG grounded nas notas do aluno |
| **Mnemônicos** | Geração de 3 tipos (acrônimo, história, visual) |
| **Analytics** | Dados reais de simulados, flashcards, revisões |
| **Configurações** | Perfil, metas/streak, saúde do app |

## 🛠️ Setup

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd estudo
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha as variáveis no `.env.local`:
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` — ID do projeto Appwrite
- `APPWRITE_API_KEY` — API Key do Appwrite (com permissões de Database, Storage)
- `GEMINI_API_KEY` — Chave da Gemini API

### 3. Criar banco de dados no Appwrite

```bash
node scripts/setup-appwrite.mjs
```

Isso cria automaticamente o banco `studypro` com todas as 15 coleções, atributos e índices.

**Manual:** Crie o bucket `user-files` no Storage do Appwrite com permissões `create("users")`.

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

### 5. Build de produção

```bash
npm run build
npm start
```

## 📦 Deploy (Vercel)

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente no painel do Vercel
3. Deploy automático a cada push

**Framework Preset:** Next.js (detectado automaticamente)

## 🔄 Migração do Supabase

Se você tem dados no Supabase v3:

### Opção 1: Migração oficial do Appwrite
1. No painel Appwrite → Settings → Migrations → Import Data → Supabase
2. Informe as credenciais do Supabase
3. Migra auth, storage e dados automaticamente

### Opção 2: Script complementar
```bash
# Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local
node scripts/migrate-supabase.mjs
```

Este script faz a transformação de schema (v3 → v4) para cada tabela.

**⚠️ Sempre rode primeiro no projeto de staging!**

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Pages (App Router)
│   ├── api/                # API Routes (IA, auth)
│   ├── periodos/           # Períodos + Workspace
│   ├── simulados/          # Motor de simulados
│   ├── flashcards/         # Flashcards + FSRS
│   ├── questoes/           # Banco de questões
│   ├── revisoes/           # Revisões
│   ├── copiloto/           # IA Copilot RAG
│   ├── analytics/          # Analytics
│   ├── arquivos/           # Arquivos/Storage
│   └── configuracoes/      # Configurações
├── components/
│   ├── layout/             # AppShell, Sidebar
│   ├── shared/             # Modal, EmptyState, Loading
│   └── workspace/          # 10 tabs do workspace
├── hooks/                  # useCurrentUser
├── lib/
│   ├── appwrite/           # Config, collections, permissions
│   └── fsrs.ts             # FSRS engine
├── services/
│   └── database/           # CRUD services (7 módulos)
├── stores/                 # Zustand
└── types/                  # TypeScript types
scripts/
├── setup-appwrite.mjs      # Criar coleções automaticamente
└── migrate-supabase.mjs    # Migrar dados do Supabase
```

## 🔑 Passos Manuais Necessários

1. **Criar projeto no Appwrite** (cloud ou self-hosted)
2. **Criar API Key** com permissões: Database, Storage, Users
3. **Criar bucket `user-files`** no Storage
4. **Obter GEMINI_API_KEY** em https://aistudio.google.com/apikey
5. **(Opcional)** Criar projeto no Sentry para monitoramento

## 📊 Rotas do App (25)

| Tipo | Rotas |
|---|---|
| Estáticas (15) | `/`, `/login`, `/onboarding`, `/periodos`, `/simulados`, `/simulados/criar`, `/flashcards`, `/questoes`, `/revisoes`, `/copiloto`, `/analytics`, `/arquivos`, `/configuracoes` |
| Dinâmicas (5) | `/periodos/[id]`, `/periodos/[id]/[subjectId]`, `/simulados/[id]/executar`, `/simulados/[id]/resultado` |
| API Routes (6) | `/api/auth/session`, `/api/gemini`, `/api/openrouter`, `/api/copiloto`, `/api/embeddings`, `/api/flashcards-ia`, `/api/mnemonicos` |
