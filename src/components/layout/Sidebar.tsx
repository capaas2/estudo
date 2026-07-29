'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAppStore } from '@/stores/useAppStore'
import { account } from '@/lib/appwrite/config'
import { useQuery } from '@tanstack/react-query'
import { listReviews } from '@/services/database/reviews'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GraduationCap, RotateCcw,
  HelpCircle, Settings, LogOut, User,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', user?.$id],
    queryFn: () => listReviews(user!.$id),
    enabled: !!user,
  })

  const revisoesPendentes = reviews.filter(r => r.status === 'pendente').length

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/periodos', label: 'Meus Estudos', icon: GraduationCap },
    {
      href: '/revisoes',
      label: 'Revisões',
      icon: RotateCcw,
      badge: revisoesPendentes > 0 ? revisoesPendentes.toString() : undefined,
    },
    { href: '/questoes', label: 'Questões & Simulados', icon: HelpCircle },
    { href: '/copiloto', label: 'Copiloto IA', icon: Sparkles },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
  ]

  const nomeUsuario = user?.name || user?.email?.split('@')[0] || 'Estudante'

  async function handleLogout() {
    try {
      await account.deleteSession('current')
      await fetch('/api/auth/session', { method: 'DELETE' })
      router.push('/login')
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
      await fetch('/api/auth/session', { method: 'DELETE' })
      router.push('/login')
    }
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 250 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 h-screen z-50 flex flex-col bg-[#0b0d14] border-r border-white/[0.06] overflow-hidden"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <GraduationCap size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  StudyPro
                </h1>
                <span className="text-[0.65rem] text-indigo-400 font-medium tracking-wider uppercase">v4 Medicina</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
          title={sidebarCollapsed ? 'Expandir barra' : 'Recolher barra'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/20'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="whitespace-nowrap flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {!sidebarCollapsed && item.badge && (
                <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-white/[0.06] shrink-0 bg-white/[0.01]">
        <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-300">
              <User size={15} />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{nomeUsuario}</p>
                <p className="text-[0.65rem] text-slate-500 truncate">{user?.email || 'Medicina'}</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
