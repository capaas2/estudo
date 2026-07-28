/**
 * Client de IA Resiliente com Fallback em Cadeia para Gemini / OpenRouter.
 * Trata automaticamente erros de Rate Limit (HTTP 429) e falhas de modelo.
 */

const FALLBACK_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
]

export async function generateContentWithFallback(options: {
  systemPrompt?: string
  prompt: string
  temperature?: number
  maxTokens?: number
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no .env.local')
  }

  let lastError: Error | null = null

  // Tentar os modelos em sequência caso algum retorne 429 ou erro
  for (const model of FALLBACK_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const body: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: options.prompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      }

      if (options.systemPrompt) {
        body.systemInstruction = { parts: [{ text: options.systemPrompt }] }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.status === 429) {
        console.warn(`[IA Fallback] Modelo ${model} retornou HTTP 429 (Rate Limit). Tentando modelo secundário...`)
        // Aguarda 800ms antes de tentar o próximo modelo para liberar cota
        await new Promise(res => setTimeout(res, 800))
        continue
      }

      if (!response.ok) {
        const errText = await response.text()
        console.warn(`[IA Fallback] Erro no modelo ${model} (${response.status}): ${errText}`)
        continue
      }

      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text && text.trim().length > 0) {
        return text
      }
    } catch (err: any) {
      console.warn(`[IA Fallback] Exceção ao chamar modelo ${model}:`, err)
      lastError = err
    }
  }

  // Tentar fallback via OpenRouter se configurado
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (openRouterKey) {
    try {
      console.info('[IA Fallback] Tentando rota OpenRouter como último recurso...')
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: options.prompt },
          ],
        }),
      })

      if (orRes.ok) {
        const orData = await orRes.json()
        const text = orData?.choices?.[0]?.message?.content
        if (text) return text
      }
    } catch (errOr) {
      console.warn('[IA Fallback] Erro ao chamar OpenRouter fallback:', errOr)
    }
  }

  throw lastError || new Error('Todas as tentativas de IA retornaram erro 429 (Limite de requisições por minuto atingido). Aguarde alguns segundos.')
}
