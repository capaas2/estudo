'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock, Send, AlertCircle, Info } from 'lucide-react'

interface Question {
  id: string;
  tipo: 'objetiva' | 'discursiva';
  enunciado: string;
  alternativas?: string[];
  gabarito: string;
  subitens?: { label: string; enunciado: string }[];
}

export default function ExecutarSimuladoPage() {
  const { id } = useParams()
  const router = useRouter()
  const toast = useToast()
  
  const [simulado, setSimulado] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [startTime] = useState(Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function loadSimulado() {
      const { data: s, error: sError } = await supabase
        .from('simulados')
        .select('*, materia:materias(nome)')
        .eq('id', id)
        .single()
      
      if (sError || !s) {
        toast('Simulado não encontrado', 'error')
        return router.push('/simulados')
      }

      const { data: q, error: qError } = await supabase
        .from('questoes')
        .select('*')
        .in('id', s.questao_ids)
      
      if (qError) {
        toast('Erro ao carregar questões', 'error')
      } else {
        // Ordenar conforme questao_ids
        const sorted = s.questao_ids.map((qid: string) => q.find(item => item.id === qid)).filter(Boolean)
        setQuestions(sorted)
      }
      
      setSimulado(s)
      setLoading(false)
    }
    loadSimulado()
  }, [id, router, toast])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [startTime])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  async function handleFinish() {
    if (!confirm('Deseja finalizar o simulado? Todas as respostas serão enviadas.')) return
    
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Salvar cada resposta
      const respostasToInsert = questions.map((q, index) => ({
        simulado_id: id,
        questao_id: q.id,
        user_id: user.id,
        ordem: index,
        resposta_objetiva: q.tipo === 'objetiva' ? answers[q.id] : null,
        respostas_discursivas: q.tipo === 'discursiva' ? (answers[q.id] || []) : null,
        tempo_gasto: 0, // Pode ser implementado por questão se desejar
      }))

      const { error: rError } = await supabase.from('respostas_simulado').insert(respostasToInsert)
      if (rError) throw rError

      // Atualizar simulado
      await supabase.from('simulados').update({
        status: 'finalizado',
        finalizado_em: new Date().toISOString(),
        tempo_total: elapsedTime
      }).eq('id', id)

      toast('Simulado finalizado!', 'success')
      router.push(`/simulados/${id}/resultado`)
    } catch (err: any) {
      toast(err.message || 'Erro ao finalizar simulado', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AppShell><div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div></AppShell>

  return (
    <AppShell showSidebar={false}>
      <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="text-slate-500 font-medium">Simulado</p>
              <h1 className="text-slate-200 font-bold truncate max-w-[200px]">{simulado?.titulo}</h1>
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/[0.03] rounded-full border border-white/5">
              <Clock size={14} className="text-cyan-400" />
              <span className="text-sm font-mono text-cyan-400 tabular-nums">{formatTime(elapsedTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium hidden xs:block">Questão {currentIndex + 1} de {questions.length}</span>
            <button 
              onClick={handleFinish}
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
              Finalizar
            </button>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="h-1 bg-white/5 shrink-0">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div className="max-w-4xl w-full">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 pb-24"
              >
                {/* Question Info */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Questão {currentIndex + 1}</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">{currentQuestion?.tipo}</span>
                </div>

                {/* Enunciado */}
                <div className="text-lg text-slate-200 leading-relaxed font-medium">
                  {currentQuestion?.enunciado}
                </div>

                {/* Resposta */}
                <div className="space-y-4">
                  {currentQuestion?.tipo === 'objetiva' ? (
                    <div className="grid gap-3">
                      {currentQuestion.alternativas?.map((alt, idx) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isSelected = answers[currentQuestion.id] === letter
                        return (
                          <button
                            key={idx}
                            onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.id]: letter }))}
                            className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all group ${isSelected ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/50' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${isSelected ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-500 group-hover:text-slate-300'}`}>
                              {letter}
                            </span>
                            <span className={`pt-1 text-sm ${isSelected ? 'text-slate-100 font-medium' : 'text-slate-400'}`}>{alt}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {currentQuestion.subitens && currentQuestion.subitens.length > 0 ? (
                        currentQuestion.subitens.map((sub, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-cyan-400">{sub.label}</span>
                              <span className="text-sm text-slate-300">{sub.enunciado}</span>
                            </div>
                            <textarea 
                              value={answers[currentQuestion.id]?.[idx] || ''}
                              onChange={e => {
                                const newAnswers = [...(answers[currentQuestion.id] || Array(currentQuestion.subitens!.length).fill(''))]
                                newAnswers[idx] = e.target.value
                                setAnswers(prev => ({ ...prev, [currentQuestion.id]: newAnswers }))
                              }}
                              placeholder="Sua resposta..."
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 min-h-[100px] transition-all"
                            />
                          </div>
                        ))
                      ) : (
                        <textarea 
                          value={answers[currentQuestion.id]?.[0] || ''}
                          onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: [e.target.value] }))}
                          placeholder="Digite sua resposta completa aqui..."
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-6 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 min-h-[250px] transition-all"
                        />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer Navigation */}
        <footer className="h-20 border-t border-white/5 bg-slate-900/80 backdrop-blur-xl px-6 flex items-center justify-center shrink-0">
          <div className="max-w-4xl w-full flex items-center justify-between">
            <button 
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-slate-200 disabled:opacity-20 transition-colors"
            >
              <ChevronLeft size={20} />
              <span className="font-bold">Anterior</span>
            </button>

            <div className="flex gap-1.5 overflow-x-auto px-4 max-w-[200px] xs:max-w-none">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${idx === currentIndex ? 'bg-cyan-500 w-6' : (answers[questions[idx].id] ? 'bg-slate-500' : 'bg-white/10')}`}
                />
              ))}
            </div>

            <button 
              onClick={() => {
                if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1)
                else handleFinish()
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 transition-all border border-white/10"
            >
              <span className="font-bold">{currentIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'}</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </footer>
      </div>
    </AppShell>
  )
}
