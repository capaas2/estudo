'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createPeriod } from '@/services/database/periods'
import { createMateria, createSubjectWorkspace } from '@/services/database/materias'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, BookOpen, ChevronRight, ChevronLeft,
  Plus, X, Check, Sparkles, Palette, Award, Loader2,
} from 'lucide-react'

const CORES_MATERIAS = [
  '#6366f1', '#8b5cf6', '#34d399', '#fbbf24', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#a855f7',
]

const CURRICULO_MEDICINA_12 = [
  { periodo: 1, nome: "1º Período – Morfologia & Bioquímica", materias: ['Anatomia Humana I', 'Biologia Celular', 'Histologia e Embriologia I', 'Bioquímica I', 'Introdução à Medicina', 'Metodologia Científica'] },
  { periodo: 2, nome: "2º Período – Fisiologia & Genética", materias: ['Anatomia Humana II', 'Fisiologia Humana I', 'Histologia e Embriologia II', 'Bioquímica II', 'Genética Médica', 'Psicologia Médica'] },
  { periodo: 3, nome: "3º Período – Agentes & Defesa", materias: ['Fisiologia Humana II', 'Microbiologia Médica', 'Imunologia', 'Parasitologia Médica', 'Patologia Geral', 'Farmacologia I'] },
  { periodo: 4, nome: "4º Período – Bases da Clínica & Patologia", materias: ['Patologia Especial', 'Farmacologia II', 'Semiologia Médica I', 'Saúde Mental I', 'Epidemiologia e Bioestatística', 'Bioética'] },
  { periodo: 5, nome: "5º Período – Propedêutica & Clínica I", materias: ['Semiologia Médica II', 'Clínica Médica I', 'Cirurgia I', 'Pediatria I', 'Ginecologia e Obstetrícia I', 'Medicina Legal'] },
  { periodo: 6, nome: "6º Período – Clínica Integrada I", materias: ['Clínica Médica II', 'Cirurgia II', 'Pediatria II', 'Ginecologia e Obstetrícia II', 'Ortopedia', 'Oftalmologia'] },
  { periodo: 7, nome: "7º Período – Especialidades Médicas I", materias: ['Clínica Médica III', 'Emergências Médicas', 'Dermatologia', 'Otorrinolaringologia', 'Urologia', 'Neurologia'] },
  { periodo: 8, nome: "8º Período – Especialidades Médicas II", materias: ['Clínica Médica IV', 'Cirurgia III', 'Psiquiatria II', 'Anestesiologia', 'Geriatria', 'Medicina de Família'] },
  { periodo: 9, nome: "9º Período – Internato I (Clínica e Cirurgia)", materias: ['Estágio em Clínica Médica', 'Estágio em Cirurgia Geral', 'Estágio em Pediatria I'] },
  { periodo: 10, nome: "10º Período – Internato II (GO & Saúde Pública)", materias: ['Estágio em Ginecologia e Obstetrícia', 'Estágio em Saúde Coletiva', 'Estágio em Saúde Mental'] },
  { periodo: 11, nome: "11º Período – Internato III (Urgência & Eletivo)", materias: ['Estágio em Urgência e Emergência', 'Estágio em Medicina de Família II', 'Estágio Eletivo I'] },
  { periodo: 12, nome: "12º Período – Internato IV (UTI & TCC)", materias: ['Estágio em UTI', 'Estágio Ambulatorial Geral', 'Estágio Eletivo II', 'TCC Medicina'] },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { data: user } = useCurrentUser()

  const [step, setStep] = useState(1)
  const [curso, setCurso] = useState('Medicina')
  const [qtdPeriodos, setQtdPeriodos] = useState(12)
  const [loading, setLoading] = useState(false)

  async function handleFinalizarPresetMedicina() {
    if (!user) return
    setLoading(true)
    try {
      for (const item of CURRICULO_MEDICINA_12.slice(0, qtdPeriodos)) {
        const periodDoc = await createPeriod(user.$id, {
          numero: item.periodo,
          nome: item.nome,
          status: item.periodo === 1 ? 'em_andamento' : 'nao_iniciado',
        })
        for (let j = 0; j < item.materias.length; j++) {
          const matNome = item.materias[j]
          const matCor = CORES_MATERIAS[j % CORES_MATERIAS.length]
          const materiaDoc = await createMateria(user.$id, { nome: matNome, cor: matCor })
          await createSubjectWorkspace(user.$id, {
            materia_id: materiaDoc.$id,
            period_id: periodDoc.$id,
            carga_horaria: 60,
          })
        }
      }
      router.push('/')
    } catch (err) {
      console.error('Erro ao salvar onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Glow ambient background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl surface p-8 relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <GraduationCap size={24} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Bem-vindo ao StudyPro v4</h1>
          <p className="text-sm text-slate-400">Configure sua matriz curricular de Medicina em segundos</p>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="form-group">
              <label className="form-label">Seu Curso</label>
              <input
                type="text"
                value={curso}
                onChange={e => setCurso(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quantidade de Semestres / Períodos ({qtdPeriodos})</label>
              <input
                type="range"
                min={1}
                max={12}
                value={qtdPeriodos}
                onChange={e => setQtdPeriodos(parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1º Período</span>
                <span>6 Períodos</span>
                <span>12 Períodos (Internato)</span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="btn-primary w-full justify-center py-3 text-sm"
            >
              Próximo Passo
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
              <span className="font-bold flex items-center gap-1 text-indigo-300 mb-1">
                <Sparkles size={14} /> Matriz Padrão de Medicina Selecionada:
              </span>
              Serão importados {qtdPeriodos} períodos e mais de 50 disciplinas (Ciclo Básico, Clínico e Internato Médica) pré-configuradas!
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {CURRICULO_MEDICINA_12.slice(0, qtdPeriodos).map(item => (
                <div key={item.periodo} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-xs font-bold text-slate-200">{item.nome}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-0.5 line-clamp-1">{item.materias.join(', ')}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="btn-outline flex-1 justify-center">
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={handleFinalizarPresetMedicina}
                disabled={loading}
                className="btn-primary flex-1 justify-center py-3"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {loading ? 'Criando Grade...' : 'Concluir & Ir ao App'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
