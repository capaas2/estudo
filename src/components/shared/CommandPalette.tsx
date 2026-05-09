'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Database, Layers, LayoutDashboard, Calendar, Brain, Clock, Settings, BookOpen } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useState } from 'react'

export function CommandPalette() {
  const { commandPaletteOpen: open, setCommandPaletteOpen: setOpen } = useAppStore()
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setOpen])

  const actions = [
    { id: 'home', title: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { id: 'notas', title: 'Notas', icon: FileText, href: '/notas' },
    { id: 'questoes', title: 'Banco de Questões', icon: Database, href: '/questoes' },
    { id: 'simulados', title: 'Simulados', icon: BookOpen, href: '/simulados' },
    { id: 'flashcards', title: 'Flashcards', icon: Layers, href: '/flashcards' },
    { id: 'revisoes', title: 'Revisões Espaçadas', icon: Clock, href: '/revisoes' },
    { id: 'calendario', title: 'Calendário', icon: Calendar, href: '/calendario' },
    { id: 'tutoria', title: 'Tutoria IA', icon: Brain, href: '/tutoria' },
    { id: 'configuracoes', title: 'Configurações', icon: Settings, href: '/configuracoes' },
  ]

  const filtered = query ? actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase())) : actions

  function onSelect(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setOpen(false)} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-[#0a0e1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10"
          >
            <div className="flex items-center px-4 py-3 border-b border-white/[0.05]">
              <Search className="text-slate-400 mr-3" size={20} />
              <input
                autoFocus
                placeholder="Para onde vamos? (Busque páginas ou ferramentas)"
                className="flex-1 bg-transparent border-none outline-none text-slate-200 text-lg placeholder:text-slate-600"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="text-xs font-semibold px-2 py-1 bg-white/5 text-slate-400 rounded-md">ESC</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado.</p>
              ) : (
                filtered.map((action, i) => (
                  <button
                    key={action.id}
                    onClick={() => onSelect(action.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-400 text-slate-300 transition-colors group text-left"
                  >
                    <action.icon size={18} className="text-slate-500 group-hover:text-cyan-400" />
                    <span className="font-medium">{action.title}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
