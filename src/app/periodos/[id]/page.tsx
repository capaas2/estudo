'use client'

import { useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPeriod, updatePeriod } from '@/services/database/periods'
import { listSubjectWorkspaces, listMaterias, createMateria, createSubjectWorkspace, updateSubjectWorkspace } from '@/services/database/materias'
import { CURRICULO_MEDICINA_EXACT } from '../page'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import Modal from '@/components/shared/Modal'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import {
  BookOpen, ChevronRight, GraduationCap, ArrowLeft, Plus, Sparkles, Loader2, Edit3,
} from 'lucide-react'
import type { SubjectWorkspace } from '@/types/database'

const CORES_MATERIAS = [
  '#6366f1', '#8b5cf6', '#34d399', '#fbbf24', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#a855f7',
]

export default function PeriodoDetalhePage() {
  const params = useParams()
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const periodId = params.id as string

  // Edit Subject Workspace Modal State
  const [editingWs, setEditingWs] = useState<SubjectWorkspace | null>(null)
  const [editStatus, setEditStatus] = useState<SubjectWorkspace['status']>('cursando')
  const [editProgresso, setEditProgresso] = useState<number>(0)
  const [editProfessor, setEditProfessor] = useState<string>('')

  const { data: period, isLoading: periodLoading } = useQuery({
    queryKey: ['period', periodId],
    queryFn: () => getPeriod(periodId),
    enabled: !!periodId,
  })

  const { data: workspaces = [], isLoading: wsLoading } = useQuery({
    queryKey: ['subject-workspaces', user?.$id, periodId],
    queryFn: () => listSubjectWorkspaces(user!.$id, periodId),
    enabled: !!user && !!periodId,
  })

  const { data: materias = [] } = useQuery({
    queryKey: ['materias', user?.$id],
    queryFn: () => listMaterias(user!.$id),
    enabled: !!user,
  })

  const materiasMap = new Map(materias.map(m => [m.$id, m]))

  const updateWsMutation = useMutation({
    mutationFn: (data: { id: string; status: SubjectWorkspace['status']; progresso: number; professor?: string }) =>
      updateSubjectWorkspace(data.id, { status: data.status, progresso: data.progresso, professor: data.professor }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['subject-workspaces', user?.$id, periodId] })

      // Recalcular progresso médio do período automaticamente
      if (workspaces.length > 0) {
        const updatedWorkspaces = workspaces.map(w => w.$id === variables.id ? { ...w, progresso: variables.progresso, status: variables.status } : w)
        const media = Math.round(updatedWorkspaces.reduce((acc, curr) => acc + (curr.progresso || 0), 0) / updatedWorkspaces.length)
        const periodStatus = media === 100 ? 'concluido' : media > 0 ? 'em_andamento' : 'nao_iniciado'
        await updatePeriod(periodId, { progresso: media, status: periodStatus })
        await queryClient.invalidateQueries({ queryKey: ['periods', user?.$id] })
        await queryClient.invalidateQueries({ queryKey: ['period', periodId] })
      }
      setEditingWs(null)
    },
  })

  async function handleGerarMateriasPeriodo() {
    if (!user || !period) return
    setGenerating(true)
    try {
      const curriculoItem = CURRICULO_MEDICINA_EXACT.find(c => c.periodo === period.numero)
      const materiasParaCriar = curriculoItem ? curriculoItem.materias : [
        { nome: 'Disciplina Principal', carga: 80 },
        { nome: 'Prática Médica', carga: 60 },
      ]

      for (let j = 0; j < materiasParaCriar.length; j++) {
        const mat = materiasParaCriar[j]
        const matCor = CORES_MATERIAS[j % CORES_MATERIAS.length]
        try {
          const materiaDoc = await createMateria(user.$id, { nome: mat.nome, cor: matCor })
          await createSubjectWorkspace(user.$id, {
            materia_id: materiaDoc.$id,
            period_id: periodId,
            materia_nome: mat.nome,
            carga_horaria: mat.carga,
            status: period.numero === 1 ? 'concluido' : period.numero === 2 ? 'cursando' : 'trancado',
          })
        } catch (e) {
          console.error(`Erro ao criar disciplina no período ${period.numero}:`, e)
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['subject-workspaces', user.$id, periodId] })
      await queryClient.invalidateQueries({ queryKey: ['materias', user.$id] })
    } catch (err) {
      console.error('Erro ao gerar matérias do período:', err)
    } finally {
      setGenerating(false)
    }
  }

  function handleOpenEditWs(ws: SubjectWorkspace, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditingWs(ws)
    setEditStatus(ws.status)
    setEditProgresso(ws.progresso || 0)
    setEditProfessor(ws.professor || '')
  }

  if (userLoading || periodLoading || wsLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div className="flex items-center gap-3.5">
          <Link href="/periodos" className="btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="page-title">{period?.nome || 'Período'}</h1>
            <p className="page-subtitle">{workspaces.length} disciplina{workspaces.length !== 1 ? 's' : ''} cadastrada{workspaces.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {workspaces.length === 0 && (
          <button
            onClick={handleGerarMateriasPeriodo}
            disabled={generating}
            className="btn-primary text-xs"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? 'Gerando Disciplinas...' : 'Gerar Disciplinas Deste Período'}
          </button>
        )}
      </div>

      <div className="page-body">
        {workspaces.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma disciplina cadastrada neste período"
            description="Clique no botão abaixo para carregar automaticamente as disciplinas oficiais deste período de Medicina."
            action={{
              label: generating ? 'Gerando...' : 'Gerar Disciplinas Oficiais',
              onClick: handleGerarMateriasPeriodo,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws, i) => {
              const materiaObj = materiasMap.get(ws.materia_id)
              const nomeMateria = ws.materia_nome || materiaObj?.nome || `Disciplina`
              const cor = ws.cor_override || materiaObj?.cor || '#6366f1'
              return (
                <motion.div
                  key={ws.$id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/periodos/${periodId}/${ws.$id}`}
                    className="surface-interactive p-5 block group"
                  >
                    <div className="flex items-center gap-3.5 mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-white/[0.08]"
                        style={{ backgroundColor: `${cor}20`, color: cor, borderColor: `${cor}40` }}
                      >
                        <BookOpen size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {nomeMateria}
                        </h3>
                        {ws.professor && (
                          <p className="text-xs text-slate-400 truncate">Prof. {ws.professor}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleOpenEditWs(ws, e)}
                        className="btn-icon text-slate-400 hover:text-indigo-400 opacity-80 hover:opacity-100 transition-opacity p-1.5 shrink-0 cursor-pointer"
                        title="Editar Disciplina"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Progresso</span>
                        <span className="font-bold" style={{ color: cor }}>{ws.progresso || 0}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${ws.progresso || 0}%`, background: `linear-gradient(to right, ${cor}, ${cor}80)` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[0.7rem]">
                      <span className={`badge-sm ${ws.status === 'cursando' ? 'badge-warning' : ws.status === 'concluido' ? 'badge-success' : 'badge-indigo'}`}>
                        {ws.status === 'cursando' ? 'Cursando' : ws.status === 'concluido' ? 'Concluído' : 'A Cursar'}
                      </span>
                      {ws.carga_horaria && ws.carga_horaria > 0 && (
                        <span className="text-slate-400 font-semibold">{ws.carga_horaria}h aula</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Editar Disciplina */}
      {editingWs && (
        <Modal
          open={!!editingWs}
          onClose={() => setEditingWs(null)}
          title={`Editar Disciplina: ${editingWs.materia_nome || 'Disciplina'}`}
          footer={
            <>
              <button onClick={() => setEditingWs(null)} className="btn-outline text-xs">Cancelar</button>
              <button
                onClick={() => updateWsMutation.mutate({
                  id: editingWs.$id,
                  status: editStatus,
                  progresso: editProgresso,
                  professor: editProfessor,
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
                <label className="form-label">Progresso ({editProgresso}%)</label>
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

            <div className="form-group">
              <label className="form-label">Professor (opcional)</label>
              <input
                type="text"
                value={editProfessor}
                onChange={e => setEditProfessor(e.target.value)}
                placeholder="Nome do professor..."
                className="form-input"
              />
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
