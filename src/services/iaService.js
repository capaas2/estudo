// As chaves da API agora ficam no backend (pasta /api) para segurança.
const GEMINI_URL = `/api/gemini`
const OPENROUTER_URL = '/api/openrouter'
function extrairJSON(text) {
  // Limpeza de erros comuns de LLMs
  let cleaned = text.trim();
  // Se o LLM retornou um array com chaves (ex: ["chave": "valor"]), tenta trocar para objeto
  if (cleaned.startsWith('[') && cleaned.endsWith(']') && cleaned.includes('":')) {
    cleaned = '{' + cleaned.slice(1, -1) + '}';
  }

  // Tenta parse direto
  try { return JSON.parse(cleaned) } catch {}
  
  // Tenta encontrar JSON dentro do texto (entre { e })
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  
  // Tenta entre ```json e ```
  const codeMatch = cleaned.match(/```json?\s*([\s\S]*?)```/)
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1]) } catch {}
  }
  
  return null
}

async function callIA(messages, jsonMode = false, maxTokens = 32768) {
  try {
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body = {
      contents: userMessages,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens,
      }
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage }]
      };
    }

    if (jsonMode) {
      body.generationConfig.responseMimeType = "application/json";
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Erro IA response:', res.status, errBody);
      throw new Error(`Erro IA: ${res.status}`);
    }

    const data = await res.json();
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      console.warn('⚠️ Resposta da IA foi TRUNCADA (MAX_TOKENS atingido). Aumente maxTokens.');
    }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!content) {
      console.error('Resposta IA vazia:', data);
      throw new Error('Resposta da IA vazia');
    }
    return content;
  } catch (err) {
    console.error('Erro ao chamar IA:', err);
    throw err;
  }
}

async function callOpenRouterIA(messages, jsonMode = false, maxTokens = 8000) {
  // Lista de modelos com grande janela de contexto e alta capacidade para uso gratuito (fallback em caso de 429/rate-limit)
  const fallbackModels = [
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "microsoft/phi-3-medium-128k-instruct:free",
    "openrouter/free"
  ];

  let lastError;

  for (const modelId of fallbackModels) {
    try {
      console.log(`[OpenRouter] Tentando análise com o modelo: ${modelId}`);
      const body = {
        model: modelId,
        messages: messages,
        temperature: 0.3,
        // Passando o limite solicitado de 256k tokens:
        max_tokens: maxTokens 
      };

      if (jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.warn(`[OpenRouter] Falha no modelo ${modelId} (Status ${res.status}): ${errBody}. Tentando próximo modelo...`);
        lastError = new Error(`Erro OpenRouter no modelo ${modelId}: ${res.status}`);
        continue; // Passa para o próximo modelo da lista
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      if (!content) {
        console.warn(`[OpenRouter] Resposta vazia no modelo ${modelId}. Tentando próximo...`);
        lastError = new Error(`Resposta vazia no modelo ${modelId}`);
        continue;
      }
      
      console.log(`[OpenRouter] Análise concluída com sucesso usando o modelo: ${modelId}`);
      return content;
      
    } catch (err) {
      console.warn(`[OpenRouter] Erro de rede/timeout no modelo ${modelId}:`, err.message);
      lastError = err;
      // Continua para o próximo modelo em caso de falha de requisição
    }
  }

  // Se esgotou todos os modelos
  console.error('Erro fatal ao chamar OpenRouter: Todos os modelos de fallback falharam.');
  throw lastError;
}

export async function corrigirDiscursiva(enunciado, subitens, respostasUsuario) {
  const prompt = `Você é um professor especialista. Corrija as respostas discursivas abaixo em português do Brasil.

ENUNCIADO: ${enunciado}

${subitens.map((s, i) => `SUBITEM ${s.letra}) ${s.texto}
GABARITO ESPERADO: ${s.gabarito}
CRITÉRIOS: ${s.criterios}
RESPOSTA DO ALUNO: ${respostasUsuario[i] || '(em branco)'}`).join('\n\n')}

Responda APENAS em JSON válido com este formato:
{
  "subitens": [
    {
      "letra": "a",
      "nota": 0-10,
      "feedback": "texto do feedback",
      "correcao_conceitual": true/false,
      "clareza": true/false,
      "completude": true/false
    }
  ],
  "nota_total": 0-10,
  "feedback_geral": "texto"
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor corretor rigoroso. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { subitens: [], nota_total: 0, feedback_geral: resp }
}

export async function analisarDesempenho(simuladoData) {
  const prompt = `Analise o desempenho do aluno neste simulado em português do Brasil.
  
  REGRAS CRÍTICAS:
  1. Baseie seus "pontos_fracos" e "recomendacoes" ESTRITAMENTE nos temas e tags informados abaixo.
  2. JAMAIS sugira conteúdos ou matérias que não aparecem na lista de questões (ex: não sugira matemática se a matéria for biologia).
  3. Se o aluno acertou tudo de um tema, não o coloque em "pontos_fracos".
  4. Seja específico e prático nas recomendações.

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
    "pontos_fracos": ["lista de conteúdos onde o aluno errou ou demorou muito"],
    "recomendacoes": ["dicas práticas de estudo para os pontos fracos identificados"],
    "analise_tempo": "análise da relação tempo vs desempenho por tema",
    "tendencia": "análise de evolução",
    "chutes_detectados": ["questões acertadas em tempo muito curto (ex: <15s)"],
    "dificuldades_detectadas": ["questões com tempo excessivo (ex: >180s) mesmo se acertou"]
  }`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um analista educacional rigoroso e preciso. Sua análise deve ser baseada exclusivamente nos dados fornecidos, sem inventar conteúdos externos. Responda apenas JSON.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { pontos_fracos: [], recomendacoes: [resp], analise_tempo: '', tendencia: '' }
}

export async function gerarInsightsDashboard(dados) {
  const prompt = `Analise os dados gerais de estudo do aluno em português do Brasil:

