'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppStore } from '@/stores/useAppStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import { motion } from 'framer-motion'

export default function AppShell({ children, showSidebar = true }: { children: ReactNode, showSidebar?: boolean }) {
  const { user, loading } = useAuth()
  const { sidebarCollapsed } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#0a0e1a]">
      {showSidebar && <Sidebar />}
      <motion.main
        initial={false}
        animate={{ marginLeft: showSidebar ? (sidebarCollapsed ? 68 : 260) : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-1 min-h-screen"
      >
        {children}
      </motion.main>
    </div>
  )
}
