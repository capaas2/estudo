// As chaves da API ficam no backend (API routes) para segurança.
const GEMINI_URL = `/api/gemini`
const OPENROUTER_URL = '/api/openrouter'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function extrairJSON(text: string): Record<string, unknown> | null {
  let cleaned = text.trim()
  if (cleaned.startsWith('[') && cleaned.endsWith(']') && cleaned.includes('":')) {
    cleaned = '{' + cleaned.slice(1, -1) + '}'
  }
  try { return JSON.parse(cleaned) } catch { /* */ }
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch { /* */ }
  }
  const codeMatch = cleaned.match(/```json?\s*([\s\S]*?)```/)
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1]) } catch { /* */ }
  }
  return null
}

async function callIA(messages: Message[], jsonMode = false, maxTokens = 32768): Promise<string> {
  try {
    const systemMessage = messages.find(m => m.role === 'system')?.content
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    const body: Record<string, unknown> = {
      contents: userMessages,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      }
    }

    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage }] }
    }
    if (jsonMode) {
      (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json"
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Erro IA response:', res.status, errBody)
      throw new Error(`Erro IA: ${res.status}`)
    }

    const data = await res.json()
    const finishReason = data.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      console.warn('⚠️ Resposta da IA foi TRUNCADA (MAX_TOKENS atingido).')
    }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!content) {
      console.error('Resposta IA vazia:', data)
      throw new Error('Resposta da IA vazia')
    }
    return content
  } catch (err) {
    console.error('Erro ao chamar IA:', err)
    throw err
  }
}

async function callOpenRouterIA(messages: Message[], jsonMode = false, maxTokens = 8000): Promise<string> {
  const fallbackModels = [
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "microsoft/phi-3-medium-128k-instruct:free",
    "openrouter/free"
  ]

  let lastError: Error | undefined

  for (const modelId of fallbackModels) {
    try {
      console.log(`[OpenRouter] Tentando análise com o modelo: ${modelId}`)
      const body: Record<string, unknown> = {
        model: modelId,
        messages: messages,
        temperature: 0.3,
        max_tokens: maxTokens
      }
      if (jsonMode) {
        body.response_format = { type: "json_object" }
      }

      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.text()
        console.warn(`[OpenRouter] Falha no modelo ${modelId} (Status ${res.status}): ${errBody}`)
        lastError = new Error(`Erro OpenRouter no modelo ${modelId}: ${res.status}`)
        continue
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      if (!content) {
        console.warn(`[OpenRouter] Resposta vazia no modelo ${modelId}.`)
        lastError = new Error(`Resposta vazia no modelo ${modelId}`)
        continue
      }
      console.log(`[OpenRouter] Análise concluída com sucesso usando: ${modelId}`)
      return content
    } catch (err) {
      console.warn(`[OpenRouter] Erro de rede/timeout no modelo ${modelId}:`, (err as Error).message)
      lastError = err as Error
    }
  }
  console.error('Erro fatal: Todos os modelos de fallback falharam.')
  throw lastError
}

// ============================================================
// FUNÇÕES EXISTENTES (100% preservadas)
// ============================================================

