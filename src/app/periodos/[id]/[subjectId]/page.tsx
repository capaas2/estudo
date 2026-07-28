'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSubjectWorkspaces, updateSubjectWorkspace } from '@/services/database/materias'
import { updatePeriod } from '@/services/database/periods'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import Modal from '@/components/shared/Modal'
import { motion } from 'framer-motion'
import {
  Eye, FileText, Layers, Database, FolderOpen, Sparkles, BookOpen, Edit3, CheckCircle2, Clock, Circle,
} from 'lucide-react'
import type { SubjectWorkspace } from '@/types/database'

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
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('visao-geral')
  const [estudoSubTab, setEstudoSubTab] = useState<'revisoes' | 'flashcards' | 'tarefas'>('revisoes')
  const [iaSubTab, setIaSubTab] = useState<'copiloto' | 'clube'>('copiloto')

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)

  const periodId = params.id as string
  const subjectId = params.subjectId as string

  const { data: workspaces = [] } = useQuery({
    queryKey: ['subject-workspaces', user?.$id, periodId],
    queryFn: () => listSubjectWorkspaces(user!.$id, periodId),
    enabled: !!user && !!periodId,
  })

  const currentWorkspace = workspaces.find(w => w.$id === subjectId) || workspaces[0]

  const materiaNome = currentWorkspace?.materia_nome || 'Disciplina de Medicina'
  const materiaCor = currentWorkspace?.cor_override || '#6366f1'

  const [editStatus, setEditStatus] = useState<SubjectWorkspace['status']>(currentWorkspace?.status || 'cursando')
  const [editProgresso, setEditProgresso] = useState<number>(currentWorkspace?.progresso || 0)

  const updateWsMutation = useMutation({
    mutationFn: (data: { status: SubjectWorkspace['status']; progresso: number }) =>
      updateSubjectWorkspace(subjectId, { status: data.status, progresso: data.progresso }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['subject-workspaces', user?.$id, periodId] })

      // Recalcular progresso médio do período
      if (workspaces.length > 0) {
        const updatedWorkspaces = workspaces.map(w => w.$id === subjectId ? { ...w, progresso: variables.progresso, status: variables.status } : w)
        const media = Math.round(updatedWorkspaces.reduce((acc, curr) => acc + (curr.progresso || 0), 0) / updatedWorkspaces.length)
        const periodStatus = media === 100 ? 'concluido' : media > 0 ? 'em_andamento' : 'nao_iniciado'
        await updatePeriod(periodId, { progresso: media, status: periodStatus })
        await queryClient.invalidateQueries({ queryKey: ['periods', user?.$id] })
      }
      setShowEditModal(false)
    },
  })

  function handleOpenModal() {
    setEditStatus(currentWorkspace?.status || 'cursando')
    setEditProgresso(currentWorkspace?.progresso || 0)
    setShowEditModal(true)
  }

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  function renderTabContent() {
    switch (activeTab) {
      case 'visao-geral':
        return <OverviewTab materiaId={subjectId} materiaNome={materiaNome} materiaCor={materiaCor} />
      case 'notas':
        return <NotesTab materiaId={subjectId} />
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

            {estudoSubTab === 'revisoes' && <ReviewsTab materiaId={subjectId} />}
            {estudoSubTab === 'flashcards' && <FlashcardsTab materiaId={subjectId} materiaNome={materiaNome} />}
            {estudoSubTab === 'tarefas' && <TasksTab materiaId={subjectId} />}
          </div>
        )
      case 'questoes':
        return <QuestionsTab materiaId={subjectId} />
      case 'arquivos':
        return <FilesTab materiaId={subjectId} />
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

            {iaSubTab === 'copiloto' && <IACopilotTab materiaId={subjectId} materiaNome={materiaNome} />}
            {iaSubTab === 'clube' && <JournalClubTab materiaId={subjectId} />}
          </div>
        )
      default:
        return null
    }
  }

  const statusBadge = currentWorkspace?.status === 'concluido'
    ? { label: 'Concluído', class: 'badge-success', icon: CheckCircle2 }
    : currentWorkspace?.status === 'cursando'
    ? { label: 'Cursando', class: 'badge-warning', icon: Clock }
    : { label: 'A Cursar', class: 'badge-indigo', icon: Circle }

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title">{materiaNome}</h1>
              <span className={`badge-sm ${statusBadge.class} inline-flex items-center gap-1`}>
                <statusBadge.icon size={10} />
                {statusBadge.label}
              </span>
              <span className="text-xs font-bold text-indigo-400">
                {currentWorkspace?.progresso || 0}%
              </span>
            </div>
            <p className="page-subtitle">Workspace de estudo da matéria</p>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="btn-outline text-xs"
        >
          <Edit3 size={14} />
          Editar Progresso & Status
        </button>
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

      {/* Modal Editar Progresso e Status */}
      {showEditModal && (
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Editar Disciplina: ${materiaNome}`}
          footer={
            <>
              <button onClick={() => setShowEditModal(false)} className="btn-outline text-xs">Cancelar</button>
              <button
                onClick={() => updateWsMutation.mutate({
                  status: editStatus,
                  progresso: editProgresso,
                })}
                disabled={updateWsMutation.isPending}
                className="btn-primary text-xs"
              >
                {updateWsMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Status da Disciplina</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as SubjectWorkspace['status'])}
                className="form-select"
              >
                <option value="cursando">Cursando</option>
                <option value="concluido">Concluído</option>
                <option value="trancado">A Cursar (Pendente)</option>
              </select>
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label">Porcentagem de Progresso ({editProgresso}%)</label>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={editProgresso}
                onChange={e => setEditProgresso(parseInt(e.target.value) || 0)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
