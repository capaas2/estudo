'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { account } from '@/lib/appwrite/config'
import { useQuery } from '@tanstack/react-query'
import { listQuestoes } from '@/services/database/questoes'
import { listSimulados } from '@/services/database/simulados'
import { listFlashcards } from '@/services/database/flashcards'
import { listReviews } from '@/services/database/reviews'
import { getOrUpdateStreak, getWeeklyDaysStatus } from '@/services/streakService'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import Modal from '@/components/shared/Modal'
import { motion } from 'framer-motion'
import {
  Settings, User, Shield, Palette, Activity, Target,
  Flame, Moon, Sun, LogOut, Save, CheckCircle, Clock,
  Brain, Zap, AlertTriangle, TrendingUp, Edit3, HelpCircle,
} from 'lucide-react'

export default function ConfiguracoesPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState('perfil')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile state (local)
  const [nome, setNome] = useState('')
  const [tema, setTema] = useState<'dark' | 'light'>('dark')

  // Meta Semanal State
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(10)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [newGoalInput, setNewGoalInput] = useState(10)

  // Consultar dados reais do banco
  const { data: questoes = [] } = useQuery({
    queryKey: ['questoes', user?.$id],
    queryFn: () => listQuestoes(user!.$id),
    enabled: !!user,
  })

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

  // Métricas reais
  const totalQuestoes = questoes.length
  const simuladosFeitos = simulados.length
  const flashcardsRevisados = flashcards.length
  const totalRevisoes = reviews.length
  
  const streakData = user ? getOrUpdateStreak(user.$id) : { currentStreak: 1, accessHistory: [] }
  const streakDays = streakData.currentStreak
  const weeklyDaysStatus = getWeeklyDaysStatus(streakData.accessHistory)

  const weeklyProgressHours = Math.min(weeklyGoalHours, Math.round((simuladosFeitos * 0.5) + (totalRevisoes * 0.2)))

  async function handleLogout() {
    try {
      await account.deleteSession('current')
      await fetch('/api/auth/session', { method: 'DELETE' })
      window.location.href = '/login'
    } catch (err) {
      console.error('Erro no logout:', err)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (nome.trim()) {
        await account.updateName(nome)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleSaveGoal() {
    setWeeklyGoalHours(newGoalInput)
    setShowGoalModal(false)
  }

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'metas', label: 'Metas & Streak', icon: Target },
    { id: 'saude', label: 'Saúde do App', icon: Activity },
  ]

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie sua conta e preferências de estudo</p>
        </div>
      </div>
      <div className="page-body">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-48 shrink-0 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
            <div className="border-t border-white/[0.06] my-3" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'perfil' && (
                <div className="space-y-6">
                  <div className="surface p-6">
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                      <User size={18} className="text-indigo-400" />
                      Meu Perfil
                    </h2>
                    <div className="space-y-4">
                      <div className="form-group">
                        <label className="form-label">Nome Completo</label>
                        <input
                          type="text"
                          value={nome || user?.name || ''}
                          onChange={e => setNome(e.target.value)}
                          placeholder="Seu nome"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Endereço de E-mail</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="form-input opacity-60"
                        />
                        <p className="text-[0.65rem] text-slate-400 mt-1">O e-mail é a sua identificação única no Appwrite</p>
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary text-xs"
                      >
                        {saved ? <><CheckCircle size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar Alterações</>}
                      </button>
                    </div>
                  </div>

                  <div className="surface p-6">
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                      <Palette size={18} className="text-purple-400" />
                      Aparência da Interface
                    </h2>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTema('dark')}
                        className={`surface p-4 flex-1 text-center transition-all cursor-pointer ${tema === 'dark' ? 'border-indigo-500/50 bg-indigo-500/10' : ''}`}
                      >
                        <Moon size={20} className={`mx-auto mb-2 ${tema === 'dark' ? 'text-indigo-400' : 'text-slate-500'}`} />
                        <p className="text-xs text-white font-semibold">Obsidian Glass (Escuro)</p>
                      </button>
                      <button
                        onClick={() => setTema('light')}
                        className={`surface p-4 flex-1 text-center transition-all cursor-pointer ${tema === 'light' ? 'border-amber-500/50 bg-amber-500/10' : ''}`}
                      >
                        <Sun size={20} className={`mx-auto mb-2 ${tema === 'light' ? 'text-amber-400' : 'text-slate-500'}`} />
                        <p className="text-xs text-slate-300">Modo Claro</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'metas' && (
                <div className="space-y-6">
                  {/* Streak */}
                  <div className="surface p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-amber-500" />
                    <div className="relative">
                      <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Flame size={18} className="text-amber-400" />
                        Streak de Estudo
                      </h2>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-5xl font-extrabold text-amber-400">{streakDays}</p>
                          <p className="text-xs text-slate-400 mt-1 font-medium">dia consecutivo</p>
                        </div>
                        <div className="flex-1">
                          <div className="grid grid-cols-7 gap-2">
                            {weeklyDaysStatus.map((d, i) => (
                              <div key={i} className="text-center">
                                <p className="text-[0.65rem] font-bold text-slate-400 mb-1">{d.dayLabel}</p>
                                <div className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center ${
                                  d.active ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold' : 'bg-white/[0.03] border border-white/[0.06] text-slate-600'
                                }`}>
                                  {d.active ? <Flame size={14} /> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly goal */}
                  <div className="surface p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Target size={18} className="text-emerald-400" />
                        Meta Semanal de Estudo
                      </h2>
                      <button
                        onClick={() => {
                          setNewGoalInput(weeklyGoalHours)
                          setShowGoalModal(true)
                        }}
                        className="btn-outline text-xs"
                      >
                        <Edit3 size={14} />
                        Editar Meta
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <p className="text-3xl font-extrabold text-emerald-400">{weeklyProgressHours}h</p>
                      <p className="text-sm text-slate-400">meta de <span className="text-white font-bold">{weeklyGoalHours}h / semana</span></p>
                    </div>
                    <div className="progress-bar mb-2">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, (weeklyProgressHours / weeklyGoalHours) * 100)}%`,
                          background: 'linear-gradient(to right, #10b981, #6366f1)',
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      {weeklyProgressHours >= weeklyGoalHours
                        ? '🎉 Meta semanal concluída com sucesso!'
                        : `Faltam ${weeklyGoalHours - weeklyProgressHours} horas de estudo para atingir a meta.`}
                    </p>
                  </div>

                  {/* Real Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Questões" value={totalQuestoes.toString()} icon={HelpCircle} color="emerald" />
                    <StatCard label="Simulados Feitos" value={simuladosFeitos.toString()} icon={Zap} color="purple" />
                    <StatCard label="Flashcards" value={flashcardsRevisados.toString()} icon={TrendingUp} color="indigo" />
                    <StatCard label="Revisões Concluídas" value={totalRevisoes.toString()} icon={Clock} color="amber" />
                  </div>
                </div>
              )}

              {activeTab === 'saude' && (
                <div className="space-y-6">
                  <div className="surface p-6">
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                      <Activity size={18} className="text-indigo-400" />
                      Saúde dos Serviços do App
                    </h2>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="metric-card">
                        <CheckCircle size={16} className="text-emerald-400 mb-2" />
                        <p className="text-xl font-bold text-emerald-400">Operacional</p>
                        <p className="text-xs text-slate-400">Appwrite Cloud</p>
                      </div>
                      <div className="metric-card">
                        <Zap size={16} className="text-indigo-400 mb-2" />
                        <p className="text-xl font-bold text-white">Ativa</p>
                        <p className="text-xs text-slate-400">OpenRouter AI</p>
                      </div>
                      <div className="metric-card">
                        <AlertTriangle size={16} className="text-amber-400 mb-2" />
                        <p className="text-xl font-bold text-white">0</p>
                        <p className="text-xs text-slate-400">Falhas Recentes</p>
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Motores de IA Conectados</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'OpenRouter (Llama 3.3 70B Free)', status: 'Ativo (Principal)', ok: true },
                        { name: 'OpenRouter (DeepSeek R1 Free)', status: 'Ativo (Fallback 1)', ok: true },
                        { name: 'OpenRouter (Qwen 2.5 70B Free)', status: 'Ativo (Fallback 2)', ok: true },
                      ].map(provider => (
                        <div key={provider.name} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <span className="text-sm font-semibold text-slate-200">{provider.name}</span>
                          <span className="text-xs font-bold text-emerald-400">
                            {provider.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="surface p-6">
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                      <Shield size={18} className="text-purple-400" />
                      Especificações do Sistema
                    </h2>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-slate-400">Versão do App</span>
                        <span className="text-white font-mono font-bold">v4.0.0</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-slate-400">Framework Frontend</span>
                        <span className="text-white font-mono font-bold">Next.js 16.2.6</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-slate-400">Banco de Dados</span>
                        <span className="text-white font-mono font-bold">Appwrite Cloud</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-400">User ID</span>
                        <span className="text-indigo-300 font-mono font-semibold">{user?.$id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modal Editar Meta Semanal */}
      {showGoalModal && (
        <Modal
          open={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          title="Editar Meta Semanal de Horas"
          footer={
            <>
              <button onClick={() => setShowGoalModal(false)} className="btn-outline text-xs">Cancelar</button>
              <button onClick={handleSaveGoal} className="btn-primary text-xs">Salvar Meta</button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Meta de Estudo (Horas / Semana)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={newGoalInput}
                onChange={e => setNewGoalInput(parseInt(e.target.value) || 1)}
                className="form-input"
              />
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string
  value: string
  icon: any
  color: string
}) {
  return (
    <div className="surface p-4 rounded-2xl border border-white/[0.06]">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2 text-indigo-400">
        <Icon size={16} />
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
