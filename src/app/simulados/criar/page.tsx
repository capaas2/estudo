'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation } from '@tanstack/react-query'
import { listQuestoes } from '@/services/database/questoes'
import { listMaterias } from '@/services/database/materias'
import { createSimulado } from '@/services/database/simulados'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  ClipboardList, ChevronRight, CheckSquare, Square, Filter,
  Clock, BookOpen, Zap, ArrowLeft, Shuffle,
} from 'lucide-react'
import type { Questao, Simulado } from '@/types/database'

export default function CriarSimuladoPage() {
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useCurrentUser()

  // Steps
  const [step, setStep] = useState(1)

  // Step 1: Config
  const [titulo, setTitulo] = useState('')
  const [modo, setModo] = useState<Simulado['modo']>('cronometrado')
  const [tipo, setTipo] = useState<Simulado['tipo']>('manual')
  const [materiaFilter, setMateriaFilter] = useState('')
  const [cronometroVisivel, setCronometroVisivel] = useState(true)

  // Step 2: Questões
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data: materias = [] } = useQuery({
    queryKey: ['materias', user?.$id],
    queryFn: () => listMaterias(user!.$id),
    enabled: !!user,
  })

  const { data: questoes = [], isLoading: questoesLoading } = useQuery({
    queryKey: ['questoes', user?.$id, materiaFilter],
    queryFn: () => listQuestoes(user!.$id, materiaFilter ? { materia_id: materiaFilter } : undefined),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!materiaFilter && materias.length > 0) {
        // default to first materia
      }
      return createSimulado(user!.$id, {
        titulo: titulo || `Simulado ${new Date().toLocaleDateString('pt-BR')}`,
        materia_id: materiaFilter || 'geral',
        tipo,
        modo,
        questao_ids: Array.from(selectedIds),
        cronometro_visivel: cronometroVisivel,
      })
    },
    onSuccess: (simulado) => {
      router.push(`/simulados/${simulado.$id}/executar`)
    },
  })

  function toggleQuestion(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (selectedIds.size === questoes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(questoes.map(q => q.$id)))
    }
  }

  function shuffleSelect(count: number) {
    const shuffled = [...questoes].sort(() => Math.random() - 0.5).slice(0, count)
    setSelectedIds(new Set(shuffled.map(q => q.$id)))
  }

  const difColor: Record<string, string> = {
    facil: 'text-emerald-400',
    medio: 'text-amber-400',
    dificil: 'text-rose-400',
  }

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Criar Simulado</h1>
            <p className="page-subtitle">Passo {step} de 2</p>
          </div>
        </div>
      </div>

      <div className="page-body max-w-3xl">
        {/* Stepper */}
        <div className="stepper mb-6">
          <div className={`stepper-step ${step >= 1 ? 'active' : ''}`}>
            <div className="stepper-dot">1</div>
            <span className="stepper-label">Configurar</span>
          </div>
          <div className="stepper-line" />
          <div className={`stepper-step ${step >= 2 ? 'active' : ''}`}>
            <div className="stepper-dot">2</div>
            <span className="stepper-label">Questões</span>
          </div>
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 space-y-5"
          >
            <div className="form-group">
              <label className="form-label">Título</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder={`Simulado ${new Date().toLocaleDateString('pt-BR')}`}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Modo</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModo('cronometrado')}
                  className={`glass-card p-4 text-left transition-all ${modo === 'cronometrado' ? 'border-cyan-500/40 bg-cyan-500/5' : ''}`}
                >
                  <Clock size={20} className={`mb-2 ${modo === 'cronometrado' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <p className="text-sm font-semibold text-slate-200">Cronometrado</p>
                  <p className="text-xs text-slate-500 mt-1">Sem ajuda, treino para prova real</p>
                </button>
                <button
                  onClick={() => setModo('tutor')}
                  className={`glass-card p-4 text-left transition-all ${modo === 'tutor' ? 'border-violet-500/40 bg-violet-500/5' : ''}`}
                >
                  <BookOpen size={20} className={`mb-2 ${modo === 'tutor' ? 'text-violet-400' : 'text-slate-500'}`} />
                  <p className="text-sm font-semibold text-slate-200">Tutor</p>
                  <p className="text-xs text-slate-500 mt-1">Feedback após cada questão</p>
                </button>
              </div>
            </div>

            {modo === 'cronometrado' && (
              <div className="form-group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cronometroVisivel}
                    onChange={e => setCronometroVisivel(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span className="text-sm text-slate-300">Mostrar cronômetro durante a prova</span>
                </label>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Filtrar por Matéria</label>
              <select
                value={materiaFilter}
                onChange={e => setMateriaFilter(e.target.value)}
                className="form-select"
              >
                <option value="">Todas as matérias</option>
                {materias.map(m => (
                  <option key={m.$id} value={m.$id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setStep(2)}
              className="btn-premium w-full"
            >
              Próximo — Selecionar Questões
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary text-xs">
                <ArrowLeft size={14} />
                Voltar
              </button>
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="btn-secondary text-xs">
                  {selectedIds.size === questoes.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </button>
                <button onClick={() => shuffleSelect(10)} className="btn-secondary text-xs">
                  <Shuffle size={14} />
                  10 Aleatórias
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {selectedIds.size} questão(ões) selecionada(s) de {questoes.length} disponíveis
            </p>

            {questoesLoading ? (
              <PageLoading />
            ) : questoes.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <ClipboardList size={32} className="text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Nenhuma questão disponível</p>
                <p className="text-xs text-slate-600 mt-1">Crie questões primeiro no Banco de Questões</p>
              </div>
            ) : (
              <div className="space-y-2">
                {questoes.map((q, i) => (
                  <motion.div
                    key={q.$id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => toggleQuestion(q.$id)}
                    className={`glass-card p-4 cursor-pointer transition-all ${
                      selectedIds.has(q.$id)
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {selectedIds.has(q.$id)
                          ? <CheckSquare size={18} className="text-cyan-400" />
                          : <Square size={18} className="text-slate-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 line-clamp-2">{q.enunciado}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[0.65rem] font-medium ${difColor[q.dificuldade]}`}>
                            {q.dificuldade === 'facil' ? 'Fácil' : q.dificuldade === 'medio' ? 'Médio' : 'Difícil'}
                          </span>
                          <span className="text-[0.65rem] text-slate-600">•</span>
                          <span className="text-[0.65rem] text-slate-500">{q.tipo === 'objetiva' ? 'Objetiva' : 'Discursiva'}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Start button */}
            <button
              onClick={() => createMutation.mutate()}
              disabled={selectedIds.size === 0 || createMutation.isPending}
              className="btn-premium w-full mt-4"
            >
              {createMutation.isPending ? 'Criando...' : `Iniciar Simulado (${selectedIds.size} questões)`}
              <Zap size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}
