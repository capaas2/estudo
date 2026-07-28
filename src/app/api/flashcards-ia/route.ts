/**
 * API Route — Gerar Flashcards via IA
 * Recebe texto (de uma nota) e gera flashcards automaticamente com fallback resiliente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateContentWithFallback } from '@/lib/ai/geminiClient'

export async function POST(request: NextRequest) {
  try {
    const { text, materiaNome, count = 5 } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Envie o campo "text"' }, { status: 400 })
    }

    const prompt = `Analise o seguinte texto${materiaNome ? ` sobre ${materiaNome}` : ''} e gere exatamente ${count} flashcards para estudo de Medicina.

Cada flashcard deve ter:
- "frente": Uma pergunta clara e objetiva
- "verso": A resposta completa e didática

Responda APENAS em JSON estrito, sem markdown, no formato:
[{"frente":"...","verso":"..."}]

TEXTO:
${text}`

    const rawText = await generateContentWithFallback({
      prompt,
      temperature: 0.4,
      maxTokens: 2048,
    })

    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Formato inválido da IA', raw: rawText }, { status: 422 })
    }

    const flashcards = JSON.parse(jsonMatch[0])
    return NextResponse.json({ flashcards })
  } catch (error: any) {
    console.error('Erro ao gerar flashcards:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar flashcards.' },
      { status: 500 }
    )
  }
}
