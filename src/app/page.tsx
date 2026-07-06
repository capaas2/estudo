'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  GraduationCap, ClipboardList, RotateCcw, Layers,
  Sparkles, TrendingUp, Target, Flame, ChevronRight,
  BookOpen, Brain, Plus, ArrowUpRight, Zap,
} from 'lucide-react'

// Animação stagger para os cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) return <AppShell><PageLoading /></AppShell>

  const nomeUsuario = user?.name || 'Estudante'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <AppShell>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{saudacao}, {nomeUsuario} 👋</h1>
          <p className="page-subtitle">Aqui está o resumo do seu progresso</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/simulados/criar" className="btn-premium text-xs">
            <Plus size={14} />
            Novo Simulado
          </Link>
        </div>
      </div>

      <div className="page-body">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* ============================================ */}
          {/* Stats Row                                    */}
          {/* ============================================ */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<ClipboardList size={20} />}
              label="Simulados"
              value="—"
              subtitle="Carregue dados do Appwrite"
              color="cyan"
            />
            <StatCard
              icon={<RotateCcw size={20} />}
              label="Revisões Pendentes"
              value="—"
              subtitle="Configurar Appwrite"
              color="violet"
            />
            <StatCard
              icon={<Layers size={20} />}
              label="Flashcards"
              value="—"
              subtitle="Configurar Appwrite"
              color="emerald"
            />
            <StatCard
              icon={<Flame size={20} />}
              label="Streak"
              value="—"
              subtitle="dias consecutivos"
              color="amber"
            />
          </motion.div>

          {/* ============================================ */}
          {/* Main Content Grid                           */}
          {/* ============================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Períodos */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              {/* Períodos */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <GraduationCap size={20} className="text-cyan-400" />
                    Meus Períodos
                  </h2>
                  <Link href="/periodos" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1">
                    Ver todos <ChevronRight size={14} />
                  </Link>
                </div>

                <EmptyState
                  icon={GraduationCap}
                  title="Conecte ao Appwrite"
                  description="Configure as credenciais do Appwrite no .env.local para carregar seus períodos e matérias."
                />
              </div>

              {/* Conteúdos com Mais Erros */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Target size={20} className="text-rose-400" />
                    Pontos a Melhorar
                  </h2>
                </div>
                <EmptyState
                  icon={Brain}
                  title="Sem dados ainda"
                  description="Complete simulados para identificar seus pontos fracos."
                />
              </div>
            </motion.div>

            {/* Right Column - Sidebar cards */}
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Quick Actions */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  Ações Rápidas
                </h3>
                <div className="space-y-2">
                  <QuickAction href="/simulados/criar" label="Criar Simulado" icon={<ClipboardList size={16} />} color="cyan" />
                  <QuickAction href="/revisoes" label="Iniciar Revisão" icon={<RotateCcw size={16} />} color="violet" />
                  <QuickAction href="/flashcards" label="Revisar Flashcards" icon={<Layers size={16} />} color="emerald" />
                  <QuickAction href="/questoes" label="Banco de Questões" icon={<BookOpen size={16} />} color="amber" />
                  <QuickAction href="/copiloto" label="Perguntar à IA" icon={<Sparkles size={16} />} color="rose" />
                </div>
              </div>

              {/* Insights IA */}
              <div className="glass-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-violet-500/[0.08] to-transparent rounded-full blur-2xl pointer-events-none" />
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-400" />
                  Insights IA
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-xs text-slate-400">
                      Configure o Appwrite e complete atividades para receber insights personalizados da IA.
                    </p>
                  </div>
                </div>
              </div>

              {/* Metas */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  Metas da Semana
                </h3>
                <EmptyState
                  icon={Target}
                  title="Sem metas"
                  description="Defina metas em Configurações."
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}

// ============================================================
// Sub-componentes
// ============================================================

function StatCard({ icon, label, value, subtitle, color }: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle: string
  color: 'cyan' | 'violet' | 'emerald' | 'amber'
}) {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      <p className="text-[0.65rem] text-slate-600 mt-1">{subtitle}</p>
    </div>
  )
}

function QuickAction({ href, label, icon, color }: {
  href: string
  label: string
  icon: React.ReactNode
  color: string
}) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors flex-1">{label}</span>
      <ArrowUpRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
    </Link>
  )
}
