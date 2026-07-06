'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { getSimulado, listRespostas } from '@/services/database/simulados'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  Trophy, Clock, Target, TrendingUp, CheckCircle, XCircle,
  ArrowLeft, RotateCcw, BarChart3,
} from 'lucide-react'

export default function ResultadoSimuladoPage() {
  const params = useParams()
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const simuladoId = params.id as string

  const { data: simulado, isLoading: simLoading } = useQuery({
    queryKey: ['simulado', simuladoId],
    queryFn: () => getSimulado(simuladoId),
    enabled: !!simuladoId,
  })

  const { data: respostas = [], isLoading: respLoading } = useQuery({
    queryKey: ['respostas', user?.$id, simuladoId],
    queryFn: () => listRespostas(user!.$id, simuladoId),
    enabled: !!user && !!simuladoId,
  })

  if (simLoading || respLoading) return <AppShell><PageLoading /></AppShell>
  if (!simulado) return <AppShell><p className="text-slate-400 p-8">Simulado não encontrado</p></AppShell>

  const corretas = respostas.filter(r => r.esta_correta).length
  const total = respostas.length || simulado.nota_maxima || 1
  const percentual = Math.round((corretas / total) * 100)
  const tempoTotal = simulado.tempo_total || respostas.reduce((sum, r) => sum + (r.tempo_gasto || 0), 0)
  const tempoMedio = respostas.length > 0 ? Math.round(tempoTotal / respostas.length) : 0

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const gradeColor = percentual >= 70 ? 'emerald' : percentual >= 50 ? 'amber' : 'rose'
  const gradeLabel = percentual >= 90 ? 'Excelente!' : percentual >= 70 ? 'Bom!' : percentual >= 50 ? 'Regular' : 'Precisa Melhorar'

  return (
    <AppShell>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/simulados')} className="btn-icon">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Resultado</h1>
            <p className="page-subtitle">{simulado.titulo}</p>
          </div>
        </div>
      </div>

      <div className="page-body max-w-3xl space-y-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center relative overflow-hidden"
        >
          <div className={`absolute inset-0 bg-gradient-to-br from-${gradeColor}-500/10 to-transparent pointer-events-none`} />
          <div className="relative">
            <Trophy size={40} className={`text-${gradeColor}-400 mx-auto mb-4`} />
            <div className={`text-6xl font-black text-${gradeColor}-400 mb-2`}>
              {percentual}%
            </div>
            <p className="text-lg text-slate-300 font-semibold">{gradeLabel}</p>
            <p className="text-sm text-slate-500 mt-1">
              {corretas} de {total} questões corretas
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Target, label: 'Acertos', value: `${corretas}/${total}`, color: 'emerald' },
            { icon: XCircle, label: 'Erros', value: `${total - corretas}`, color: 'rose' },
            { icon: Clock, label: 'Tempo Total', value: formatTime(tempoTotal), color: 'cyan' },
            { icon: TrendingUp, label: 'Tempo Médio', value: formatTime(tempoMedio), color: 'violet' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="stat-card"
            >
              <stat.icon size={16} className={`text-${stat.color}-400 mb-2`} />
              <p className="text-xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Respostas */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-cyan-400" />
            Detalhamento por Questão
          </h3>
          <div className="space-y-2">
            {respostas.map((resp, i) => (
              <motion.div
                key={resp.$id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02]"
              >
                <span className="text-xs text-slate-600 font-mono w-6">Q{i + 1}</span>
                {resp.esta_correta
                  ? <CheckCircle size={16} className="text-emerald-400" />
                  : <XCircle size={16} className="text-rose-400" />
                }
                <span className="text-sm text-slate-300 flex-1">
                  {resp.resposta_objetiva ? `Respondeu: ${resp.resposta_objetiva}` : 'Discursiva'}
                </span>
                {resp.tempo_gasto !== undefined && (
                  <span className="text-[0.65rem] text-slate-500">
                    {formatTime(resp.tempo_gasto)}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => router.push('/simulados/criar')}
            className="btn-secondary text-xs"
          >
            <RotateCcw size={14} />
            Novo Simulado
          </button>
          <button
            onClick={() => router.push('/revisoes')}
            className="btn-premium text-xs"
          >
            Ver Revisões Criadas
          </button>
        </div>
      </div>
    </AppShell>
  )
}
