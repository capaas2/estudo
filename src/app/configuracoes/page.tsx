'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { account } from '@/lib/appwrite/config'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  Settings, User, Shield, Palette, Activity, Target,
  Flame, Moon, Sun, LogOut, Save, CheckCircle, Clock,
  Brain, Zap, AlertTriangle, TrendingUp,
} from 'lucide-react'

export default function ConfiguracoesPage() {
  const { data: user, isLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState('perfil')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile state (local)
  const [nome, setNome] = useState('')
  const [tema, setTema] = useState<'dark' | 'light'>('dark')

  // Streak (placeholder)
  const streakDays = 0
  const weeklyGoal = 10
  const weeklyProgress = 0

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

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'metas', label: 'Metas & Streak', icon: Target },
    { id: 'saude', label: 'Saúde do App', icon: Activity },
  ]

  if (isLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gerencie sua conta e preferências</p>
        </div>
      </div>
      <div className="page-body">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 shrink-0 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/[0.06] text-cyan-400 font-medium'
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
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <LogOut size={16} />
              Sair
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
                  <div className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <User size={16} className="text-cyan-400" />
                      Perfil
                    </h2>
                    <div className="space-y-4">
                      <div className="form-group">
                        <label className="form-label">Nome</label>
                        <input
                          type="text"
                          value={nome || user?.name || ''}
                          onChange={e => setNome(e.target.value)}
                          placeholder="Seu nome"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="form-input opacity-60"
                        />
                        <p className="text-[0.6rem] text-slate-600 mt-1">O email não pode ser alterado aqui</p>
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-premium text-xs"
                      >
                        {saved ? <><CheckCircle size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar</>}
                      </button>
                    </div>
                  </div>

                  <div className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Palette size={16} className="text-violet-400" />
                      Aparência
                    </h2>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTema('dark')}
                        className={`glass-card p-4 flex-1 text-center transition-all ${tema === 'dark' ? 'border-cyan-500/30 bg-cyan-500/5' : ''}`}
                      >
                        <Moon size={20} className={`mx-auto mb-2 ${tema === 'dark' ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <p className="text-xs text-slate-300">Dark</p>
                      </button>
                      <button
                        onClick={() => setTema('light')}
                        className={`glass-card p-4 flex-1 text-center transition-all ${tema === 'light' ? 'border-amber-500/30 bg-amber-500/5' : ''}`}
                      >
                        <Sun size={20} className={`mx-auto mb-2 ${tema === 'light' ? 'text-amber-400' : 'text-slate-500'}`} />
                        <p className="text-xs text-slate-300">Light</p>
                      </button>
                    </div>
                    <p className="text-[0.65rem] text-slate-600 mt-2">Tema light será implementado em breve</p>
                  </div>
                </div>
              )}

              {activeTab === 'metas' && (
                <div className="space-y-6">
                  {/* Streak */}
                  <div className="glass-card p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none bg-orange-500" />
                    <div className="relative">
                      <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                        <Flame size={16} className="text-orange-400" />
                        Streak de Estudo
                      </h2>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-5xl font-black text-orange-400">{streakDays}</p>
                          <p className="text-xs text-slate-400 mt-1">dias seguidos</p>
                        </div>
                        <div className="flex-1">
                          <div className="grid grid-cols-7 gap-1.5">
                            {Array.from({ length: 7 }, (_, i) => (
                              <div key={i} className="text-center">
                                <p className="text-[0.55rem] text-slate-600 mb-1">
                                  {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}
                                </p>
                                <div className={`w-6 h-6 rounded-md mx-auto ${
                                  i < streakDays ? 'bg-orange-500/30 border border-orange-500/40' : 'bg-white/[0.04] border border-white/[0.06]'
                                }`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly goal */}
                  <div className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Target size={16} className="text-emerald-400" />
                      Meta Semanal
                    </h2>
                    <div className="flex items-center gap-4 mb-3">
                      <p className="text-3xl font-bold text-emerald-400">{weeklyProgress}</p>
                      <p className="text-sm text-slate-400">de <span className="text-slate-300 font-semibold">{weeklyGoal}h</span></p>
                    </div>
                    <div className="progress-bar mb-2">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(100, (weeklyProgress / weeklyGoal) * 100)}%`, background: 'linear-gradient(to right, #10b981, #06b6d4)' }} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {weeklyProgress >= weeklyGoal ? '🎉 Meta atingida!' : `Faltam ${weeklyGoal - weeklyProgress}h para a meta`}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Questões', value: '—', icon: Brain, color: 'cyan' },
                      { label: 'Simulados Feitos', value: '—', icon: Zap, color: 'violet' },
                      { label: 'Flashcards Revisados', value: '—', icon: TrendingUp, color: 'emerald' },
                      { label: 'Horas Totais', value: '—', icon: Clock, color: 'amber' },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="stat-card"
                      >
                        <stat.icon size={16} className={`text-${stat.color}-400 mb-2`} />
                        <p className="text-xl font-bold text-slate-100">{stat.value}</p>
                        <p className="text-xs text-slate-500">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'saude' && (
                <div className="space-y-6">
                  <div className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Activity size={16} className="text-cyan-400" />
                      Saúde do App
                    </h2>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="stat-card">
                        <CheckCircle size={16} className="text-emerald-400 mb-2" />
                        <p className="text-xl font-bold text-emerald-400">Online</p>
                        <p className="text-xs text-slate-500">Status</p>
                      </div>
                      <div className="stat-card">
                        <Zap size={16} className="text-cyan-400 mb-2" />
                        <p className="text-xl font-bold text-slate-100">—</p>
                        <p className="text-xs text-slate-500">Latência IA</p>
                      </div>
                      <div className="stat-card">
                        <AlertTriangle size={16} className="text-amber-400 mb-2" />
                        <p className="text-xl font-bold text-slate-100">0</p>
                        <p className="text-xs text-slate-500">Erros Recentes</p>
                      </div>
                    </div>

                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Provedores de IA</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'Gemini API', status: process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'Configurado' : 'Não configurado', ok: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY },
                        { name: 'OpenRouter', status: 'Fallback', ok: true },
                        { name: 'Embeddings', status: 'text-embedding-004', ok: true },
                      ].map(provider => (
                        <div key={provider.name} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02]">
                          <span className="text-sm text-slate-300">{provider.name}</span>
                          <span className={`text-xs font-medium ${provider.ok ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {provider.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-6">
                    <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <Shield size={16} className="text-violet-400" />
                      Informações do Sistema
                    </h2>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-slate-500">Versão</span>
                        <span className="text-slate-300 font-mono">4.0.0</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-slate-500">Framework</span>
                        <span className="text-slate-300 font-mono">Next.js 16.2.6</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/[0.04]">
                        <span className="text-slate-500">Backend</span>
                        <span className="text-slate-300 font-mono">Appwrite v26</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">User ID</span>
                        <span className="text-slate-300 font-mono">{user?.$id?.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
