'use client'

import { useAppStore } from '@/stores/useAppStore'
import Sidebar from './Sidebar'
import { motion } from 'framer-motion'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore()

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Sidebar />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 68 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="min-h-screen flex flex-col"
      >
        {children}
      </motion.main>
    </div>
  )
}
