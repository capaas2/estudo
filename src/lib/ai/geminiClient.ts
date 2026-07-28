/**
 * Client de IA Principal — OpenRouter (Modelos Gratuitos)
 * Alterna automaticamente entre os melhores modelos 100% gratuitos do OpenRouter em caso de instabilidade ou limite.
 */

const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
]

export async function generateContentWithFallback(options: {
  systemPrompt?: string
  prompt: string
  temperature?: number
  maxTokens?: number
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY não configurada no arquivo .env.local')
  }

  let lastErrorText = ''

  for (const model of OPENROUTER_FREE_MODELS) {
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
        console.warn(`[OpenRouter IA] Modelo ${model} atingiu taxa limite (429). Tentando próximo modelo gratuito...`)
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

  throw new Error(`OpenRouter erro em todos os modelos gratuitos: ${lastErrorText || 'Tente novamente em instantes.'}`)
}
