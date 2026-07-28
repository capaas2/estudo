import { NextRequest, NextResponse } from 'next/server'
import { generateContentWithFallback } from '@/lib/ai/geminiClient'

export async function POST(request: NextRequest) {
  try {
    const { prompt, systemPrompt } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Envie o campo "prompt"' }, { status: 400 })
    }

    const text = await generateContentWithFallback({
      systemPrompt,
      prompt,
    })

    return NextResponse.json({ text, candidates: [{ content: { parts: [{ text }] } }] })
  } catch (error: any) {
    console.error('OpenRouter IA route error:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao processar IA' }, { status: 500 })
  }
}