export async function corrigirDiscursiva(
  enunciado: string,
  subitens: { letra: string; texto: string; gabarito?: string; criterios?: string }[],
  respostasUsuario: string[]
) {
  const prompt = `Você é um professor especialista. Corrija as respostas discursivas abaixo em português do Brasil.

ENUNCIADO: ${enunciado}

${subitens.map((s, i) => `SUBITEM ${s.letra}) ${s.texto}
GABARITO ESPERADO: ${s.gabarito}
CRITÉRIOS: ${s.criterios}
RESPOSTA DO ALUNO: ${respostasUsuario[i] || '(em branco)'}`).join('\n\n')}

Responda APENAS em JSON válido com este formato:
{
  "subitens": [{ "letra": "a", "nota": 0, "feedback": "", "correcao_conceitual": true, "clareza": true, "completude": true }],
  "nota_total": 0,
  "feedback_geral": ""
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor corretor rigoroso. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { subitens: [], nota_total: 0, feedback_geral: resp }
}

export async function analisarDesempenho(simuladoData: {
  materia: string; nota: number; notaMaxima: number; tempoTotal: number;
  questoes: { tipo: string; tema: string; correta: boolean; tempo: number; tags?: string[] }[]
}) {
  const statsPorTema: Record<string, { total: number; acertos: number }> = {}
  simuladoData.questoes.forEach(q => {
    if (!statsPorTema[q.tema]) statsPorTema[q.tema] = { total: 0, acertos: 0 }
    statsPorTema[q.tema].total++
    if (q.correta) statsPorTema[q.tema].acertos++
  })

  const statsTexto = Object.entries(statsPorTema)
    .map(([nome, s]) => `- ${nome}: ${s.acertos}/${s.total} acertos (${Math.round((s.acertos / s.total) * 100)}%)`)
    .join('\n')

  const prompt = `Analise o desempenho do aluno neste simulado em português do Brasil.
  
  REGRAS CRÍTICAS DE ANÁLISE:
  1. SEJA CRITERIOSO: Não marque um tema como "ponto_fraco" se o aluno errou apenas uma questão isolada.
  2. PRIORIDADE: Foque em temas onde a taxa de acerto foi inferior a 70%.
  3. Baseie-se ESTRITAMENTE nos temas e tags informados abaixo.
  4. Se o aluno acertou tudo de um tema, ele deve ser ignorado nos pontos fracos.

  ESTATÍSTICAS POR TEMA:
  ${statsTexto}

  DADOS DO SIMULADO:
  Matéria: ${simuladoData.materia}
  Nota: ${simuladoData.nota}/${simuladoData.notaMaxima}
  Tempo total: ${Math.round(simuladoData.tempoTotal / 60)} minutos

  DETALHE DAS QUESTÕES:
  ${simuladoData.questoes.map(q =>
    `- [${q.tipo.toUpperCase()}] Tema: ${q.tema} | Status: ${q.correta ? 'ACERTOU' : 'ERROU'} | Tempo: ${q.tempo}s | Tags: ${q.tags?.join(', ') || 'Sem tags'}`
  ).join('\n')}

  Responda APENAS um JSON válido:
  {
    "pontos_fracos": ["lista"],
    "recomendacoes": ["dicas"],
    "analise_tempo": "análise",
    "tendencia": "análise",
    "chutes_detectados": ["questões"],
    "dificuldades_detectadas": ["questões"]
  }`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um analista educacional rigoroso e preciso. Responda apenas JSON.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { pontos_fracos: [], recomendacoes: [resp], analise_tempo: '', tendencia: '' }
}

export async function gerarInsightsDashboard(dados: {
  totalSimulados: number; mediaGeral: number; materias: string[];
  ultimosResultados: { materia: string; nota: number }[]; errosFrequentes: string[]
}) {
  const prompt = `Analise os dados gerais de estudo do aluno em português do Brasil:

Total de simulados: ${dados.totalSimulados}
Média geral: ${dados.mediaGeral.toFixed(1)}%
Matérias estudadas: ${dados.materias.join(', ')}
Últimos resultados: ${dados.ultimosResultados.map(r => `${r.materia}: ${r.nota}%`).join(', ')}
Erros frequentes: ${dados.errosFrequentes.join(', ')}

Responda em JSON preenchendo com dados REAIS baseados na análise (não repita o texto de exemplo):
{
  "pontos_fracos": ["lista com até 5 matérias ou tópicos fracos reais"],
  "tendencia": "texto curto analisando a tendência (ex: melhorando, estagnado)",
  "velocidade_vs_precisao": "breve análise da relação velocidade e precisão",
  "prioridades": ["lista com até 5 tópicos urgentes para revisar"],
  "dica_do_dia": "uma dica prática e acionável baseada nos erros"
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um tutor educacional. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { pontos_fracos: [], tendencia: resp, velocidade_vs_precisao: '', prioridades: [], dica_do_dia: '' }
}

