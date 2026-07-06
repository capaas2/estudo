/**
 * API Route — Gerar Mnemônicos via IA
 * Recebe tema/conceito e gera mnemônicos visuais e verbais.
 */
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
  }

  try {
    const { topic, materiaNome } = await request.json()

    if (!topic) {
      return NextResponse.json({ error: 'Envie o campo "topic"' }, { status: 400 })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{
              text: `Você é um especialista em técnicas de memorização para estudantes de Medicina.

Gere mnemônicos para o seguinte tema${materiaNome ? ` de ${materiaNome}` : ''}:
"${topic}"

Gere EXATAMENTE 3 tipos de mnemônicos:
1. ACRÔNIMO: Uma palavra ou frase onde cada letra representa um item
2. HISTÓRIA: Uma história curta e memorável que conecta os conceitos
3. ASSOCIAÇÃO VISUAL: Descrição de uma imagem mental vívida para memorizar

Responda em JSON, sem markdown:
{"acronimo":{"titulo":"...","explicacao":"..."},"historia":{"titulo":"...","texto":"..."},"visual":{"titulo":"...","descricao":"..."}}`,
            }],
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Formato inválido', raw: rawText }, { status: 422 })
    }

    const mnemonics = JSON.parse(jsonMatch[0])
    return NextResponse.json({ mnemonics })
  } catch (error) {
    console.error('Erro ao gerar mnemônicos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
