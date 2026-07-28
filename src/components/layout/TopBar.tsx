'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronRight, Bell, Sparkles } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'

const ROUTE_MAP: Record<string, string> = {
  '': 'Dashboard',
  'periodos': 'Meus Estudos',
  'revisoes': 'Revisões',
  'questoes': 'Questões & Simulados',
  'copiloto': 'Copiloto IA',
  'configuracoes': 'Configurações',
  'simulados': 'Simulados',
  'onboarding': 'Primeiros Passos',
}

export default function TopBar() {
  const pathname = usePathname()
  const { data: user } = useCurrentUser()

  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="h-14 px-8 border-b border-white/[0.06] bg-[#08090d]/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 overflow-hidden">
        <Link href="/" className="hover:text-slate-200 transition-colors flex items-center gap-1.5 shrink-0 font-medium">
          <Sparkles size={14} className="text-indigo-400" />
          <span>StudyPro</span>
        </Link>

        {segments.length === 0 ? (
          <>
            <ChevronRight size={14} className="text-slate-600 shrink-0" />
            <span className="text-slate-200 font-semibold truncate">Dashboard</span>
          </>
        ) : (
          segments.map((seg, idx) => {
            const isLast = idx === segments.length - 1
            const label = ROUTE_MAP[seg] || (seg.length > 20 ? `${seg.slice(0, 8)}...` : seg)
            const href = '/' + segments.slice(0, idx + 1).join('/')

            return (
              <div key={href} className="flex items-center gap-2 shrink-0">
                <ChevronRight size={14} className="text-slate-600" />
                {isLast ? (
                  <span className="text-slate-200 font-semibold capitalize">{label}</span>
                ) : (
                  <Link href={href} className="hover:text-slate-200 transition-colors capitalize">
                    {label}
                  </Link>
                )}
              </div>
            )
          })
        )}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <button
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-slate-200 transition-all text-xs font-medium cursor-pointer"
        >
          <Search size={14} className="text-slate-400" />
          <span>Buscar conteúdo...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[0.65rem] text-slate-400 font-mono">⌘K</kbd>
        </button>

        {/* Notifications */}
        <button
          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all relative cursor-pointer"
          title="Notificações"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        </button>
      </div>
    </header>
  )
}
