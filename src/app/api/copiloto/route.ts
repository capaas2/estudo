/**
 * API Route — Copiloto IA (RAG)
 * Recebe pergunta + contexto de notas relevantes, responde via Qwen3.7 Flash para Admin e openrouter/free para alunos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateContentWithFallback } from '@/lib/ai/geminiClient'

export async function POST(request: NextRequest) {
  try {
    const { question, context, materiaNome, userEmail } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'Envie a pergunta' }, { status: 400 })
    }

    const systemPrompt = `Você é um tutor especialista${materiaNome ? ` em ${materiaNome}` : ''} para estudantes de Medicina.

REGRAS:
- Responda de forma clara, didática e objetiva
- Use exemplos clínicos quando relevante
- Se o contexto das notas do aluno for fornecido, use-o como base para a resposta
- Cite as notas relevantes quando usar informações delas
- Responda SEMPRE em português do Brasil`

    const contextPrompt = context && context.length > 0
      ? `\n\nCONTEXTO DAS NOTAS DO ALUNO:\n${context.map((c: { titulo: string; conteudo: string }, i: number) => `--- Nota ${i + 1}: "${c.titulo}" ---\n${c.conteudo}`).join('\n\n')}\n\n`
      : ''

    const prompt = `${contextPrompt}Pergunta: ${question}`

    const text = await generateContentWithFallback({
      systemPrompt,
      prompt,
      userEmail,
      temperature: 0.7,
      maxTokens: 2048,
    })

    return NextResponse.json({ answer: text })
  } catch (error: any) {
    console.error('Erro no copiloto:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao comunicar com a IA. Tente novamente em alguns segundos.' },
      { status: 500 }
    )
  }
}