export async function sugerirMelhoriaQuestao(questao: Partial<import('@/types/database').Questao>) {
  const prompt = `Analise esta questão e sugira melhorias em português do Brasil:

Tipo: ${questao.tipo}
Enunciado: ${questao.enunciado}
${questao.tipo === 'objetiva' ? `Alternativas: ${questao.alternativas?.map(a => `${a.letra}) ${a.texto}`).join(' | ')}
Gabarito: ${questao.gabarito}` : `Subitens: ${questao.subitens?.map(s => `${s.letra}) ${s.texto}`).join(' | ')}`}

Sugira melhorias claras e específicas.`

  return await callOpenRouterIA([
    { role: 'system', content: 'Você é um especialista em elaboração de questões. Sempre responda em português do Brasil.' },
    { role: 'user', content: prompt }
  ])
}

export async function analisarPDFs(documentos: { nome: string; texto: string }[], conteudosEsperados: string) {
  const resumos = documentos.map((d, i) => {
    const preview = d.texto.slice(0, 20000)
    return `--- DOCUMENTO ${i + 1}: "${d.nome}" (${d.texto.length} caracteres) ---\n${preview}\n`
  }).join('\n')

  const prompt = `Você é um professor especialista em consolidar materiais de estudo.

Analise os conteúdos REAIS extraídos dos PDFs abaixo e compare com os conteúdos esperados.

CONTEÚDOS ESPERADOS PELO ALUNO:
${conteudosEsperados}

CONTEÚDO DOS DOCUMENTOS:
${resumos}

Faça uma análise COMPLETA e responda OBRIGATORIAMENTE com um OBJETO JSON VÁLIDO.
INICIE A SUA RESPOSTA COM A CHAVE { E TERMINE COM }. NÃO COMECE COM COLCHETES [.

Formato esperado:
{
  "analise_geral": "análise",
  "documento_mais_completo": {"nome": "nome", "justificativa": "motivo"},
  "ranking_documentos": [{"nome": "nome.pdf", "nota": 9, "motivo": "razão", "faltou": "o que faltou"}],
  "conteudos_identificados": ["conteúdo (Encontrado em: arquivo.pdf)"],
  "lacunas": ["conteúdos não encontrados"],
  "redundancias": ["repetições"],
  "conteudo_consolidado": "RESUMO LONGO unificado em markdown",
  "conteudo_complementar": "CONTEÚDO que faltou em markdown",
  "recomendacoes": ["recomendações"],
  "questoes_consolidadas": [{"enunciado": "texto", "alternativas": ["a) texto"], "gabarito": "resposta"}]
}

REGRAS PARA QUESTÕES:
1. Extraia TODAS as questões encontradas nos PDFs, sem limite.
2. Mantenha o formato original.
3. Se encontrar questões sem resposta, gere um gabarito.
4. Una questões similares e remova duplicatas.

REGRAS DE JSON:
1. NUNCA use aspas duplas dentro do texto dos campos.
2. O JSON deve ser um OBJETO começando com '{'.
3. Conclua todo o JSON validamente.`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor universitário especialista. Analise materiais com profundidade. Sempre responda em português do Brasil. Responda apenas um OBJETO JSON VÁLIDO.' },
    { role: 'user', content: prompt }
  ], true, 16000)

  const parsed = extrairJSON(resp)
  if (!parsed || !(parsed as Record<string, unknown>).analise_geral) {
    return {
      analise_geral: parsed ? JSON.stringify(parsed) : resp,
      documento_mais_completo: null, ranking_documentos: [],
      conteudos_identificados: [], lacunas: [], redundancias: [],
      conteudo_consolidado: '', conteudo_complementar: '',
      recomendacoes: [], questoes_consolidadas: []
    }
  }
  return parsed
}

