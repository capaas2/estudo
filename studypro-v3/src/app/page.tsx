'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { gerarInsightsDashboard } from '@/services/iaService'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, Clock, Award, Target, Brain, BookOpen, GraduationCap,
  ChevronRight, Sparkles, RotateCcw, Calendar, Layers
} from 'lucide-react'

const PERIOD_COLORS = [
  'from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600', 'from-indigo-500 to-blue-600',
  'from-teal-500 to-cyan-600', 'from-fuchsia-500 to-purple-600', 'from-lime-500 to-green-600',
  'from-orange-500 to-red-600', 'from-sky-500 to-indigo-600', 'from-pink-500 to-rose-600',
]

const STATUS_MAP = {
  nao_iniciado: { label: 'Não iniciado', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  em_andamento: { label: 'Em andamento', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  concluido: { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

interface SimuladoData {
  id: string; nota: number; nota_maxima: number; tempo_total: number;
  criado_em: string; materia_id: string; status: string;
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [simulados, setSimulados] = useState<SimuladoData[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [respostas, setRespostas] = useState<{ questao_id: string; esta_correta: boolean }[]>([])
  const [questoes, setQuestoes] = useState<{ id: string; materia_id: string; subtema_id: string }[]>([])
  const [subtemas, setSubtemas] = useState<{ id: string; nome: string }[]>([])
  const [periods, setPeriods] = useState<{ numero: number; nome: string; status: string; progresso: number }[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [insights, setInsights] = useState<Record<string, unknown> | null>(null)
  const [loadingIA, setLoadingIA] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: s }, { data: m }, { data: r }, { data: q }, { data: st }, { data: p }, { data: rv }] = await Promise.all([
      supabase.from('simulados').select('*').eq('status', 'finalizado').order('criado_em'),
      supabase.from('materias').select('id, nome, cor'),
      supabase.from('respostas_simulado').select('questao_id, esta_correta'),
      supabase.from('questoes').select('id, materia_id, subtema_id'),
      supabase.from('subtemas').select('id, nome'),
      supabase.from('periods').select('numero, nome, status, progresso').order('numero'),
      supabase.from('reviews').select('id').eq('status', 'pendente'),
    ])
    setSimulados((s || []) as SimuladoData[])
    setMaterias(m || [])
    setRespostas(r || [])
    setQuestoes(q || [])
    setSubtemas(st || [])
    setPeriods(p || [])
    setReviewCount(rv?.length || 0)
    setLoading(false)
  }

  async function gerarInsights() {
    if (simulados.length === 0) return
    setLoadingIA(true)
    try {
      const erros: Record<string, number> = {}
      respostas.filter(r => !r.esta_correta).forEach(r => {
        const q = questoes.find(x => x.id === r.questao_id)
        if (q) {
          const sub = subtemas.find(s => s.id === q.subtema_id)?.nome || ''
          const mat = materias.find(m => m.id === q.materia_id)?.nome || ''
          const key = `${mat} - ${sub}`
          erros[key] = (erros[key] || 0) + 1
        }
      })
      const errosFreq = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)
      const dados = {
        totalSimulados: simulados.length,
        mediaGeral: simulados.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / simulados.length,
        materias: [...new Set(simulados.map(s => materias.find(m => m.id === s.materia_id)?.nome).filter(Boolean))] as string[],
        ultimosResultados: simulados.slice(-5).map(s => ({
          materia: materias.find(m => m.id === s.materia_id)?.nome || '',
          nota: s.nota_maxima > 0 ? (s.nota / s.nota_maxima * 100) : 0
        })),
        errosFrequentes: errosFreq
      }
      const result = await gerarInsightsDashboard(dados)
      setInsights(result)
    } catch { setInsights({ pontos_fracos: ['Erro ao gerar insights'], tendencia: '', prioridades: [], dica_do_dia: '' }) }
    setLoadingIA(false)
  }

  const totalSims = simulados.length
  const mediaGeral = totalSims > 0 ? simulados.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / totalSims : 0
  const tempoTotal = simulados.reduce((a, s) => a + (s.tempo_total || 0), 0)
  const totalQuestoes = questoes.length

  const dadosEvolucao = simulados.map((s, i) => ({
    nome: `#${i + 1}`, nota: s.nota_maxima > 0 ? +(s.nota / s.nota_maxima * 100).toFixed(1) : 0
  }))

  // Top erros
  const errosPorTema: Record<string, number> = {}
  respostas.filter(r => !r.esta_correta).forEach(r => {
    const q = questoes.find(x => x.id === r.questao_id)
    if (q) {
      const matNome = materias.find(m => m.id === q.materia_id)?.nome || '?'
      const subNome = subtemas.find(s => s.id === q.subtema_id)?.nome || 'Geral'
      const key = `${matNome} › ${subNome}`
      errosPorTema[key] = (errosPorTema[key] || 0) + 1
    }
  })
  const topErros = Object.entries(errosPorTema).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Default 12 periods if none exist
  const displayPeriods = periods.length > 0 ? periods : Array.from({ length: 12 }, (_, i) => ({
    numero: i + 1, nome: `${i + 1}º Período`, status: 'nao_iniciado', progresso: 0
  }))

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

  return (
    <AppShell>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Carregando dashboard...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="page-header">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-slate-500 text-sm mt-0.5">Visão geral do seu desempenho acadêmico</p>
            </div>
            <button
              onClick={gerarInsights}
              disabled={loadingIA || totalSims === 0}
              className="btn-premium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Brain size={16} />
              {loadingIA ? 'Analisando...' : 'Insights IA'}
            </button>
          </div>

          <div className="page-body space-y-8">
            {/* Stats Grid */}
            <motion.div
              variants={container} initial="hidden" animate="show"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {[
                { icon: Award, label: 'Simulados', value: totalSims, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { icon: Target, label: 'Média Geral', value: `${mediaGeral.toFixed(1)}%`, color: mediaGeral >= 60 ? 'text-emerald-400' : 'text-red-400', bg: mediaGeral >= 60 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
                { icon: Clock, label: 'Tempo Estudado', value: `${Math.round(tempoTotal / 3600)}h`, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { icon: BookOpen, label: 'Questões no Banco', value: totalQuestoes, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map((stat, i) => (
                <motion.div key={i} variants={item} className="stat-card">
                  <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <p className={`text-2xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: '/simulados/criar', icon: Sparkles, label: 'Novo Simulado', color: 'text-cyan-400' },
                { href: '/revisoes', icon: RotateCcw, label: `Revisões (${reviewCount})`, color: 'text-amber-400' },
                { href: '/calendario', icon: Calendar, label: 'Calendário', color: 'text-violet-400' },
                { href: '/flashcards', icon: Layers, label: 'Flashcards', color: 'text-emerald-400' },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="glass-card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all group">
                  <a.icon size={18} className={a.color} />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{a.label}</span>
                  <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
              ))}
            </div>

            {/* Charts Row */}
            {totalSims > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={item} initial="hidden" animate="show" className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">📈 Evolução de Notas</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dadosEvolucao}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="nome" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="nota" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} name="Nota (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div variants={item} initial="hidden" animate="show" className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4">🔴 Conteúdos com Mais Erros</h3>
                  {topErros.length > 0 ? (
                    <div className="space-y-2">
                      {topErros.map(([tema, count], i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                          <span className="text-sm text-slate-400">{tema}</span>
                          <span className="badge-sm bg-red-500/10 text-red-400">{count} erros</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-600 text-sm">Nenhum erro registrado.</p>}
                </motion.div>
              </div>
            )}

            {/* Periods Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-200">
                  <GraduationCap size={20} className="inline mr-2 text-cyan-400" />
                  Períodos Acadêmicos
                </h3>
                <Link href="/periodos" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Ver todos →
                </Link>
              </div>
              <motion.div
                variants={container} initial="hidden" animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
              >
                {displayPeriods.map((p, i) => {
                  const statusInfo = STATUS_MAP[p.status as keyof typeof STATUS_MAP] || STATUS_MAP.nao_iniciado
                  return (
                    <motion.div key={p.numero} variants={item}>
                      <Link
                        href={`/periodos/${p.numero}`}
                        className="glass-card group block overflow-hidden hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className={`h-20 bg-gradient-to-br ${PERIOD_COLORS[i % 12]} opacity-80 group-hover:opacity-100 transition-opacity relative`}>
                          <div className="absolute inset-0 bg-black/20" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-black text-white/90">{p.numero}º</span>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-semibold text-slate-300 truncate">{p.nome}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-[0.6rem] font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
                          </div>
                          <div className="w-full h-1 bg-white/[0.04] rounded-full mt-2 overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${PERIOD_COLORS[i % 12]} transition-all duration-500`} style={{ width: `${p.progresso}%` }} />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>

            {/* IA Insights */}
            {insights && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border-l-4 border-violet-500">
                <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Brain size={18} className="text-violet-400" /> Insights da IA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {(insights.pontos_fracos as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-400 mb-2">⚠️ Pontos Fracos</p>
                        <ul className="space-y-1">
                          {(insights.pontos_fracos as string[]).map((p, i) => (
                            <li key={i} className="text-xs text-slate-400 pl-3 border-l-2 border-red-500/20">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights.tendencia && (
                      <div>
                        <p className="text-xs font-semibold text-cyan-400 mb-1">📊 Tendência</p>
                        <p className="text-xs text-slate-400">{insights.tendencia as string}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(insights.prioridades as string[])?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-400 mb-2">🎯 Prioridades</p>
                        <ul className="space-y-1">
                          {(insights.prioridades as string[]).map((p, i) => (
                            <li key={i} className="text-xs text-slate-400 pl-3 border-l-2 border-amber-500/20">{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                {insights.dica_do_dia && (
                  <div className="mt-4 p-3 bg-emerald-500/8 rounded-xl border border-emerald-500/10">
                    <span className="text-xs font-semibold text-emerald-400">💡 Dica do Dia: </span>
                    <span className="text-xs text-slate-400">{insights.dica_do_dia as string}</span>
                  </div>
                )}
              </motion.div>
            )}

            {totalSims === 0 && (
              <div className="text-center py-16">
                <TrendingUp size={48} className="mx-auto text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-300">Comece a estudar!</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">Crie matérias, adicione questões e faça simulados para ver seu progresso.</p>
                <Link href="/simulados/criar" className="btn-premium"><Sparkles size={16} /> Criar Simulado</Link>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  )
}
