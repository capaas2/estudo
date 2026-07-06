import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'StudyPro v4 — Plataforma Acadêmica de Medicina',
  description: 'Sistema operacional acadêmico completo para estudantes de Medicina. Workspace unificado, simulados, IA integrada, revisões espaçadas FSRS e muito mais.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#0a0e1a] text-slate-100 min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
