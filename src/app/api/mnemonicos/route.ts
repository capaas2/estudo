/**
 * API Route — Gerar Mnemônicos via IA
 * Recebe tema/conceito e gera mnemônicos visuais e verbais com fallback resiliente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateContentWithFallback } from '@/lib/ai/geminiClient'

export async function POST(request: NextRequest) {
  try {
    const { topic, materiaNome } = await request.json()

    if (!topic) {
      return NextResponse.json({ error: 'Envie o campo "topic"' }, { status: 400 })
    }

    const prompt = `Você é um especialista em técnicas de memorização para estudantes de Medicina.

Gere mnemônicos para o seguinte tema${materiaNome ? ` de ${materiaNome}` : ''}:
"${topic}"

Gere EXATAMENTE 3 tipos de mnemônicos:
1. ACRÔNIMO: Uma palavra ou frase onde cada letra representa um item
2. HISTÓRIA: Uma história curta e memorável que conecta os conceitos
3. ASSOCIAÇÃO VISUAL: Descrição de uma imagem mental vívida para memorizar

Responda em JSON estrito, sem markdown:
{"acronimo":{"titulo":"...","explicacao":"..."},"historia":{"titulo":"...","texto":"..."},"visual":{"titulo":"...","descricao":"..."}}`

    const rawText = await generateContentWithFallback({
      prompt,
      temperature: 0.8,
      maxTokens: 1024,
    })

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Formato inválido', raw: rawText }, { status: 422 })
    }

    const mnemonics = JSON.parse(jsonMatch[0])
    return NextResponse.json({ mnemonics })
  } catch (error: any) {
    console.error('Erro ao gerar mnemônicos:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar mnemônicos.' },
      { status: 500 }
    )
  }
}
