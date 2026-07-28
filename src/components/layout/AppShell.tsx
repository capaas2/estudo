'use client'

import { useAppStore } from '@/stores/useAppStore'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { motion } from 'framer-motion'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore()

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col">
      <Sidebar />
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 250 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen flex flex-col flex-1"
      >
        <TopBar />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </motion.div>
    </div>
  )
}
