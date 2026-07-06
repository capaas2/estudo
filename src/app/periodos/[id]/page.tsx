'use client'

import { useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { getPeriod } from '@/services/database/periods'
import { listSubjectWorkspaces } from '@/services/database/materias'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, ChevronRight, GraduationCap, ArrowLeft,
} from 'lucide-react'

export default function PeriodoDetalhePage() {
  const params = useParams()
  const { data: user, isLoading: userLoading } = useCurrentUser()
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

  if (userLoading || periodLoading || wsLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/periodos" className="btn-icon">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="page-title">{period?.nome || 'Período'}</h1>
            <p className="page-subtitle">{workspaces.length} matéria{workspaces.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
      <div className="page-body">
        {workspaces.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma matéria neste período"
            description="Matérias são vinculadas durante o onboarding. Refaça o onboarding para adicionar matérias."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws, i) => {
              const cor = ws.cor_override || '#06b6d4'
              return (
                <motion.div
                  key={ws.$id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/periodos/${periodId}/${ws.$id}`}
                    className="glass-card-hover p-5 block group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${cor}20`, color: cor }}
                      >
                        <BookOpen size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-100 truncate">
                          Matéria {ws.materia_id.slice(0, 6)}
                        </h3>
                        {ws.professor && (
                          <p className="text-xs text-slate-500 truncate">Prof. {ws.professor}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </div>

                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Progresso</span>
                        <span className="text-xs font-semibold" style={{ color: cor }}>{ws.progresso || 0}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${ws.progresso || 0}%`, background: `linear-gradient(to right, ${cor}, ${cor}80)` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[0.65rem] text-slate-600">
                      <span className={`badge-sm ${ws.status === 'cursando' ? 'badge-cyan' : ws.status === 'concluido' ? 'badge-success' : 'badge-warning'}`}>
                        {ws.status === 'cursando' ? 'Cursando' : ws.status === 'concluido' ? 'Concluído' : 'Trancado'}
                      </span>
                      {ws.carga_horaria && ws.carga_horaria > 0 && (
                        <span>{ws.carga_horaria}h</span>
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
