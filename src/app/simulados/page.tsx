'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSimulados, deleteSimulado } from '@/services/database/simulados'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ClipboardList, Plus, Trash2, Clock, BookOpen, CheckCircle,
  ChevronRight, Target, Play,
} from 'lucide-react'
import type { Simulado } from '@/types/database'

const statusConfig: Record<Simulado['status'], { label: string; color: string; icon: typeof Clock }> = {
  criado: { label: 'Criado', color: 'slate', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'amber', icon: Play },
  finalizado: { label: 'Finalizado', color: 'emerald', icon: CheckCircle },
}

export default function SimuladosPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: simulados = [], isLoading } = useQuery({
    queryKey: ['simulados', user?.$id],
    queryFn: () => listSimulados(user!.$id),
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSimulado(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['simulados'] }),
  })

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Simulados</h1>
          <p className="page-subtitle">{simulados.length} simulado{simulados.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/simulados/criar" className="btn-premium text-xs">
          <Plus size={14} />
          Criar Simulado
        </Link>
      </div>
      <div className="page-body">
        {simulados.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum simulado ainda"
            description="Crie seu primeiro simulado a partir do banco de questões."
            action={{ label: 'Criar Simulado', onClick: () => window.location.href = '/simulados/criar' }}
          />
        ) : (
          <div className="space-y-3">
            {simulados.map((sim, i) => {
              const config = statusConfig[sim.status]
              const percentual = sim.nota_maxima && sim.nota_maxima > 0
                ? Math.round(((sim.nota || 0) / sim.nota_maxima) * 100)
                : null
              const link = sim.status === 'finalizado'
                ? `/simulados/${sim.$id}/resultado`
                : sim.status === 'em_andamento'
                  ? `/simulados/${sim.$id}/executar`
                  : `/simulados/${sim.$id}/executar`

              return (
                <motion.div
                  key={sim.$id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={link} className="glass-card-hover p-5 flex items-center gap-4 group block">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-${config.color}-500/10`}>
                      <config.icon size={20} className={`text-${config.color}-400`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-200 truncate">{sim.titulo}</h3>
                        <span className={`badge-sm badge-${config.color}`}>{config.label}</span>
                        <span className="badge-sm badge-cyan">{sim.modo === 'tutor' ? 'Tutor' : 'Cronometrado'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{(sim.questao_ids || []).length} questões</span>
                        {sim.tempo_total && <span>• {Math.round(sim.tempo_total / 60)}min</span>}
                        {percentual !== null && (
                          <span className={percentual >= 70 ? 'text-emerald-400' : percentual >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                            • {percentual}%
                          </span>
                        )}
                        <span>• {new Date(sim.$createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(sim.$id) }}
                        className="btn-icon text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
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