export async function gerarSimuladoAutomatico(
  errosAnteriores: { tema: string; tag: string; count: number }[],
  questoesDisponiveis: { id: string; tema: string; dificuldade: string; tags?: string[] }[]
) {
  const prompt = `Baseado nos erros anteriores do aluno, selecione as melhores questões para treino.

ERROS ANTERIORES:
${errosAnteriores.map(e => `- Tema: ${e.tema} | Tipo de erro: ${e.tag} | Frequência: ${e.count}x`).join('\n')}

QUESTÕES DISPONÍVEIS (IDs):
${questoesDisponiveis.map(q => `- ID: ${q.id} | Tema: ${q.tema} | Dificuldade: ${q.dificuldade} | Tags: ${q.tags?.join(', ')}`).join('\n')}

Selecione até 10 questões priorizando os temas com mais erros.
Responda em JSON: { "questao_ids": ["id1", "id2"], "justificativa": "texto" }`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um organizador de estudos. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { questao_ids: questoesDisponiveis.slice(0, 10).map(q => q.id), justificativa: 'Seleção padrão' }
}

export async function extrairQuestoesDePDF(textoPDF: string) {
  const prompt = `[NO PREAMBLE] [OUTPUT JSON IMMEDIATELY]

Você é um extrator de dados automatizado. Converta o texto de prova abaixo em JSON.
TODAS as respostas devem ser em Português do Brasil.

REGRAS:
1. DIFICULDADE REAL: 'facil', 'medio' ou 'dificil'.
2. Identifique corretamente o tipo (objetiva ou discursiva).
3. EXTRAIA TODAS AS QUESTÕES (SEM LIMITE).

TEXTO DA PROVA:
${textoPDF}

JSON formato:
{
  "questoes": [
    {
      "tipo": "objetiva_ou_discursiva",
      "enunciado": "texto",
      "alternativas": [{"letra": "a", "texto": "texto"}],
      "subitens": [{"letra": "a", "texto": "pergunta", "gabarito": "resposta", "criterios": "critérios"}],
      "gabarito": "resposta",
      "explicacao": "explicação",
      "dificuldade": "facil|medio|dificil",
      "subtema": "assunto",
      "tags": ["tag1"]
    }
  ],
  "total_encontradas": 0,
  "observacoes": ""
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'You are a data extraction API. Output valid JSON only. Start with { and end with }.' },
    { role: 'user', content: prompt }
  ], true, 16000)

  const parsed = extrairJSON(resp)
  return parsed || { questoes: [], total_encontradas: 0, observacoes: 'Erro ao processar.' }
}

export async function gerarGabaritoIA(questao: Partial<import('@/types/database').Questao>) {
  const prompt = questao.tipo === 'objetiva'
    ? `Você é um professor especialista. Analise esta questão e determine o GABARITO CORRETO e uma EXPLICAÇÃO.

ENUNCIADO: ${questao.enunciado}
ALTERNATIVAS:
${(questao.alternativas || []).map(a => `${a.letra}) ${a.texto}`).join('\n')}

Responda em JSON:
{ "gabarito": "letra correta", "explicacao": "explicação detalhada" }`
    : `Você é um professor especialista. Gere o GABARITO e CRITÉRIOS para cada subitem.

ENUNCIADO: ${questao.enunciado}
SUBITENS:
${(questao.subitens || []).map(s => `${s.letra}) ${s.texto}`).join('\n')}

Responda em JSON:
{ "subitens": [{"letra": "a", "gabarito": "resposta", "criterios": "critérios"}], "explicacao": "visão geral" }`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor universitário especialista. Sempre responda em português do Brasil. Responda APENAS JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { gabarito: '', explicacao: resp, subitens: [] }
}

// ============================================================
// FUNÇÕES NOVAS (Expansão IA)
// ============================================================

export async function gerarPlanoSemanal(dados: {
  materias: string[]; pontosFrageis: string[]; revisoesPendentes: number;
  horasDisponiveis: number; proximasProvas: string[]
}) {
  const prompt = `Crie um plano de estudo semanal personalizado para um aluno de Medicina.

MATÉRIAS: ${dados.materias.join(', ')}
PONTOS FRACOS: ${dados.pontosFrageis.join(', ')}
REVISÕES PENDENTES: ${dados.revisoesPendentes}
HORAS DISPONÍVEIS/SEMANA: ${dados.horasDisponiveis}
PRÓXIMAS PROVAS: ${dados.proximasProvas.join(', ')}

Responda em JSON:
{
  "dias": [
    { "dia": "Segunda", "blocos": [{"horario": "08:00-10:00", "materia": "nome", "atividade": "descrição", "prioridade": "alta|media|baixa"}] }
  ],
  "meta_semanal": "resumo",
  "dicas": ["dica1"]
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um mentor acadêmico de Medicina. Sempre responda em português do Brasil. Responda apenas JSON.' },
    { role: 'user', content: prompt }
  ], true)

  return extrairJSON(resp) || { dias: [], meta_semanal: '', dicas: [] }
}

