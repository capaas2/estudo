'use client'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPeriods, createPeriod, deletePeriod } from '@/services/database/periods'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import Modal from '@/components/shared/Modal'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import {
  GraduationCap, Plus, ChevronRight, Trash2, BookOpen,
  CheckCircle, Clock, Circle, Sparkles, Loader2,
} from 'lucide-react'
import { createMateria, createSubjectWorkspace } from '@/services/database/materias'
import type { Period } from '@/types/database'

const statusConfig: Record<Period['status'], { label: string; color: string; icon: typeof CheckCircle }> = {
  nao_iniciado: { label: 'Não Iniciado', color: 'slate', icon: Circle },
  em_andamento: { label: 'Em Andamento', color: 'cyan', icon: Clock },
  concluido: { label: 'Concluído', color: 'emerald', icon: CheckCircle },
}

const SUGESTAO_MEDICINA = [
  { periodo: 1, materias: ['Anatomia Humana', 'Biologia Celular', 'Histologia', 'Embriologia', 'Bioquímica', 'Introdução à Medicina'] },
  { periodo: 2, materias: ['Anatomia II', 'Fisiologia I', 'Histologia II', 'Bioquímica II', 'Genética', 'Saúde Coletiva'] },
  { periodo: 3, materias: ['Fisiologia II', 'Microbiologia', 'Imunologia', 'Parasitologia', 'Patologia Geral', 'Farmacologia I'] },
  { periodo: 4, materias: ['Patologia Especial', 'Farmacologia II', 'Semiologia Médica I', 'Saúde Mental', 'Epidemiologia', 'Bioética'] },
  { periodo: 5, materias: ['Semiologia Médica II', 'Propedêutica', 'Clínica Médica I', 'Cirurgia I', 'Pediatria I', 'Ginecologia'] },
  { periodo: 6, materias: ['Clínica Médica II', 'Cirurgia II', 'Pediatria II', 'Obstetrícia', 'Ortopedia', 'Oftalmologia'] },
]

const CORES_MATERIAS = [
  '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
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
      for (const item of SUGESTAO_MEDICINA) {
        const periodDoc = await createPeriod(user.$id, {
          numero: item.periodo,
          nome: `${item.periodo}º Período - Medicina`,
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
          <h1 className="page-title">Períodos</h1>
          <p className="page-subtitle">{periods.length} período{periods.length !== 1 ? 's' : ''} cadastrado{periods.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportMedicina}
            disabled={importingMedicina}
            className="btn-secondary text-xs"
            title="Importa os 6 períodos e matérias padrão de Medicina"
          >
            {importingMedicina ? (
              <Loader2 size={14} className="animate-spin text-cyan-400" />
            ) : (
              <Sparkles size={14} className="text-amber-400" />
            )}
            {importingMedicina ? 'Importando...' : 'Importar Grade Medicina'}
          </button>
          <button onClick={() => { setNewNumero(periods.length + 1); setShowCreateModal(true) }} className="btn-premium text-xs">
            <Plus size={14} />
            Novo Período
          </button>
        </div>
      </div>
      <div className="page-body">
        {periods.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum período encontrado"
            description="Crie um período manualmente ou importe a grade padrão de Medicina em 1 clique."
            action={{ label: importingMedicina ? 'Importando...' : 'Importar Grade Medicina', onClick: handleImportMedicina }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {periods.map((period, i) => {
                const config = statusConfig[period.status]
                return (
                  <motion.div
                    key={period.$id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={`/periodos/${period.$id}`}
                      className="glass-card-hover p-5 block group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/10 flex items-center justify-center">
                            <GraduationCap size={22} className="text-cyan-400" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-100">{period.nome}</h3>
                            <span className={`badge-sm badge-${config.color} mt-1`}>
                              <config.icon size={10} className="mr-1" />
                              {config.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(period.$id) }}
                            className="btn-icon text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                          <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Progresso</span>
                          <span className="text-xs font-semibold text-cyan-400">{period.progresso || 0}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${period.progresso || 0}%` }} />
                        </div>
                      </div>

                      {period.meta_horas_semana && period.meta_horas_semana > 0 && (
                        <p className="text-[0.65rem] text-slate-600">
                          Meta: {period.meta_horas_semana}h/semana
                        </p>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Período"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="btn-premium text-xs"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Período'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Número</label>
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
            <label className="form-label">Nome (opcional)</label>
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
