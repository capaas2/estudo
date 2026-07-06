/**
 * API Route — Gerar Flashcards via IA
 * Recebe texto (de uma nota) e gera flashcards automaticamente.
 */
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
  }

  try {
    const { text, materiaNome, count = 5 } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Envie o campo "text"' }, { status: 400 })
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
              text: `Analise o seguinte texto${materiaNome ? ` sobre ${materiaNome}` : ''} e gere exatamente ${count} flashcards para estudo.

Cada flashcard deve ter:
- "frente": Uma pergunta clara e objetiva
- "verso": A resposta completa e didática

Responda APENAS em JSON, sem markdown, no formato:
[{"frente":"...","verso":"..."}]

TEXTO:
${text}`,
            }],
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
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

    // Parse JSON from response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Formato inválido da IA', raw: rawText }, { status: 422 })
    }

    const flashcards = JSON.parse(jsonMatch[0])
    return NextResponse.json({ flashcards })
  } catch (error) {
    console.error('Erro ao gerar flashcards:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
