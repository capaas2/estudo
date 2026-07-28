'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Target, Clock, Brain, PieChart as PieChartIcon } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts'

interface AnalyticsTabProps {
  materiaId: string
  materiaNome: string
  materiaCor: string
}

const subtemaData = [
  { subtema: 'Anatomia Geral', acertos: 85 },
  { subtema: 'Histologia Orgânica', acertos: 72 },
  { subtema: 'Fisiologia Celular', acertos: 90 },
  { subtema: 'Patologia Sistêmica', acertos: 64 },
]

const dificuldadeData = [
  { name: 'Fácil', value: 45, color: '#10b981' },
  { name: 'Médio', value: 35, color: '#06b6d4' },
  { name: 'Difícil', value: 20, color: '#f43f5e' },
]

const evolucaoData = [
  { semana: 'Sem 1', pontuacao: 68 },
  { semana: 'Sem 2', pontuacao: 74 },
  { semana: 'Sem 3', pontuacao: 79 },
  { semana: 'Sem 4', pontuacao: 86 },
]

export default function AnalyticsTab({ materiaId, materiaNome, materiaCor }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Acertos (%)', value: '78%', icon: Target, color: 'emerald' },
          { label: 'Questões Feitas', value: '142', icon: Brain, color: 'cyan' },
          { label: 'Tempo Médio', value: '1.8 min', icon: Clock, color: 'amber' },
          { label: 'Evolução', value: '+12%', icon: TrendingUp, color: 'violet' },
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

      {/* Recharts Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-cyan-400" />
            Desempenho por Subtema ({materiaNome})
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subtemaData}>
                <XAxis dataKey="subtema" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }} />
                <Bar dataKey="acertos" fill={materiaCor || '#06b6d4'} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
            <PieChartIcon size={14} className="text-violet-400" />
            Distribuição de Dificuldade
          </h3>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dificuldadeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dificuldadeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-emerald-400" />
          Evolução ao Longo do Tempo
        </h3>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucaoData}>
              <XAxis dataKey="semana" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} domain={[50, 100]} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="pontuacao" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
