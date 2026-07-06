'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAppStore } from '@/stores/useAppStore'
import { account } from '@/lib/appwrite/config'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, GraduationCap, RotateCcw, Layers, Database,
  ClipboardList, BarChart3, FolderOpen, Settings, LogOut, User,
  ChevronLeft, ChevronRight, Search, Sparkles,
} from 'lucide-react'

const navSections = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/periodos', label: 'Períodos', icon: GraduationCap },
    ]
  },
  {
    label: 'Estudo',
    items: [
      { href: '/revisoes', label: 'Revisões', icon: RotateCcw },
      { href: '/flashcards', label: 'Flashcards', icon: Layers },
      { href: '/copiloto', label: 'Copiloto IA', icon: Sparkles },
    ]
  },
  {
    label: 'Avaliação',
    items: [
      { href: '/questoes', label: 'Banco de Questões', icon: Database },
      { href: '/simulados', label: 'Simulados', icon: ClipboardList },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { href: '/arquivos', label: 'Arquivos', icon: FolderOpen },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ]
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  const nomeUsuario = user?.name || user?.email?.split('@')[0] || 'Usuário'

  async function handleLogout() {
    try {
      await account.deleteSession('current')
      await fetch('/api/auth/session', { method: 'DELETE' })
      router.push('/login')
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
      // Mesmo com erro, limpa o cookie e redireciona
      await fetch('/api/auth/session', { method: 'DELETE' })
      router.push('/login')
    }
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 68 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed top-0 left-0 h-screen z-50 flex flex-col bg-[#0f1219] border-r border-white/[0.06] overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent whitespace-nowrap"
              >
                StudyPro
              </motion.h1>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Info */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.04] overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-200 truncate">{nomeUsuario}</p>
                <p className="text-[0.65rem] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="px-3 mt-3">
        <button
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] text-slate-500 hover:text-slate-400 transition-all text-sm ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <Search size={15} />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left text-xs">Buscar...</span>
              <kbd className="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-600">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 mt-4 space-y-5 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.label}>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[0.6rem] font-semibold text-slate-600 uppercase tracking-[0.12em] mb-1.5 px-3"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-cyan-400 rounded-r-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon size={18} className="shrink-0" />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          className="whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06] space-y-2">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>
        {!sidebarCollapsed && (
          <p className="text-[0.6rem] text-slate-600 text-center">StudyPro v4.0</p>
        )}
      </div>
    </motion.aside>
  )
}
