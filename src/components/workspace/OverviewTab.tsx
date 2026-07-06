'use client'

import { motion } from 'framer-motion'
import {
  BookOpen, FileText, ListChecks, RotateCcw, Layers,
  Database, TrendingUp, Clock, Target, CheckCircle,
} from 'lucide-react'

interface OverviewTabProps {
  materiaId: string
  materiaNome: string
  materiaCor: string
}

export default function OverviewTab({ materiaId, materiaNome, materiaCor }: OverviewTabProps) {
  // Placeholder stats — serão preenchidos com dados reais do Appwrite
  const stats = [
    { icon: FileText, label: 'Notas', value: '—', color: 'cyan' },
    { icon: ListChecks, label: 'Tarefas', value: '—', color: 'violet' },
    { icon: RotateCcw, label: 'Revisões Pendentes', value: '—', color: 'amber' },
    { icon: Layers, label: 'Flashcards', value: '—', color: 'emerald' },
    { icon: Database, label: 'Questões', value: '—', color: 'rose' },
    { icon: Clock, label: 'Horas Estudadas', value: '—', color: 'cyan' },
  ]

  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400',
  }

  return (
    <div className="space-y-6">
      {/* Header com cor da matéria */}
      <div
        className="glass-card p-6 relative overflow-hidden"
        style={{ borderColor: `${materiaCor}30` }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: materiaCor }}
        />
        <div className="relative flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${materiaCor}20`, color: materiaCor }}
          >
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{materiaNome}</h2>
            <p className="text-sm text-slate-400">Visão geral da matéria</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Progresso geral</span>
            <span className="text-xs font-semibold" style={{ color: materiaCor }}>0%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '0%', background: `linear-gradient(to right, ${materiaCor}, ${materiaCor}80)` }} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[stat.color]} flex items-center justify-center mb-3`}>
              <stat.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-cyan-400" />
            Atividade Recente
          </h3>
          <div className="space-y-3">
            <p className="text-xs text-slate-600 italic text-center py-6">
              Configure o Appwrite para ver atividades recentes
            </p>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <Target size={14} className="text-amber-400" />
            Próximas Tarefas
          </h3>
          <div className="space-y-3">
            <p className="text-xs text-slate-600 italic text-center py-6">
              Nenhuma tarefa pendente
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
