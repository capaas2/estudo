'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { account } from '@/lib/appwrite/config'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, LogIn, UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card p-8 flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-white/10 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const queryClient = useQueryClient()

  const { data: user } = useCurrentUser()

  useEffect(() => {
    if (user) {
      router.push(redirectTo)
    }
  }, [user, router, redirectTo])

  const [mode, setMode] = useState<'login' | 'cadastro'>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      try {
        await account.createEmailPasswordSession(email, senha)
      } catch (err: any) {
        // Se houver sessão ativa pendente, deletamos e tentamos novamente
        if (err?.message?.includes('prohibited when a session is active') || err?.code === 400) {
          try {
            await account.deleteSession('current')
          } catch (e) {
            // Ignora erro
          }
          await account.createEmailPasswordSession(email, senha)
        } else {
          throw err
        }
      }

      // Gera um JWT para autenticação SSR no servidor Next.js
      const jwtObj = await account.createJWT()
      const sessionToken = jwtObj.jwt

      // Salva o cookie de sessão via API route
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken }),
      })

      // Invalida a query do usuário para limpar o cache do React Query e carregar os dados corretos
      await queryClient.invalidateQueries({ queryKey: ['current-user'] })

      router.push(redirectTo)
    } catch (err: any) {
      console.error('Erro ao fazer login:', err)
      const errorMsg = err?.message || 'Email ou senha incorretos. Verifique e tente novamente.'
      setError(errorMsg)
      alert('Falha no Login: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await account.create('unique()', email, senha, nome)
      
      try {
        await account.createEmailPasswordSession(email, senha)
      } catch (err: any) {
        if (err?.message?.includes('prohibited when a session is active') || err?.code === 400) {
          try {
            await account.deleteSession('current')
          } catch (e) {
            // Ignora
          }
          await account.createEmailPasswordSession(email, senha)
        } else {
          throw err
        }
      }

      // Gera um JWT para autenticação SSR no servidor Next.js
      const jwtObj = await account.createJWT()
      const sessionToken = jwtObj.jwt

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sessionToken }),
      })

      // Invalida a query do usuário para limpar o cache do React Query e carregar os dados corretos
      await queryClient.invalidateQueries({ queryKey: ['current-user'] })

      router.push('/onboarding')
    } catch (err: any) {
      console.error('Erro ao cadastrar:', err)
      let errorMsg = 'Erro ao criar conta. Verifique os dados e tente novamente.'
      if (err?.message?.includes('already exists') || err?.code === 409) {
        errorMsg = 'Um usuário com este e-mail já está cadastrado. Tente fazer login.'
      }
      setError(errorMsg)
      alert('Falha no Cadastro: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 w-full max-w-md mx-4"
    >
      <div className="glass-card p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/25 animate-pulse-glow">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            StudyPro
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : handleCadastro} className="space-y-4">
          {mode === 'cadastro' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="form-group"
            >
              <label htmlFor="nome" className="form-label">Nome</label>
              <div className="relative">
                <UserPlus size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="form-input pl-10"
                />
              </div>
            </motion.div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="form-input pl-10"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="senha" className="form-label">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="form-input pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-premium w-full"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </>
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'cadastro' : 'login')
              setError('')
            }}
            className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {mode === 'login' ? (
              <>Não tem conta? <span className="font-semibold text-cyan-400">Cadastre-se</span></>
            ) : (
              <>
                <ArrowLeft size={14} className="inline mr-1" />
                Já tem conta? <span className="font-semibold text-cyan-400">Entre</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Version */}
      <p className="text-center text-[0.65rem] text-slate-600 mt-4">StudyPro v4.0</p>
    </motion.div>
  )
}
