'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Target, Clock, Brain, PieChart } from 'lucide-react'

interface AnalyticsTabProps {
  materiaId: string
  materiaNome: string
  materiaCor: string
}

export default function AnalyticsTab({ materiaId, materiaNome, materiaCor }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Acertos (%)', value: '—', icon: Target, color: 'emerald' },
          { label: 'Questões Feitas', value: '—', icon: Brain, color: 'cyan' },
          { label: 'Tempo Médio/Questão', value: '—', icon: Clock, color: 'amber' },
          { label: 'Evolução', value: '—', icon: TrendingUp, color: 'violet' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <stat.icon size={16} className={`text-${stat.color}-400 mb-2`} />
            <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-cyan-400" />
            Desempenho por Subtema
          </h3>
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-slate-600 italic">
              Gráfico será exibido com dados de simulados (Recharts)
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <PieChart size={14} className="text-violet-400" />
            Distribuição de Dificuldade
          </h3>
          <div className="h-48 flex items-center justify-center">
            <p className="text-xs text-slate-600 italic">
              Gráfico de distribuição será gerado com dados reais
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-emerald-400" />
          Evolução ao Longo do Tempo
        </h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-slate-600 italic">
            Gráfico de linha temporal com progresso em simulados
          </p>
        </div>
      </div>
    </div>
  )
}
