'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createPeriod } from '@/services/database/periods'
import { createMateria, createSubjectWorkspace } from '@/services/database/materias'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, ChevronRight, ChevronLeft,
  Plus, X, Check, Sparkles, Palette,
} from 'lucide-react'

// Cores predefinidas para matérias
const CORES_MATERIAS = [
  '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
]

// Sugestão de currículo de Medicina
const SUGESTAO_MEDICINA = [
  { periodo: 1, materias: ['Anatomia Humana', 'Biologia Celular', 'Histologia', 'Embriologia', 'Bioquímica', 'Introdução à Medicina'] },
  { periodo: 2, materias: ['Anatomia II', 'Fisiologia I', 'Histologia II', 'Bioquímica II', 'Genética', 'Saúde Coletiva'] },
  { periodo: 3, materias: ['Fisiologia II', 'Microbiologia', 'Imunologia', 'Parasitologia', 'Patologia Geral', 'Farmacologia I'] },
  { periodo: 4, materias: ['Patologia Especial', 'Farmacologia II', 'Semiologia Médica I', 'Saúde Mental', 'Epidemiologia', 'Bioética'] },
  { periodo: 5, materias: ['Semiologia Médica II', 'Propedêutica', 'Clínica Médica I', 'Cirurgia I', 'Pediatria I', 'Ginecologia'] },
  { periodo: 6, materias: ['Clínica Médica II', 'Cirurgia II', 'Pediatria II', 'Obstetrícia', 'Ortopedia', 'Oftalmologia'] },
]

interface MateriaOnboarding {
  nome: string
  cor: string
  carga_horaria: number
}

