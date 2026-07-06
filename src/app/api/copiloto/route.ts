/**
 * API Route — Copiloto IA (RAG)
 * Recebe pergunta + contexto de notas relevantes, responde via Gemini.
 */
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
  }

  try {
    const { question, context, materiaNome } = await request.json()

    const systemPrompt = `Você é um tutor especialista${materiaNome ? ` em ${materiaNome}` : ''} para estudantes de Medicina.

REGRAS:
- Responda de forma clara, didática e objetiva
- Use exemplos clínicos quando relevante
- Se o contexto das notas do aluno for fornecido, use-o como base para a resposta
- Cite as notas relevantes quando usar informações delas
- Se não souber a resposta, diga que não sabe
- Responda SEMPRE em português do Brasil`

    const contextPrompt = context && context.length > 0
      ? `\n\nCONTEXTO DAS NOTAS DO ALUNO:\n${context.map((c: { titulo: string; conteudo: string }, i: number) => `--- Nota ${i + 1}: "${c.titulo}" ---\n${c.conteudo}`).join('\n\n')}\n\n`
      : ''

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: `${contextPrompt}Pergunta: ${question}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'

    return NextResponse.json({ answer: text })
  } catch (error) {
    console.error('Erro no copiloto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
