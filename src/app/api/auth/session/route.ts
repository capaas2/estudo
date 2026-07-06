import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { session } = await request.json()

    if (!session) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    // Seta o cookie de sessão do Appwrite
    response.cookies.set('studypro-session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 ano
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('studypro-session')
  return response
}
