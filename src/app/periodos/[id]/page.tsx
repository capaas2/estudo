'use client'

import { useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPeriod } from '@/services/database/periods'
import { listSubjectWorkspaces, listMaterias, createMateria, createSubjectWorkspace } from '@/services/database/materias'
import { CURRICULO_MEDICINA_EXACT } from '../page'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import {
  BookOpen, ChevronRight, GraduationCap, ArrowLeft, Plus, Sparkles, Loader2,
} from 'lucide-react'

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
              const nomeMateria = materiaObj?.nome || `Disciplina`
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
                      <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0" />
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
    </AppShell>
  )
}
