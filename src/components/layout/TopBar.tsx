'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronRight, Bell, Sparkles, RotateCcw, Flame, CheckCircle2, X } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listReviews } from '@/services/database/reviews'

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
  const [showNotifications, setShowNotifications] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const segments = pathname.split('/').filter(Boolean)

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', user?.$id],
    queryFn: () => listReviews(user!.$id),
    enabled: !!user,
  })

  const revisoesPendentes = reviews.filter(r => r.status === 'pendente').length

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        {/* Quick Search */}
        <button
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-slate-200 transition-all text-xs font-medium cursor-pointer"
        >
          <Search size={14} className="text-slate-400" />
          <span>Buscar conteúdo...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[0.65rem] text-slate-400 font-mono">⌘K</kbd>
        </button>

        {/* Notifications Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all relative cursor-pointer"
          title="Notificações do App"
        >
          <Bell size={16} />
          {revisoesPendentes > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-[#08090d] animate-pulse" />
          )}
        </button>

        {/* Notifications Dropdown Overlay */}
        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 surface-elevated border border-white/[0.12] rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell size={14} className="text-indigo-400" />
                Notificações & Lembretes
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              {/* Notificação de Revisões */}
              <Link
                href="/revisoes"
                onClick={() => setShowNotifications(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all block"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <RotateCcw size={14} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Revisões FSRS Pendentes</p>
                  <p className="text-[0.7rem] text-slate-400 mt-0.5">
                    {revisoesPendentes > 0
                      ? `Você tem ${revisoesPendentes} tópicos aguardando revisão hoje.`
                      : 'Sua fila de repetição espaçada está em dia!'}
                  </p>
                </div>
              </Link>

              {/* Notificação de Streak */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Flame size={14} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Sequência diária ativa</p>
                  <p className="text-[0.7rem] text-slate-400 mt-0.5">
                    Continue estudando hoje para manter o seu ritmo de aprendizado.
                  </p>
                </div>
              </div>

              {/* Status do App */}
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Grade Curricular Sincronizada</p>
                  <p className="text-[0.7rem] text-slate-400 mt-0.5">
                    12 Períodos oficiais de Medicina prontos para estudo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
