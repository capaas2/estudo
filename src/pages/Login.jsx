import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Mail, Lock, User, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login, cadastrar } = useAuth()
  const [modo, setModo] = useState('login') // 'login' ou 'cadastro'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setLoading(true)

    try {
      if (modo === 'login') {
        await login(email, senha)
      } else {
        if (!nome.trim()) { setErro('Informe seu nome'); setLoading(false); return }
        if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres'); setLoading(false); return }
        await cadastrar(email, senha, nome)
        setSucesso('Conta criada! Verifique seu email para confirmar ou faça login.')
        setModo('login')
      }
    } catch (err) {
      const msg = err.message
      if (msg.includes('Invalid login')) setErro('Email ou senha incorretos')
      else if (msg.includes('already registered')) setErro('Este email já está cadastrado')
      else if (msg.includes('valid email')) setErro('Email inválido')
      else setErro(msg)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)',
      padding: 20,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--bg-secondary, #1a1f2e)',
        borderRadius: 16,
        padding: '40px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
          }}>
            <GraduationCap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>StudyPro</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 6 }}>
            {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta gratuita'}
          </p>
        </div>

        {/* Toggle Login/Cadastro */}
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'rgba(255,255,255,0.04)', borderRadius: 10,
          marginBottom: 24,
        }}>
          <button
            type="button"
            onClick={() => { setModo('login'); setErro(''); setSucesso('') }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderRadius: 8,
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
              background: modo === 'login' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
              color: modo === 'login' ? 'white' : '#64748b',
            }}
          >
            <LogIn size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setModo('cadastro'); setErro(''); setSucesso('') }}
            style={{
              flex: 1, padding: '10px 0', border: 'none', borderRadius: 8,
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
              background: modo === 'cadastro' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent',
              color: modo === 'cadastro' ? 'white' : '#64748b',
            }}
          >
            <UserPlus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Criar Conta
          </button>
        </div>

        {/* Mensagens */}
        {erro && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: '0.85rem',
          }}>{erro}</div>
        )}
        {sucesso && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#4ade80', fontSize: '0.85rem',
          }}>{sucesso}</div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          {modo === 'cadastro' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Nome</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  style={{
                    width: '100%', padding: '12px 14px 12px 38px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                    transition: 'border-color 0.2s', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#06b6d4'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: '100%', padding: '12px 14px 12px 38px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#06b6d4'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder={modo === 'cadastro' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                required
                style={{
                  width: '100%', padding: '12px 42px 12px 38px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                  color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                  transition: 'border-color 0.2s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#06b6d4'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              }}>
                {mostrarSenha
                  ? <EyeOff size={16} color="#64748b" />
                  : <Eye size={16} color="#64748b" />
                }
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px 0', border: 'none', borderRadius: 10,
            fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            background: modo === 'login'
              ? 'linear-gradient(135deg, #06b6d4, #0891b2)'
              : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: 'white',
            boxShadow: modo === 'login'
              ? '0 4px 16px rgba(6,182,212,0.3)'
              : '0 4px 16px rgba(139,92,246,0.3)',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading
              ? 'Aguarde...'
              : modo === 'login' ? 'Entrar' : 'Criar Conta'
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem', marginTop: 24 }}>
          Plataforma de estudos inteligente com IA
        </p>
      </div>
    </div>
  )
}
