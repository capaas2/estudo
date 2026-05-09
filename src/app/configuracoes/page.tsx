'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Settings as SettingsIcon, Bell, Shield, Moon, Sun, Mail, Lock, LogOut } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'

export default function ConfiguracoesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('perfil')
  const addToast = useToast()

  // Form states
  const [nome, setNome] = useState('')
  const [avatar, setAvatar] = useState('')

  useEffect(() => {
    carregarUsuario()
  }, [])

  async function carregarUsuario() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setNome(user.user_metadata?.full_name || '')
        setAvatar(user.user_metadata?.avatar_url || '')
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nome, avatar_url: avatar }
      })
      if (error) throw error
      addToast('Perfil atualizado com sucesso!', 'success')
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-400">Carregando configurações...</div>
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="page-header border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 z-40 p-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <SettingsIcon className="text-violet-500" /> Configurações
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie seu perfil, preferências e segurança da conta.
          </p>
        </div>
      </div>

      <div className="page-body max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Menu Lateral */}
          <div className="w-full md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {[
                { id: 'perfil', label: 'Meu Perfil', icon: User },
                { id: 'preferencias', label: 'Preferências', icon: Sun },
                { id: 'notificacoes', label: 'Notificações', icon: Bell },
                { id: 'seguranca', label: 'Segurança', icon: Shield },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/[0.08] text-white border border-white/[0.06]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <tab.icon size={18} className={activeTab === tab.id ? 'text-violet-400' : 'text-slate-500'} />
                  {tab.label}
                </button>
              ))}

              <div className="pt-6 mt-6 border-t border-white/[0.06]">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  Sair da conta
                </button>
              </div>
            </nav>
          </div>

          {/* Conteúdo */}
          <div className="flex-1">
            {activeTab === 'perfil' && (
              <div className="glass-card p-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">Informações do Perfil</h2>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden border-2 border-white/10">
                    {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : (nome?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-slate-200 font-medium">Foto de Perfil</h3>
                    <p className="text-xs text-slate-500 mt-1">Insira uma URL válida para sua foto de perfil abaixo.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Nome Completo</label>
                    <input 
                      type="text" 
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="input-dark"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail size={16} className="text-slate-500" />
                      </div>
                      <input 
                        type="email" 
                        value={user?.email || ''}
                        disabled
                        className="input-dark pl-10 opacity-70 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">O email não pode ser alterado por aqui.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">URL do Avatar</label>
                    <input 
                      type="text" 
                      value={avatar}
                      onChange={e => setAvatar(e.target.value)}
                      className="input-dark"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="btn-premium py-2 px-6">
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'preferencias' && (
              <div className="glass-card p-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">Preferências de Tema</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-cyan-500/30 bg-cyan-500/5 p-4 rounded-xl flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Moon size={20} className="text-cyan-400" />
                      <span className="text-slate-200 font-medium">Dark Mode (Ativo)</span>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-cyan-500 bg-cyan-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  </div>
                  <div className="border border-white/5 bg-white/[0.02] p-4 rounded-xl flex items-center justify-between cursor-not-allowed opacity-50">
                    <div className="flex items-center gap-3">
                      <Sun size={20} className="text-slate-400" />
                      <span className="text-slate-400 font-medium">Light Mode (Em breve)</span>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-slate-600"></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seguranca' && (
              <div className="glass-card p-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">Segurança</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Para redefinir sua senha, solicite um email de recuperação na tela de login.
                </p>
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock size={20} className="text-slate-400" />
                    <div>
                      <h4 className="text-slate-200 font-medium">Senha</h4>
                      <p className="text-xs text-slate-500">Última alteração não registrada.</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] rounded-lg text-slate-300 transition-colors" disabled>
                    Alterar
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notificacoes' && (
              <div className="glass-card p-8 text-center border-dashed">
                <Bell size={32} className="text-slate-600 mb-4 mx-auto" />
                <h3 className="text-lg font-medium text-slate-200">Notificações em breve</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Em breve você poderá configurar alertas de revisões e metas diretamente por email ou push.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
