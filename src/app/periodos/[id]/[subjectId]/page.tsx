'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  Eye, FileText, Layers, Database, FolderOpen, Sparkles, BookOpen,
} from 'lucide-react'

// Workspace tab components
import OverviewTab from '@/components/workspace/OverviewTab'
import NotesTab from '@/components/workspace/NotesTab'
import FlashcardsTab from '@/components/workspace/FlashcardsTab'
import FilesTab from '@/components/workspace/FilesTab'
import QuestionsTab from '@/components/workspace/QuestionsTab'
import IACopilotTab from '@/components/workspace/IACopilotTab'
import ReviewsTab from '@/components/workspace/ReviewsTab'
import TasksTab from '@/components/workspace/TasksTab'
import JournalClubTab from '@/components/workspace/JournalClubTab'

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Eye },
  { id: 'notas', label: 'Notas & Tutorias', icon: FileText },
  { id: 'estudo', label: 'Hub de Estudo', icon: Layers },
  { id: 'questoes', label: 'Questões', icon: Database },
  { id: 'arquivos', label: 'Arquivos da Matéria', icon: FolderOpen },
  { id: 'ia', label: 'Copiloto IA', icon: Sparkles },
]

export default function WorkspacePage() {
  const params = useParams()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState('visao-geral')
  const [estudoSubTab, setEstudoSubTab] = useState<'revisoes' | 'flashcards' | 'tarefas'>('revisoes')
  const [iaSubTab, setIaSubTab] = useState<'copiloto' | 'clube'>('copiloto')

  const periodId = params.id as string
  const subjectId = params.subjectId as string

  const materiaNome = 'Matéria de Medicina'
  const materiaCor = '#6366f1'
  const materiaId = subjectId

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  function renderTabContent() {
    switch (activeTab) {
      case 'visao-geral':
        return <OverviewTab materiaId={materiaId} materiaNome={materiaNome} materiaCor={materiaCor} />
      case 'notas':
        return <NotesTab materiaId={materiaId} />
      case 'estudo':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
              <button
                onClick={() => setEstudoSubTab('revisoes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  estudoSubTab === 'revisoes' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Revisões FSRS
              </button>
              <button
                onClick={() => setEstudoSubTab('flashcards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  estudoSubTab === 'flashcards' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flashcards
              </button>
              <button
                onClick={() => setEstudoSubTab('tarefas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  estudoSubTab === 'tarefas' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tarefas
              </button>
            </div>

            {estudoSubTab === 'revisoes' && <ReviewsTab materiaId={materiaId} />}
            {estudoSubTab === 'flashcards' && <FlashcardsTab materiaId={materiaId} materiaNome={materiaNome} />}
            {estudoSubTab === 'tarefas' && <TasksTab materiaId={materiaId} />}
          </div>
        )
      case 'questoes':
        return <QuestionsTab materiaId={materiaId} />
      case 'arquivos':
        return <FilesTab materiaId={materiaId} />
      case 'ia':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
              <button
                onClick={() => setIaSubTab('copiloto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  iaSubTab === 'copiloto' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Copiloto de Dúvidas
              </button>
              <button
                onClick={() => setIaSubTab('clube')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  iaSubTab === 'clube' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Clube de Revista (Artigos)
              </button>
            </div>

            {iaSubTab === 'copiloto' && <IACopilotTab materiaId={materiaId} materiaNome={materiaNome} />}
            {iaSubTab === 'clube' && <JournalClubTab materiaId={materiaId} />}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="page-title">{materiaNome}</h1>
            <p className="page-subtitle">Workspace de estudo da matéria</p>
          </div>
        </div>
      </div>

      {/* Pill Navigation Bar */}
      <div className="px-8 py-3 border-b border-white/[0.06] bg-[#08090d]/60 backdrop-blur-sm overflow-x-auto scrollbar-none flex items-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={isActive ? 'pill-tab-active' : 'pill-tab'}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="page-body">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </AppShell>
  )
}
