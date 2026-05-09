'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { BarChart3, TrendingUp, Target, Clock, Brain, Award } from 'lucide-react'

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [simulados, setSimulados] = useState<{ nota: number; nota_maxima: number; materia_id: string; tempo_total: number; criado_em: string }[]>([])
  const [respostas, setRespostas] = useState<{ questao_id: string; esta_correta: boolean; tempo_gasto: number }[]>([])
  const [questoes, setQuestoes] = useState<{ id: string; materia_id: string; subtema_id: string }[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string; cor?: string }[]>([])
  const [subtemas, setSubtemas] = useState<{ id: string; nome: string }[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: r }, { data: q }, { data: m }, { data: st }] = await Promise.all([
      supabase.from('simulados').select('nota, nota_maxima, materia_id, tempo_total, criado_em').eq('status', 'finalizado').order('criado_em'),
      supabase.from('respostas_simulado').select('questao_id, esta_correta, tempo_gasto'),
      supabase.from('questoes').select('id, materia_id, subtema_id'),
      supabase.from('materias').select('id, nome, cor'),
      supabase.from('subtemas').select('id, nome'),
    ])
    setSimulados(s || []); setRespostas(r || []); setQuestoes(q || [])
    setMaterias(m || []); setSubtemas(st || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Derived data
  const totalSims = simulados.length
  const mediaGeral = totalSims > 0 ? simulados.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / totalSims : 0
  const totalRespostas = respostas.length
  const totalAcertos = respostas.filter(r => r.esta_correta).length
  const taxaAcerto = totalRespostas > 0 ? (totalAcertos / totalRespostas * 100) : 0

  // Evolução
  const evolucao = simulados.map((s, i) => ({
    nome: `#${i + 1}`, nota: s.nota_maxima > 0 ? +(s.nota / s.nota_maxima * 100).toFixed(1) : 0
  }))

  // Por matéria
  const porMateria = materias.map(m => {
    const sims = simulados.filter(s => s.materia_id === m.id)
    const media = sims.length > 0 ? sims.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / sims.length : 0
    return { nome: m.nome, media: +media.toFixed(1), total: sims.length, cor: m.cor || '#06b6d4' }
  }).filter(m => m.total > 0).sort((a, b) => b.media - a.media)

  // Erros por tema
  const errosTema: Record<string, { acertos: number; total: number }> = {}
  respostas.forEach(r => {
    const q = questoes.find(x => x.id === r.questao_id)
    if (q) {
      const sub = subtemas.find(s => s.id === q.subtema_id)?.nome || 'Geral'
      if (!errosTema[sub]) errosTema[sub] = { acertos: 0, total: 0 }
      errosTema[sub].total++
      if (r.esta_correta) errosTema[sub].acertos++
    }
  })
  const radarData = Object.entries(errosTema)
    .map(([tema, d]) => ({ tema, acerto: +(d.acertos / d.total * 100).toFixed(1) }))
    .sort((a, b) => a.acerto - b.acerto).slice(0, 8)

  // Distribuição acertos/erros
  const pieData = [
    { name: 'Acertos', value: totalAcertos },
    { name: 'Erros', value: totalRespostas - totalAcertos },
  ]

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Avançado</h2>
          <p className="text-slate-500 text-sm mt-0.5">Análise detalhada do seu desempenho acadêmico</p>
        </div>
      </div>

      <div className="page-body space-y-8">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
        ) : totalSims === 0 ? (
          <div className="text-center py-16">
            <BarChart3 size={48} className="mx-auto text-slate-700 mb-3" />
            <h3 className="text-lg font-semibold text-slate-300">Sem dados ainda</h3>
            <p className="text-sm text-slate-500 mt-1">Finalize simulados para ver seu analytics.</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Award, label: 'Simulados', value: totalSims, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { icon: Target, label: 'Média Geral', value: `${mediaGeral.toFixed(1)}%`, color: mediaGeral >= 60 ? 'text-emerald-400' : 'text-red-400', bg: mediaGeral >= 60 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
                { icon: TrendingUp, label: 'Taxa de Acerto', value: `${taxaAcerto.toFixed(1)}%`, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { icon: Clock, label: 'Questões Respondidas', value: totalRespostas, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((stat, i) => (
                <div key={i} className="stat-card">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                  <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Evolução de Desempenho</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={evolucao}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="nome" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="nota" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 4 }} name="Nota (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">📊 Desempenho por Matéria</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={porMateria} layout="vertical">
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="nome" type="category" stroke="#64748b" fontSize={10} width={100} />
                    <Tooltip />
                    <Bar dataKey="media" name="Média (%)" radius={[0, 6, 6, 0]}>
                      {porMateria.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">🎯 Acertos vs Erros</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {radarData.length >= 3 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">🕸️ Mapa de Conhecimento</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="tema" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Radar name="Acerto %" dataKey="acerto" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
