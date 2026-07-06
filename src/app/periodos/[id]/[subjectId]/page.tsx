'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listSubjectWorkspaces } from '@/services/database/materias'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  Eye, FileText, ListChecks, RotateCcw, Layers, FolderOpen,
  Database, BarChart3, Sparkles, Newspaper, BookOpen,
} from 'lucide-react'

// Workspace tab components
import OverviewTab from '@/components/workspace/OverviewTab'
import NotesTab from '@/components/workspace/NotesTab'
import TasksTab from '@/components/workspace/TasksTab'
import ReviewsTab from '@/components/workspace/ReviewsTab'
import FlashcardsTab from '@/components/workspace/FlashcardsTab'
import FilesTab from '@/components/workspace/FilesTab'
import QuestionsTab from '@/components/workspace/QuestionsTab'
import AnalyticsTab from '@/components/workspace/AnalyticsTab'
import IACopilotTab from '@/components/workspace/IACopilotTab'
import JournalClubTab from '@/components/workspace/JournalClubTab'

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral', icon: Eye },
  { id: 'notas', label: 'Notas', icon: FileText },
  { id: 'tarefas', label: 'Tarefas', icon: ListChecks },
  { id: 'revisoes', label: 'Revisões', icon: RotateCcw },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
  { id: 'questoes', label: 'Questões', icon: Database },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'copiloto', label: 'IA Copilot', icon: Sparkles },
  { id: 'clube-revista', label: 'Clube de Revista', icon: Newspaper },
]

export default function WorkspacePage() {
  const params = useParams()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState('visao-geral')

  const periodId = params.id as string
  const subjectId = params.subjectId as string

  // TODO: Buscar dados reais da matéria pelo subjectId
  // Por enquanto usando placeholders que funcionam sem Appwrite configurado
  const materiaNome = 'Matéria'
  const materiaCor = '#06b6d4'
  const materiaId = subjectId

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  function renderTabContent() {
    switch (activeTab) {
      case 'visao-geral':
        return <OverviewTab materiaId={materiaId} materiaNome={materiaNome} materiaCor={materiaCor} />
      case 'notas':
        return <NotesTab materiaId={materiaId} />
      case 'tarefas':
        return <TasksTab materiaId={materiaId} />
      case 'revisoes':
        return <ReviewsTab materiaId={materiaId} />
      case 'flashcards':
        return <FlashcardsTab materiaId={materiaId} materiaNome={materiaNome} />
      case 'arquivos':
        return <FilesTab materiaId={materiaId} />
      case 'questoes':
        return <QuestionsTab materiaId={materiaId} />
      case 'analytics':
        return <AnalyticsTab materiaId={materiaId} materiaNome={materiaNome} materiaCor={materiaCor} />
      case 'copiloto':
        return <IACopilotTab materiaId={materiaId} materiaNome={materiaNome} />
      case 'clube-revista':
        return <JournalClubTab materiaId={materiaId} />
      default:
        return null
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${materiaCor}20`, color: materiaCor }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="page-title">{materiaNome}</h1>
            <p className="page-subtitle">Workspace de estudo</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${activeTab === tab.id ? 'tab-item-active' : 'tab-item'} relative`}
          >
            <span className="flex items-center gap-1.5">
              <tab.icon size={14} />
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="workspace-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="page-body">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </AppShell>
  )
}
