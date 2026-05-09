'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import { ChevronLeft, Trophy, Clock, CheckCircle2, XCircle, BarChart3, Info } from 'lucide-react'
import Link from 'next/link'

export default function ResultadoSimuladoPage() {
  const { id } = useParams()
  const router = useRouter()
  const toast = useToast()
  
  const [simulado, setSimulado] = useState<any>(null)
  const [respostas, setRespostas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadResultado() {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.from('simulados').select('*, materia:materias(nome)').eq('id', id).single(),
        supabase.from('respostas_simulado').select('*, questao:questoes(*)').eq('simulado_id', id).order('ordem')
      ])
      
      if (!s) {
        toast('Simulado não encontrado', 'error')
        return router.push('/simulados')
      }

      setSimulado(s)
      setRespostas(r || [])
      setLoading(false)
    }
    loadResultado()
  }, [id, router, toast])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <AppShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div></AppShell>

  const score = respostas.filter(r => r.esta_correta).length
  const total = respostas.length
  const percent = total > 0 ? (score / total * 100).toFixed(1) : '0'

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
        <Link href="/simulados" className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors w-fit">
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">Voltar para Simulados</span>
        </Link>

        {/* Hero Score */}
        <section className="glass-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy size={160} className="text-amber-400 rotate-12" />
          </div>
          
          <div className="p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                <motion.circle 
                  cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={552.92}
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * parseFloat(percent)) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-cyan-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white">{percent}%</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Acertos</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{simulado?.titulo}</h1>
                <p className="text-slate-400 font-medium">{simulado?.materia?.nome}</p>
              </div>
              
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Pontuação</p>
                    <p className="text-lg font-bold text-slate-200">{score} <span className="text-slate-600">/ {total}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo</p>
                    <p className="text-lg font-bold text-slate-200">{formatTime(simulado?.tempo_total || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Question List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Info size={20} className="text-slate-500" />
            Revisão das Questões
          </h2>

          <div className="grid gap-4">
            {respostas.map((r, i) => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-2">
                    <span className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-500">#{i + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{r.questao?.tipo}</span>
                  </div>
                  {r.esta_correta ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <CheckCircle2 size={16} /> Correto
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 text-sm font-bold">
                      <XCircle size={16} /> Incorreto
                    </div>
                  )}
                </div>

                <p className="text-slate-300 font-medium leading-relaxed">{r.questao?.enunciado}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Sua Resposta</p>
                    <p className="text-slate-200">{r.resposta_objetiva || 'Não respondida'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase mb-2">Gabarito</p>
                    <p className="text-emerald-200 font-bold">{r.questao?.gabarito}</p>
                  </div>
                </div>

                {r.questao?.explicacao && (
                  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-sm">
                    <p className="font-bold text-cyan-400 mb-1">Explicação:</p>
                    <p className="text-slate-400 italic">{r.questao.explicacao}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
