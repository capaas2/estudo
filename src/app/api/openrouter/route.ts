import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'Chave da API ausente no servidor.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://studypro.app',
        'X-Title': 'StudyPro'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Erro proxy OpenRouter:', error)
    return NextResponse.json({ error: 'Erro interno ao contatar OpenRouter' }, { status: 500 })
  }
}
