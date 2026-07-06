'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSimulado, updateSimulado, createResposta } from '@/services/database/simulados'
import { getQuestao } from '@/services/database/questoes'
import { createReview } from '@/services/database/reviews'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, ChevronLeft, ChevronRight, Flag, CheckCircle,
  AlertTriangle, BookOpen, Sparkles, Eye,
} from 'lucide-react'
import type { Questao, Simulado } from '@/types/database'

export default function ExecutarSimuladoPage() {
  const params = useParams()
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const simuladoId = params.id as string

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [elapsedTime, setElapsedTime] = useState(0)
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({})
  const [questionStart, setQuestionStart] = useState(Date.now())
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({})
  const [confirmedAnswers, setConfirmedAnswers] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  const { data: simulado, isLoading: simLoading } = useQuery({
    queryKey: ['simulado', simuladoId],
    queryFn: () => getSimulado(simuladoId),
    enabled: !!simuladoId,
  })

  const questaoIds = simulado?.questao_ids || []

  const { data: questoes = [], isLoading: qLoading } = useQuery({
    queryKey: ['simulado-questoes', questaoIds],
    queryFn: async () => {
      const results: Questao[] = []
      for (const id of questaoIds) {
        try {
          const q = await getQuestao(id)
          results.push(q)
        } catch { /* skip missing */ }
      }
      return results
    },
    enabled: questaoIds.length > 0,
  })

  // Timer
  useEffect(() => {
    if (!simulado || simulado.modo !== 'cronometrado') return
    const interval = setInterval(() => setElapsedTime(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [simulado])

  // Track time per question
  useEffect(() => {
    setQuestionStart(Date.now())
  }, [currentIndex])

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`
  }

  function saveQuestionTime() {
    const timeSpent = Math.round((Date.now() - questionStart) / 1000)
    const currentQ = questoes[currentIndex]
    if (currentQ) {
      setQuestionTimes(prev => ({
        ...prev,
        [currentQ.$id]: (prev[currentQ.$id] || 0) + timeSpent,
      }))
    }
  }

  function goToNext() {
    saveQuestionTime()
    if (currentIndex < questoes.length - 1) setCurrentIndex(i => i + 1)
  }

  function goToPrev() {
    saveQuestionTime()
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  function confirmAnswer(questaoId: string) {
    setConfirmedAnswers(prev => ({ ...prev, [questaoId]: true }))
  }

  async function handleFinish() {
    if (!user || !simulado) return
    saveQuestionTime()
    setSubmitting(true)

    try {
      let correctCount = 0

      for (let i = 0; i < questoes.length; i++) {
        const q = questoes[i]
        const answer = answers[q.$id] || ''
        const isCorrect = q.tipo === 'objetiva' && answer === q.gabarito

        if (isCorrect) correctCount++

        await createResposta(user.$id, {
          simulado_id: simuladoId,
          questao_id: q.$id,
          ordem: i,
          resposta_objetiva: q.tipo === 'objetiva' ? answer : undefined,
          respostas_discursivas: q.tipo === 'discursiva' && answer ? [answer] : undefined,
          tempo_gasto: questionTimes[q.$id] || 0,
          esta_correta: isCorrect,
          nota: isCorrect ? 1 : 0,
          nota_maxima: 1,
        })

        // Auto-create review for wrong answers
        if (!isCorrect && answer) {
          await createReview(user.$id, {
            titulo: `Erro: ${q.enunciado.slice(0, 80)}...`,
            materia_id: q.materia_id,
            questao_id: q.$id,
            tipo: 'erro_simulado',
            data_revisao: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            origem: `Simulado: ${simulado.titulo}`,
          })
        }
      }

      await updateSimulado(simuladoId, {
        status: 'finalizado',
        finalizado_em: new Date().toISOString(),
        tempo_total: elapsedTime,
        nota: correctCount,
        nota_maxima: questoes.length,
      })

      router.push(`/simulados/${simuladoId}/resultado`)
    } catch (err) {
      console.error('Erro ao finalizar simulado:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (simLoading || qLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <PageLoading />
      </div>
    )
  }

  if (!simulado || questoes.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-slate-300">Simulado não encontrado ou sem questões</p>
          <button onClick={() => router.push('/simulados')} className="btn-premium mt-4 text-xs">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const currentQ = questoes[currentIndex]
  const isTutor = simulado.modo === 'tutor'
  const isConfirmed = confirmedAnswers[currentQ.$id]
  const isCorrect = currentQ.tipo === 'objetiva' && answers[currentQ.$id] === currentQ.gabarito
  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-200">{simulado.titulo}</span>
            <span className="badge-sm badge-cyan">{isTutor ? 'Tutor' : 'Cronometrado'}</span>
          </div>
          <div className="flex items-center gap-4">
            {simulado.cronometro_visivel !== false && (
              <div className="flex items-center gap-1.5 text-sm font-mono text-slate-300">
                <Clock size={14} className="text-cyan-400" />
                {formatTime(elapsedTime)}
              </div>
            )}
            <span className="text-xs text-slate-500">
              {answeredCount}/{questoes.length} respondidas
            </span>
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="btn-premium text-xs"
            >
              <Flag size={14} />
              {submitting ? 'Finalizando...' : 'Finalizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Question navigation pills */}
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex gap-1.5 flex-wrap">
          {questoes.map((q, i) => {
            const answered = !!answers[q.$id]
            const isCurrent = i === currentIndex
            return (
              <button
                key={q.$id}
                onClick={() => { saveQuestionTime(); setCurrentIndex(i) }}
                className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : answered
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.$id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="glass-card p-6"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-slate-500 font-mono">Questão {currentIndex + 1}/{questoes.length}</span>
              <span className={`badge-sm ${
                currentQ.dificuldade === 'facil' ? 'badge-success' :
                currentQ.dificuldade === 'medio' ? 'badge-warning' : 'badge-danger'
              }`}>
                {currentQ.dificuldade === 'facil' ? 'Fácil' : currentQ.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
              </span>
            </div>

            {/* Enunciado */}
            <p className="text-slate-200 leading-relaxed mb-6">{currentQ.enunciado}</p>

            {/* Alternatives */}
            {currentQ.tipo === 'objetiva' && currentQ.alternativas && (
              <div className="space-y-2 mb-4">
                {currentQ.alternativas.map(alt => {
                  const isSelected = answers[currentQ.$id] === alt.letra
                  const showResult = isTutor && isConfirmed
                  const isCorrectAlt = alt.letra === currentQ.gabarito

                  return (
                    <button
                      key={alt.letra}
                      onClick={() => {
                        if (isConfirmed) return
                        setAnswers(prev => ({ ...prev, [currentQ.$id]: alt.letra }))
                      }}
                      disabled={isConfirmed}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                        showResult
                          ? isCorrectAlt
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : isSelected && !isCorrectAlt
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              : 'border-white/[0.06] text-slate-400'
                          : isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            : 'border-white/[0.06] text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        showResult && isCorrectAlt
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : showResult && isSelected && !isCorrectAlt
                            ? 'bg-rose-500/20 text-rose-400'
                            : isSelected
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-white/[0.04] text-slate-500'
                      }`}>
                        {showResult && isCorrectAlt ? <CheckCircle size={14} /> : alt.letra}
                      </span>
                      <span className="text-sm">{alt.texto}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Discursiva */}
            {currentQ.tipo === 'discursiva' && (
              <textarea
                value={answers[currentQ.$id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [currentQ.$id]: e.target.value }))}
                placeholder="Digite sua resposta..."
                className="form-textarea mb-4"
                rows={6}
                disabled={isConfirmed}
              />
            )}

            {/* Tutor mode: confirm and see explanation */}
            {isTutor && !isConfirmed && answers[currentQ.$id] && (
              <button
                onClick={() => confirmAnswer(currentQ.$id)}
                className="btn-premium text-xs mb-4"
              >
                <Eye size={14} />
                Confirmar e Ver Resposta
              </button>
            )}

            {isTutor && isConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border mb-4 ${
                  isCorrect
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-rose-500/5 border-rose-500/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect
                    ? <CheckCircle size={16} className="text-emerald-400" />
                    : <AlertTriangle size={16} className="text-rose-400" />
                  }
                  <span className={`text-sm font-semibold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isCorrect ? 'Correto!' : `Incorreto — Gabarito: ${currentQ.gabarito}`}
                  </span>
                </div>
                {currentQ.explicacao && (
                  <p className="text-xs text-slate-400 leading-relaxed">{currentQ.explicacao}</p>
                )}
              </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="btn-secondary text-xs"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              {currentIndex < questoes.length - 1 ? (
                <button onClick={goToNext} className="btn-premium text-xs">
                  Próxima
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="btn-premium text-xs"
                >
                  <Flag size={14} />
                  {submitting ? 'Finalizando...' : 'Finalizar Simulado'}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
