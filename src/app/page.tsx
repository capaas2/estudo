'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listPeriods } from '@/services/database/periods'
import { listSimulados } from '@/services/database/simulados'
import { listReviews } from '@/services/database/reviews'
import { listFlashcards } from '@/services/database/flashcards'
import { listQuestoes } from '@/services/database/questoes'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap, ClipboardList, RotateCcw, Layers,
  Sparkles, TrendingUp, Flame, ChevronRight,
  BookOpen, Brain, Plus, ArrowUpRight, Award, HelpCircle,
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', user?.$id],
    queryFn: () => listPeriods(user!.$id),
    enabled: !!user,
  })

  const { data: simulados = [] } = useQuery({
    queryKey: ['simulados', user?.$id],
    queryFn: () => listSimulados(user!.$id),
    enabled: !!user,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', user?.$id],
    queryFn: () => listReviews(user!.$id),
    enabled: !!user,
  })

  const { data: flashcards = [] } = useQuery({
    queryKey: ['flashcards', user?.$id],
    queryFn: () => listFlashcards(user!.$id),
    enabled: !!user,
  })

  const { data: questoes = [] } = useQuery({
    queryKey: ['questoes', user?.$id],
    queryFn: () => listQuestoes(user!.$id),
    enabled: !!user,
  })

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  const nomeUsuario = user?.name || 'Estudante'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const simuladosConcluidos = simulados.filter(s => s.status === 'finalizado')
  const revisoesPendentes = reviews.filter(r => r.status === 'pendente').length
  const totalFlashcards = flashcards.length
  const totalQuestoes = questoes.length

  // Média geral REAL
  const temSimuladosConcluidos = simuladosConcluidos.length > 0
  const mediaNotasCalculada = temSimuladosConcluidos
    ? Math.round(simuladosConcluidos.reduce((acc, curr) => {
        const taxa = curr.nota_maxima ? ((curr.nota || 0) / curr.nota_maxima) * 100 : 0
        return acc + taxa
      }, 0) / simuladosConcluidos.length)
    : 0

  // Dados para gráfico Recharts APENAS REAIS
  const chartData = simuladosConcluidos.slice(-6).map((s, idx) => ({
    name: s.titulo.length > 12 ? `${s.titulo.slice(0, 12)}...` : s.titulo || `Simulado ${idx + 1}`,
    taxa: s.nota_maxima && s.nota_maxima > 0 ? Math.round(((s.nota || 0) / s.nota_maxima) * 100) : 0,
  }))

  return (
    <AppShell>
      <div className="page-body space-y-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* HERO & QUICK METRICS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Hero Banner */}
            <motion.div variants={itemVariants} className="lg:col-span-7 surface p-6 relative overflow-hidden flex flex-col justify-between min-h-[200px]">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
                  <Sparkles size={12} />
                  <span>Painel Inteligente de Medicina</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {saudacao}, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{nomeUsuario}</span> 👋
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-md">
                  {revisoesPendentes > 0 ? (
                    <>Você tem <strong className="text-indigo-300 font-semibold">{revisoesPendentes} revisões pendentes</strong> na sua fila FSRS hoje.</>
                  ) : (
                    <>Sua fila de revisões FSRS está em dia. Continue acompanhando suas matérias!</>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-6">
                <Link href="/revisoes" className="btn-primary text-xs">
                  <RotateCcw size={14} />
                  Iniciar Revisões ({revisoesPendentes})
                </Link>
                <Link href="/questoes" className="btn-outline text-xs">
                  <Plus size={14} />
                  Praticar Questões ({totalQuestoes})
                </Link>
              </div>
            </motion.div>

            {/* Metrics Bento Grid */}
            <motion.div variants={itemVariants} className="lg:col-span-5 grid grid-cols-2 gap-4">
              <MetricCard
                icon={<Award size={18} className="text-indigo-400" />}
                label="Média Geral"
                value={temSimuladosConcluidos ? `${mediaNotasCalculada}%` : '--'}
                subtitle={temSimuladosConcluidos ? 'Média de simulados' : 'Sem simulados'}
                color="indigo"
              />
              <MetricCard
                icon={<ClipboardList size={18} className="text-purple-400" />}
                label="Simulados"
                value={simulados.length.toString()}
                subtitle={`${simuladosConcluidos.length} concluídos`}
                color="purple"
              />
              <MetricCard
                icon={<HelpCircle size={18} className="text-emerald-400" />}
                label="Questões"
                value={totalQuestoes.toString()}
                subtitle="Acervo de questões"
                color="emerald"
              />
              <MetricCard
                icon={<Flame size={18} className="text-amber-400" />}
                label="Streak"
                value="1"
                subtitle="dia consecutivo"
                color="amber"
              />
            </motion.div>
          </div>

          {/* MAIN BENTO GRID BODY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Gráfico de Evolução + Períodos */}
            <motion.div variants={itemVariants} className="lg:col-span-8 space-y-6">
              {/* Gráfico de Evolução */}
              <div className="surface p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-indigo-400" />
                      Evolução de Rendimento (%)
                    </h2>
                    <p className="text-xs text-slate-400">Histórico de notas em simulados concluídos</p>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="Nenhum simulado finalizado"
                    description="Realize e finalize simulados na aba Questões & Simulados para acompanhar sua evolução gráfica."
                    action={{ label: 'Ver Simulados', onClick: () => window.location.href = '/questoes' }}
                  />
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="taxa" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Meus Períodos */}
              <div className="surface p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <GraduationCap size={18} className="text-indigo-400" />
                      Meus Períodos de Medicina
                    </h2>
                    <p className="text-xs text-slate-400">Progresso geral por semestre</p>
                  </div>
                  <Link href="/periodos" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold">
                    Ver todos ({periods.length}) <ChevronRight size={14} />
                  </Link>
                </div>

                {periods.length === 0 ? (
                  <EmptyState
                    icon={GraduationCap}
                    title="Nenhum período cadastrado"
                    description="Acesse a página de estudos para importar a matriz curricular completa de Medicina."
                    action={{ label: 'Ver Grade Curricular', onClick: () => window.location.href = '/periodos' }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {periods.slice(0, 4).map(p => (
                      <Link key={p.$id} href={`/periodos/${p.$id}`} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all block group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">{p.nome}</span>
                          <span className="text-xs font-bold text-indigo-400">{p.progresso || 0}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${p.progresso || 0}%` }} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right Column (4 cols): Insights IA & Ações Rápidas */}
            <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
              {/* Insights IA */}
              <div className="surface p-5 relative overflow-hidden border border-indigo-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                    Insights do Copiloto IA
                  </h3>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-slate-300 text-xs space-y-2">
                  <p className="font-semibold text-indigo-200">💡 Status da Sua Matriz:</p>
                  <p className="leading-relaxed text-slate-300">
                    Você possui <strong>{periods.length} períodos</strong> cadastrados e <strong>{totalQuestoes} questões</strong> no seu acervo.
                    {revisoesPendentes > 0 ? ' Conclua as revisões pendentes para impulsionar a retenção em Medicina!' : ' Sua rotina está organizada.'}
                  </p>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="surface p-5">
                <h3 className="text-sm font-bold text-white mb-3">Ações Rápidas</h3>
                <div className="space-y-1.5">
                  <QuickAction href="/revisoes" label="Fila de Revisão FSRS" icon={<RotateCcw size={15} />} color="indigo" />
                  <QuickAction href="/questoes" label="Banco de Questões" icon={<BookOpen size={15} />} color="purple" />
                  <QuickAction href="/periodos" label="Grade de Medicina" icon={<GraduationCap size={15} />} color="emerald" />
                  <QuickAction href="/copiloto" label="Consultar Copiloto IA" icon={<Sparkles size={15} />} color="amber" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}

function MetricCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle: string
  color: 'indigo' | 'purple' | 'emerald' | 'amber'
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
      <p className="text-[0.65rem] text-slate-500 mt-1">{subtitle}</p>
    </div>
  )
}

function QuickAction({ href, label, icon, color }: {
  href: string
  label: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.05] transition-all group border border-transparent hover:border-white/[0.08]"
    >
      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors flex-1">{label}</span>
      <ArrowUpRight size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
    </Link>
  )
}
