'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/shared/Toast'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, Eye, EyeOff, User, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, cadastrar } = useAuth()
  const toast = useToast()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha) return toast('Preencha todos os campos.', 'error')
    if (!isLogin && !nome) return toast('Informe seu nome.', 'error')

    setLoading(true)
    try {
      if (isLogin) {
        await login(email, senha)
        toast('Bem-vindo de volta! 🎉', 'success')
      } else {
        await cadastrar(email, senha, nome)
        toast('Conta criada com sucesso! 🎉', 'success')
      }
      router.push('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      toast(msg, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/20">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            StudyPro
          </h1>
          <p className="text-slate-500 text-sm mt-1">Plataforma Acadêmica de Medicina</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 shadow-2xl">
          <div className="flex mb-6 bg-white/[0.03] p-1 rounded-xl gap-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-violet-500/15 text-violet-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)}
                  className="input-dark pl-11"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)}
                className="input-dark pl-11"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPass ? 'text' : 'password'} placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)}
                className="input-dark pl-11 pr-11"
              />
              <button
                type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="submit" disabled={loading}
              className="btn-premium w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} />
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[0.65rem] text-slate-600 text-center mt-6">StudyPro v3.0 — Feito para estudantes de Medicina</p>
      </motion.div>
    </div>
  )
}
