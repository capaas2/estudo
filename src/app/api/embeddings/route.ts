/**
 * API Route — Gemini Embeddings
 * Gera embeddings de texto para busca semântica (RAG).
 */
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const EMBED_MODEL = 'text-embedding-004'

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
  }

  try {
    const { texts } = await request.json()

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: 'Envie um array "texts"' }, { status: 400 })
    }

    // Gemini embedding API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: texts.map((text: string) => ({
            model: `models/${EMBED_MODEL}`,
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
          })),
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: response.status })
    }

    const data = await response.json()
    const embeddings = data.embeddings?.map((e: { values: number[] }) => e.values) || []

    return NextResponse.json({ embeddings })
  } catch (error) {
    console.error('Erro ao gerar embeddings:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
