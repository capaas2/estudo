'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPeriods, createPeriod, deletePeriod } from '@/services/database/periods'
import { createMateria, createSubjectWorkspace } from '@/services/database/materias'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import Modal from '@/components/shared/Modal'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import {
  GraduationCap, Plus, ChevronRight, Trash2, BookOpen,
  CheckCircle, Clock, Circle, Sparkles, Loader2, Award,
} from 'lucide-react'
import type { Period } from '@/types/database'

const statusConfig: Record<Period['status'], { label: string; badge: string; icon: typeof CheckCircle }> = {
  nao_iniciado: { label: 'Não Iniciado', badge: 'badge-indigo', icon: Circle },
  em_andamento: { label: 'Em Andamento', badge: 'badge-warning', icon: Clock },
  concluido: { label: 'Concluído', badge: 'badge-success', icon: CheckCircle },
}

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

const CORES_MATERIAS = [
  '#6366f1', '#8b5cf6', '#34d399', '#fbbf24', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#a855f7',
]

export default function PeriodosPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newNumero, setNewNumero] = useState(1)
  const [importingMedicina, setImportingMedicina] = useState(false)

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['periods', user?.$id],
    queryFn: () => listPeriods(user!.$id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createPeriod(user!.$id, {
      numero: newNumero,
      nome: newNome || `${newNumero}º Período`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] })
      setShowCreateModal(false)
      setNewNome('')
      setNewNumero(periods.length + 1)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePeriod(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['periods'] }),
  })

  async function handleImportMedicina() {
    if (!user) return
    setImportingMedicina(true)
    try {
      for (const item of CURRICULO_MEDICINA_12) {
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
      queryClient.invalidateQueries({ queryKey: ['periods'] })
    } catch (err) {
      console.error('Erro ao importar matriz de Medicina:', err)
    } finally {
      setImportingMedicina(false)
    }
  }

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meus Estudos & Períodos</h1>
          <p className="page-subtitle">Grade Curricular de Medicina — {periods.length} período{periods.length !== 1 ? 's' : ''} cadastrado{periods.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImportMedicina}
            disabled={importingMedicina}
            className="btn-outline text-xs"
            title="Importa os 12 períodos padrão MEC de Medicina"
          >
            {importingMedicina ? (
              <Loader2 size={14} className="animate-spin text-indigo-400" />
            ) : (
              <Sparkles size={14} className="text-amber-400" />
            )}
            {importingMedicina ? 'Importando Grade (12 períodos)...' : 'Importar Grade Medicina (12 Períodos)'}
          </button>
          <button onClick={() => { setNewNumero(periods.length + 1); setShowCreateModal(true) }} className="btn-primary text-xs">
            <Plus size={14} />
            Novo Período
          </button>
        </div>
      </div>

      <div className="page-body">
        {periods.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum período cadastrado"
            description="Importe com 1 clique o currículo padrão de Medicina de 12 períodos (Ciclo Básico, Clínico e Internato)."
            action={{ label: importingMedicina ? 'Importando...' : 'Importar Grade Medicina (12 Períodos)', onClick: handleImportMedicina }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {periods.map((period, i) => {
                const config = statusConfig[period.status] || statusConfig.nao_iniciado
                const isInternato = period.numero >= 9

                return (
                  <motion.div
                    key={period.$id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={`/periodos/${period.$id}`}
                      className="surface-interactive p-5 block group relative overflow-hidden"
                    >
                      {isInternato && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/10 border-b border-l border-amber-500/20 text-amber-400 text-[0.65rem] font-bold uppercase tracking-wider rounded-bl-xl">
                          Internato
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            {isInternato ? <Award size={22} /> : <GraduationCap size={22} />}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{period.nome}</h3>
                            <span className={`badge-sm ${config.badge} mt-1 inline-flex items-center gap-1`}>
                              <config.icon size={10} />
                              {config.label}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(period.$id) }}
                          className="btn-icon text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Progresso do Período</span>
                          <span className="font-bold text-indigo-400">{period.progresso || 0}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${period.progresso || 0}%` }} />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                        <span>Acessar matérias</span>
                        <ChevronRight size={15} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Criar Período */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Criar Período Manualmente"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-outline text-xs">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="btn-primary text-xs"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Período'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Número do Período</label>
            <input
              type="number"
              value={newNumero}
              onChange={e => setNewNumero(parseInt(e.target.value) || 1)}
              min={1}
              max={12}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nome do Período</label>
            <input
              type="text"
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
              placeholder={`${newNumero}º Período`}
              className="form-input"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
