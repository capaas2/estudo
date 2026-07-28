/**
 * Client de IA Inteligente com Roteamento por Nível de Conta:
 * - Admin (gustavocapaz06@gmail.com): Qwen 3.7 Flash ($0,03/M) + MiMo-V2.5 ($0,112/M)
 * - Alunos Padrão: Rota 100% Gratuita (openrouter/free)
 */

const ADMIN_EMAIL = 'gustavocapaz06@gmail.com'

const ADMIN_MODELS = [
  'qwen/qwen3.7-flash',   // Modelo Pro Exclusivo do Admin ($0.03 / $0.13)
  'xiaomi/mimo-v2.5',     // Modelo Secundário Multimodal do Admin
  'openrouter/free',      // Contingência Gratuita
]

const STUDENT_MODELS = [
  'openrouter/free',             // Roteador Gratuito para Alunos
  'google/gemma-4-31b-it:free',  // Modelo Gratuito Secundário
  'openai/gpt-oss-20b:free',
]

export async function generateContentWithFallback(options: {
  systemPrompt?: string
  prompt: string
  temperature?: number
  maxTokens?: number
  userEmail?: string
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY não configurada no arquivo .env.local')
  }

  // Verifica se a requisição veio da conta do Administrador
  const isAdmin = options.userEmail
    ? options.userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    : true // Por padrão no ambiente de desenvolvimento assume a conta do Admin

  const modelList = isAdmin ? ADMIN_MODELS : STUDENT_MODELS

  let lastErrorText = ''

  for (const model of modelList) {
    try {
      const messages = []
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt })
      }
      messages.push({ role: 'user', content: options.prompt })

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://studypro.app',
          'X-Title': 'StudyPro v4',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }),
      })

      if (response.status === 429) {
        console.warn(`[OpenRouter IA] Modelo ${model} atingiu limite (429). Tentando próximo modelo...`)
        await new Promise(res => setTimeout(res, 600))
        continue
      }

      if (!response.ok) {
        const errBody = await response.text()
        console.warn(`[OpenRouter IA] Erro no modelo ${model} (${response.status}): ${errBody}`)
        lastErrorText = `Erro ${response.status}: ${errBody}`
        continue
      }

      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content
      if (text && text.trim().length > 0) {
        return text.trim()
      }
    } catch (err: any) {
      console.warn(`[OpenRouter IA] Exceção ao invocar modelo ${model}:`, err)
      lastErrorText = err?.message || 'Erro de conexão'
    }
  }

  throw new Error(`OpenRouter erro em todos os modelos: ${lastErrorText || 'Tente novamente em instantes.'}`)
}