Total de simulados: ${dados.totalSimulados}
Média geral: ${dados.mediaGeral.toFixed(1)}%
Matérias estudadas: ${dados.materias.join(', ')}
Últimos resultados: ${dados.ultimosResultados.map(r => `${r.materia}: ${r.nota}%`).join(', ')}
Erros frequentes: ${dados.errosFrequentes.join(', ')}

Responda em JSON:
{
  "pontos_fracos": ["até 5 pontos fracos principais"],
  "tendencia": "texto descrevendo a tendência de evolução",
  "velocidade_vs_precisao": "análise da relação velocidade e precisão",
  "prioridades": ["até 5 conteúdos prioritários para estudar"],
  "dica_do_dia": "uma dica motivacional e prática"
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um tutor educacional. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { pontos_fracos: [], tendencia: resp, velocidade_vs_precisao: '', prioridades: [], dica_do_dia: '' }
}

export async function sugerirMelhoriaQuestao(questao) {
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

export async function analisarPDFs(documentos, conteudosEsperados) {
  // documentos = [{nome, texto}]
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
INICIE A SUA RESPOSTA COM A CHAVE { E TERMINE COM }. NÃO COMECE COM COCHETES [.

MUITO IMPORTANTE: Na lista "conteudos_identificados", para cada conteúdo você DEVE escrever entre parênteses o nome exato do documento onde ele foi encontrado.

Formato esperado:
{
  "analise_geral": "análise detalhada da qualidade geral dos materiais",
  "documento_mais_completo": {
    "nome": "nome do arquivo mais completo",
    "justificativa": "por que este é o mais completo"
  },
  "ranking_documentos": [
    {"nome": "nome.pdf", "nota": 9, "motivo": "cobertura ampla de...", "faltou": "resumo do que faltou especificamente neste documento em relação aos conteúdos esperados"}
  ],
  "conteudos_identificados": ["Nome do conteúdo (Encontrado em: nome_do_arquivo.pdf)"],
  "lacunas": ["conteúdos esperados que NÃO foram encontrados em nenhum PDF"],
  "redundancias": ["conteúdos repetidos entre documentos"],
  "conteudo_consolidado": "TEXTO LONGO: consolide aqui um resumo unificado com as melhores partes de TODOS os documentos, organizado por tópicos. Este será o material de estudo final do aluno. Use markdown com títulos, subtítulos e listas.",
  "conteudo_complementar": "TEXTO LONGO: gere aqui o conteúdo que faltou nos PDFs mas que o aluno precisa estudar, baseado nas lacunas identificadas. Use markdown.",
  "recomendacoes": ["lista de recomendações de estudo"],
  "questoes_consolidadas": [
    {
      "enunciado": "texto da questão encontrada nos materiais",
      "alternativas": ["opcional: a) texto", "b) texto"],
      "gabarito": "resposta esperada ou comentário"
    }
  ]
}

REGRAS PARA QUESTÕES:
1. Extraia TODAS as questões encontradas nos PDFs, sem limite de quantidade.
2. Mantenha o formato original (objetiva ou discursiva).
3. Se encontrar questões sem resposta, gere um gabarito ou comentário educativo.
4. Una questões similares e remova duplicatas exatas entre documentos.

REGRAS CRÍTICAS DE FORMATAÇÃO JSON:
1. NUNCA use aspas duplas (") dentro do texto dos campos. Se precisar destacar algo, use aspas simples (') ou markdown (como **negrito**).
2. O JSON deve ser um OBJETO começando com '{' e não um array.
3. O texto não deve ser interrompido abruptamente. Certifique-se de concluir todo o JSON validamente.`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor universitário especialista. Analise materiais com profundidade e extraia TODAS as questões encontradas. O campo conteudo_consolidado deve ser EXTENSO e detalhado. Sempre responda em português do Brasil. Responda apenas um OBJETO JSON VÁLIDO começando com { e evite aspas duplas nos textos.' },
    { role: 'user', content: prompt }
  ], true, 16000)

  const parsed = extrairJSON(resp)
  if (!parsed || !parsed.analise_geral) {
    // Fallback if the AI returns a valid JSON but missing the expected schema
    return { 
      analise_geral: parsed ? JSON.stringify(parsed) : resp, 
      documento_mais_completo: null, 
      ranking_documentos: [], 
      conteudos_identificados: [], 
      lacunas: [], 
      redundancias: [], 
      conteudo_consolidado: '', 
      conteudo_complementar: '', 
      recomendacoes: [], 
      questoes_consolidadas: [] 
    }
  }
  return parsed
}

export async function gerarSimuladoAutomatico(errosAnteriores, questoesDisponiveis) {
  const prompt = `Baseado nos erros anteriores do aluno, selecione as melhores questões para treino.

ERROS ANTERIORES:
${errosAnteriores.map(e => `- Tema: ${e.tema} | Tipo de erro: ${e.tag} | Frequência: ${e.count}x`).join('\n')}

QUESTÕES DISPONÍVEIS (IDs):
${questoesDisponiveis.map(q => `- ID: ${q.id} | Tema: ${q.tema} | Dificuldade: ${q.dificuldade} | Tags: ${q.tags?.join(', ')}`).join('\n')}

Selecione até 10 questões priorizando os temas com mais erros.
Responda em JSON: { "questao_ids": ["id1", "id2", ...], "justificativa": "texto" }`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um organizador de estudos. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { questao_ids: questoesDisponiveis.slice(0, 10).map(q => q.id), justificativa: 'Seleção padrão' }
}

export async function extrairQuestoesDePDF(textoPDF) {
  const prompt = `[NO PREAMBLE] [OUTPUT JSON IMMEDIATELY]

Você é um extrator de dados automatizado. Sua única função é receber o texto de prova abaixo e convertê-lo DIRETAMENTE no formato JSON exigido.
É ESTRITAMENTE PROIBIDO fazer rascunhos, "pensar em voz alta" ou escrever qualquer texto fora do JSON.
TODAS as suas respostas devem ser em Português do Brasil.
EXTRAIA TODAS AS QUESTÕES ENCONTRADAS NO TEXTO (NÃO HÁ LIMITE DE QUANTIDADE):

TEXTO DA PROVA:
${textoPDF}

O JSON deve seguir este formato exato:
{
  "questoes": [
    {
      "tipo": "objetiva_ou_discursiva",
      "enunciado": "Apenas o texto introdutório da questão (não inclua os itens a, b, c aqui)",
      "alternativas": [
        {"letra": "a", "texto": "texto da alternativa (se for objetiva)"}
      ],
      "subitens": [
        {
          "letra": "a",
          "texto": "texto da pergunta do item a) (se for discursiva)",
          "gabarito": "resposta resolvida detalhada do item a",
          "criterios": "o que é esperado na resposta"
        }
      ],
      "gabarito": "Sua resposta geral ou alternativa correta...",
      "explicacao": "Explicação detalhada da questão...",
      "dificuldade": "medio",
      "tags": ["assunto"]
    }
  ],
  "total_encontradas": "número total de questões extraídas",
  "observacoes": ""
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'You are a data extraction API that strictly outputs valid JSON. You DO NOT output any text before or after the JSON. You DO NOT think aloud or explain your reasoning. Start your response with { and end with }.' },
    { role: 'user', content: prompt }
  ], true, 16000)

  console.log('--- RESPOSTA RAW DA IA (QUESTÕES) ---')
  console.log(resp)

  const parsed = extrairJSON(resp)
  console.log('--- JSON PARSEADO ---', parsed)

  return parsed || { questoes: [], total_encontradas: 0, observacoes: 'Erro ao processar ou nenhuma questão encontrada no limite de caracteres.' }
}

export async function gerarGabaritoIA(questao) {
  const prompt = questao.tipo === 'objetiva'
    ? `Você é um professor especialista. Analise esta questão e determine o GABARITO CORRETO e uma EXPLICAÇÃO detalhada.

ENUNCIADO: ${questao.enunciado}

ALTERNATIVAS:
${(questao.alternativas || []).map(a => `${a.letra}) ${a.texto}`).join('\n')}

Com base no seu conhecimento, determine qual alternativa está correta e explique o porquê.

Responda em JSON:
{
  "gabarito": "letra da alternativa correta (A, B, C, D ou E)",
  "explicacao": "explicação detalhada e didática do porquê esta é a resposta correta, citando conceitos relevantes"
}`
    : `Você é um professor especialista. Analise esta questão discursiva e gere o GABARITO ESPERADO e CRITÉRIOS DE CORREÇÃO para cada subitem.

ENUNCIADO: ${questao.enunciado}

SUBITENS:
${(questao.subitens || []).map(s => `${s.letra}) ${s.texto}`).join('\n')}

Para cada subitem, gere a resposta esperada ideal e os critérios de avaliação.

Responda em JSON:
{
  "subitens": [
    {
      "letra": "a",
      "gabarito": "resposta esperada detalhada",
      "criterios": "critérios de correção claros"
    }
  ],
  "explicacao": "visão geral da questão e pontos-chave"
}`

  const resp = await callOpenRouterIA([
    { role: 'system', content: 'Você é um professor universitário especialista. Determine gabaritos com precisão científica. Sempre responda em português do Brasil. Responda APENAS JSON válido.' },
    { role: 'user', content: prompt }
  ], true)

  const parsed = extrairJSON(resp)
  return parsed || { gabarito: '', explicacao: resp, subitens: [] }
}
