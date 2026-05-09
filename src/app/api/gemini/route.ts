import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Chave da API ausente no servidor.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Erro proxy Gemini:', error)
    return NextResponse.json({ error: 'Erro interno ao contatar Gemini' }, { status: 500 })
  }
}