interface PeriodoOnboarding {
  numero: number
  nome: string
  materias: MateriaOnboarding[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()

  const [step, setStep] = useState(1)
  const [curso, setCurso] = useState('Medicina')
  const [qtdPeriodos, setQtdPeriodos] = useState(6)
  const [periodos, setPeriodos] = useState<PeriodoOnboarding[]>([])
  const [loading, setLoading] = useState(false)

  // Passo 2: inicializa períodos vazios
  function inicializarPeriodos() {
    const novos: PeriodoOnboarding[] = Array.from({ length: qtdPeriodos }, (_, i) => ({
      numero: i + 1,
      nome: `${i + 1}º Período`,
      materias: [],
    }))
    setPeriodos(novos)
  }

  // Passo 3: carregar sugestão de Medicina
  function carregarSugestao() {
    const sugeridos: PeriodoOnboarding[] = SUGESTAO_MEDICINA.slice(0, qtdPeriodos).map((s, i) => ({
      numero: s.periodo,
      nome: `${s.periodo}º Período`,
      materias: s.materias.map((nome, j) => ({
        nome,
        cor: CORES_MATERIAS[j % CORES_MATERIAS.length],
        carga_horaria: 60,
      })),
    }))
    // Se o usuário pediu mais períodos do que a sugestão cobre, complementa com vazios
    while (sugeridos.length < qtdPeriodos) {
      sugeridos.push({
        numero: sugeridos.length + 1,
        nome: `${sugeridos.length + 1}º Período`,
        materias: [],
      })
    }
    setPeriodos(sugeridos)
  }

  function addMateria(periodoIndex: number) {
    const updated = [...periodos]
    const corIndex = updated[periodoIndex].materias.length
    updated[periodoIndex].materias.push({
      nome: '',
      cor: CORES_MATERIAS[corIndex % CORES_MATERIAS.length],
      carga_horaria: 60,
    })
    setPeriodos(updated)
  }

  function removeMateria(periodoIndex: number, materiaIndex: number) {
    const updated = [...periodos]
    updated[periodoIndex].materias.splice(materiaIndex, 1)
    setPeriodos(updated)
  }

  function updateMateria(periodoIndex: number, materiaIndex: number, field: keyof MateriaOnboarding, value: string | number) {
    const updated = [...periodos]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(updated[periodoIndex].materias[materiaIndex] as any)[field] = value
    setPeriodos(updated)
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)

    try {
      for (const periodo of periodos) {
        // Cria o período
        const periodDoc = await createPeriod(user.$id, {
          numero: periodo.numero,
          nome: periodo.nome,
          status: periodo.numero === 1 ? 'em_andamento' : 'nao_iniciado',
        })

        // Cria cada matéria e o subject_workspace vinculado
        for (const materia of periodo.materias) {
          if (!materia.nome.trim()) continue
          const materiaDoc = await createMateria(user.$id, {
            nome: materia.nome,
            cor: materia.cor,
          })
          await createSubjectWorkspace(user.$id, {
            materia_id: materiaDoc.$id,
            period_id: periodDoc.$id,
            carga_horaria: materia.carga_horaria,
          })
        }
      }

      router.push('/')
    } catch (err) {
      console.error('Erro no onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalMaterias = periodos.reduce((acc, p) => acc + p.materias.filter(m => m.nome.trim()).length, 0)

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-radial from-cyan-500/[0.06] to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] bg-gradient-radial from-violet-500/[0.06] to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`stepper-dot ${step === s ? 'stepper-dot-active' : step > s ? 'stepper-dot-completed' : 'stepper-dot-pending'}`} />
              {i < 2 && (
                <div className={`stepper-line w-16 ${step > s ? 'stepper-line-active' : 'stepper-line-pending'}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ============ PASSO 1 ============ */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
                  <GraduationCap size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Bem-vindo ao StudyPro!</h2>
                  <p className="text-sm text-slate-400">Vamos configurar seu currículo</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label htmlFor="curso" className="form-label">Curso</label>
                  <input
                    id="curso"
                    type="text"
                    value={curso}
                    onChange={e => setCurso(e.target.value)}
                    placeholder="Ex: Medicina"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="qtd-periodos" className="form-label">Quantidade de Períodos</label>
                  <input
                    id="qtd-periodos"
                    type="number"
                    value={qtdPeriodos}
                    onChange={e => setQtdPeriodos(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                    min={1}
                    max={12}
                    className="form-input"
                  />
                  <p className="text-xs text-slate-500 ml-1">Quantos semestres/períodos tem o seu curso?</p>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => { inicializarPeriodos(); setStep(2) }}
                  className="btn-premium"
                >
                  Próximo <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============ PASSO 2 ============ */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                    <BookOpen size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">Matérias por Período</h2>
                    <p className="text-sm text-slate-400">{totalMaterias} matéria{totalMaterias !== 1 ? 's' : ''} cadastrada{totalMaterias !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={carregarSugestao}
                  className="btn-secondary text-xs"
                  title="Preenche com o currículo padrão de Medicina"
                >
                  <Sparkles size={14} />
                  Sugestão Medicina
                </button>
              </div>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {periodos.map((periodo, pi) => (
                  <div key={pi} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">{periodo.nome}</h3>

                    <div className="space-y-2">
                      {periodo.materias.map((materia, mi) => (
                        <div key={mi} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 cursor-pointer"
                            style={{ backgroundColor: materia.cor }}
                            onClick={() => {
                              const nextColor = CORES_MATERIAS[(CORES_MATERIAS.indexOf(materia.cor) + 1) % CORES_MATERIAS.length]
                              updateMateria(pi, mi, 'cor', nextColor)
                            }}
                          />
                          <input
                            type="text"
                            value={materia.nome}
                            onChange={e => updateMateria(pi, mi, 'nome', e.target.value)}
                            placeholder="Nome da matéria"
                            className="form-input text-xs py-1.5 flex-1"
                          />
                          <input
                            type="number"
                            value={materia.carga_horaria}
                            onChange={e => updateMateria(pi, mi, 'carga_horaria', parseInt(e.target.value) || 0)}
                            className="form-input text-xs py-1.5 w-16 text-center"
                            title="Carga horária"
                            placeholder="h"
                          />
                          <button
                            onClick={() => removeMateria(pi, mi)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addMateria(pi)}
                      className="mt-2 text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Adicionar matéria
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="btn-ghost">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button onClick={() => setStep(3)} className="btn-premium">
                  Revisar <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============ PASSO 3 ============ */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-rose-600 flex items-center justify-center">
                  <Check size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Tudo pronto!</h2>
                  <p className="text-sm text-slate-400">Revise seu currículo antes de confirmar</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Curso</p>
                  <p className="text-sm font-semibold text-slate-200">{curso}</p>
                </div>

                {periodos.map((periodo, pi) => (
                  <div key={pi} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-300 mb-2">{periodo.nome}</p>
                    {periodo.materias.filter(m => m.nome.trim()).length === 0 ? (
                      <p className="text-xs text-slate-600 italic">Nenhuma matéria</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {periodo.materias.filter(m => m.nome.trim()).map((materia, mi) => (
                          <span
                            key={mi}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${materia.cor}15`,
                              color: materia.cor,
                              border: `1px solid ${materia.cor}30`,
                            }}
                          >
                            <Palette size={10} />
                            {materia.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(2)} className="btn-ghost">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading || totalMaterias === 0}
                  className="btn-premium"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      Confirmar e começar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