export async function gerarFlashcardsIA(conteudo: string, materia: string, quantidade = 10) {
  const prompt = `Gere ${quantidade} flashcards de estudo sobre o conteúdo abaixo para a matéria ${materia}.

CONTEÚDO:
${conteudo.slice(0, 5000)}

Responda em JSON:
{
  "flashcards": [
    { "frente": "pergunta", "verso": "resposta detalhada", "tags": ["tag"] }
  ]
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor de Medicina. Crie flashcards claros e didáticos. Responda em português do Brasil. Apenas JSON.' },
    { role: 'user', content: prompt }
  ], true)

  return extrairJSON(resp) || { flashcards: [] }
}

export async function sugerirRevisoes(dados: {
  errosRecentes: { tema: string; materia: string; data: string }[];
  ultimasRevisoes: { tema: string; data: string }[]
}) {
  const prompt = `Baseado nos erros recentes e histórico de revisões, sugira revisões prioritárias.

ERROS RECENTES:
${dados.errosRecentes.map(e => `- ${e.materia} > ${e.tema} (${e.data})`).join('\n')}

ÚLTIMAS REVISÕES:
${dados.ultimasRevisoes.map(r => `- ${r.tema} (${r.data})`).join('\n')}

Responda em JSON:
{
  "revisoes_sugeridas": [
    { "tema": "nome", "materia": "nome", "urgencia": "alta|media|baixa", "motivo": "explicação", "dias_ate_revisao": 0 }
  ]
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um especialista em repetição espaçada. Responda em português do Brasil. Apenas JSON.' },
    { role: 'user', content: prompt }
  ], true)

  return extrairJSON(resp) || { revisoes_sugeridas: [] }
}

export async function gerarResumoIA(conteudo: string, materia: string) {
  const prompt = `Gere um resumo detalhado e didático do conteúdo abaixo para estudo de ${materia} em Medicina.
Use markdown com títulos, listas e destaques.

CONTEÚDO:
${conteudo.slice(0, 10000)}

Responda em JSON:
{
  "resumo": "texto em markdown",
  "topicos_chave": ["tópico1"],
  "conceitos_importantes": ["conceito1"],
  "conexoes_clinicas": ["conexão1"]
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é professor de Medicina. Gere resumos excelentes. Português do Brasil. Apenas JSON.' },
    { role: 'user', content: prompt }
  ], true)

  return extrairJSON(resp) || { resumo: '', topicos_chave: [], conceitos_importantes: [], conexoes_clinicas: [] }
}

export { callIA, callOpenRouterIA, extrairJSON }
