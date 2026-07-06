'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listSimulados } from '@/services/database/simulados'
import { listFlashcards } from '@/services/database/flashcards'
import { listReviews } from '@/services/database/reviews'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, Target, Clock, Brain, PieChart,
  CheckCircle, XCircle, Layers, RotateCcw,
} from 'lucide-react'

export default function AnalyticsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()

  const { data: simulados = [] } = useQuery({
    queryKey: ['simulados', user?.$id],
    queryFn: () => listSimulados(user!.$id),
    enabled: !!user,
  })

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', user?.$id],
    queryFn: () => listFlashcards(user!.$id),
    enabled: !!user,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', user?.$id],
    queryFn: () => listReviews(user!.$id),
    enabled: !!user,
  })

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  const finalizados = simulados.filter(s => s.status === 'finalizado')
  const totalQuestoes = finalizados.reduce((sum, s) => sum + (s.nota_maxima || 0), 0)
  const totalAcertos = finalizados.reduce((sum, s) => sum + (s.nota || 0), 0)
  const percentualGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0
  const tempoTotal = finalizados.reduce((sum, s) => sum + (s.tempo_total || 0), 0)
  const reviewsConcluidas = reviews.filter(r => r.status === 'concluida').length
  const flashcardsMaduros = flashcards.filter(f => f.state === 'review').length

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Seu desempenho geral de estudos</p>
        </div>
      </div>
      <div className="page-body space-y-6">
        {/* Big stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Target, label: 'Taxa de Acerto', value: `${percentualGeral}%`, color: percentualGeral >= 70 ? 'emerald' : 'amber' },
            { icon: Brain, label: 'Questões Feitas', value: totalQuestoes.toString(), color: 'cyan' },
            { icon: Clock, label: 'Tempo Total', value: tempoTotal > 0 ? `${Math.round(tempoTotal / 60)}min` : '—', color: 'violet' },
            { icon: TrendingUp, label: 'Simulados', value: finalizados.length.toString(), color: 'rose' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="stat-card"
            >
              <stat.icon size={18} className={`text-${stat.color}-400 mb-2`} />
              <p className="text-3xl font-black text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
              <Layers size={14} className="text-cyan-400" />
              Flashcards
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-sm font-semibold text-slate-200">{flashcards.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Maduros</span>
                <span className="text-sm font-semibold text-emerald-400">{flashcardsMaduros}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Para Revisar</span>
                <span className="text-sm font-semibold text-amber-400">
                  {flashcards.filter(f => !f.due || new Date(f.due) <= new Date()).length}
                </span>
              </div>
              {flashcards.length > 0 && (
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(flashcardsMaduros / flashcards.length) * 100}%` }} />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6"
          >
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
              <RotateCcw size={14} className="text-violet-400" />
              Revisões
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-sm font-semibold text-slate-200">{reviews.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Concluídas</span>
                <span className="text-sm font-semibold text-emerald-400">{reviewsConcluidas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Pendentes</span>
                <span className="text-sm font-semibold text-amber-400">
                  {reviews.filter(r => r.status === 'pendente').length}
                </span>
              </div>
              {reviews.length > 0 && (
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(reviewsConcluidas / reviews.length) * 100}%`, background: 'linear-gradient(to right, #8b5cf6, #a78bfa)' }} />
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-emerald-400" />
              Desempenho em Simulados
            </h3>
            {finalizados.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Faça seu primeiro simulado para ver dados</p>
            ) : (
              <div className="space-y-2">
                {finalizados.slice(0, 5).map((sim, i) => {
                  const pct = sim.nota_maxima ? Math.round(((sim.nota || 0) / sim.nota_maxima) * 100) : 0
                  return (
                    <div key={sim.$id} className="flex items-center gap-3">
                      <span className="text-[0.6rem] text-slate-600 w-16 truncate">{sim.titulo}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.04]">
                        <div
                          className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppShell>
  )
}
