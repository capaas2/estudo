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

export const CURRICULO_MEDICINA_EXACT = [
  {
    periodo: 1,
    nome: "1º Período (2026/1)",
    status: 'concluido' as const,
    progresso: 100,
    materias: [
      { nome: "Anatomia Humana I", carga: 80 },
      { nome: "Genética e Embriologia", carga: 104 },
      { nome: "Habilidades, Atitudes e Comunicação I", carga: 80 },
      { nome: "Histologia", carga: 40 },
      { nome: "Homeostasia I", carga: 122 },
      { nome: "Homeostasia II", carga: 122 },
      { nome: "Programa de Interação Serviço Ensino Comunidade I", carga: 60 },
    ],
  },
  {
    periodo: 2,
    nome: "2º Período (2026/2)",
    status: 'em_andamento' as const,
    progresso: 15,
    materias: [
      { nome: "Habilidades, Atitudes e Comunicação II", carga: 80 },
      { nome: "Metabolismo", carga: 122 },
      { nome: "Metabolismo II", carga: 104 },
      { nome: "Neuroanatomia", carga: 40 },
      { nome: "Programa de Interação Serviço Ensino Comunidade II", carga: 60 },
      { nome: "Sistema Nervoso", carga: 122 },
    ],
  },
  {
    periodo: 3,
    nome: "3º Período",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Anatomia Humana II", carga: 60 },
      { nome: "Habilidades, Atitudes e Comunicação III", carga: 80 },
      { nome: "Histologia II", carga: 40 },
      { nome: "Interação com o Meio Ambiente", carga: 104 },
      { nome: "Programa de Interação Serviço Ensino Comunidade III", carga: 60 },
      { nome: "Sistema Circulatório", carga: 122 },
      { nome: "Sistema Locomotor", carga: 122 },
    ],
  },
  {
    periodo: 4,
    nome: "4º Período",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Habilidades, Atitudes e Comunicação IV", carga: 80 },
      { nome: "Optativa (1)", carga: 40 },
      { nome: "Patologia Geral", carga: 40 },
      { nome: "Programa de Interação Serviço Ensino Comunidade IV", carga: 80 },
      { nome: "Sistema Digestório", carga: 122 },
      { nome: "Sistema Respiratório", carga: 104 },
      { nome: "Sistema Urinário", carga: 122 },
    ],
  },
  {
    periodo: 5,
    nome: "5º Período",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Anatomia Patológica e Fisiopatologia I", carga: 40 },
      { nome: "Dermatologia e Carcinogênese", carga: 122 },
      { nome: "Farmacologia Básica", carga: 40 },
      { nome: "Habilidades, Atitudes e Comunicação V", carga: 80 },
      { nome: "Optativa (2)", carga: 40 },
      { nome: "Programa de Interação Serviço Ensino Comunidade V", carga: 80 },
      { nome: "Radiologia e Diagnóstico por Imagem", carga: 60 },
      { nome: "Saúde Mental e Comportamento", carga: 122 },
      { nome: "Sistema Hemolinfopoiético", carga: 104 },
    ],
  },
  {
    periodo: 6,
    nome: "6º Período",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Anatomia Patológica e Fisiopatologia II", carga: 40 },
      { nome: "Atividades Complementares em Medicina", carga: 80 },
      { nome: "Envelhecimento", carga: 92 },
      { nome: "Farmacologia Clínica I", carga: 40 },
      { nome: "Habilidades, Atitudes e Comunicação VI", carga: 80 },
      { nome: "Nascimento, Crescimento e Desenvolvimento", carga: 104 },
      { nome: "Programa de Interação Serviço Ensino Comunidade VI", carga: 80 },
      { nome: "Reprodução e Sexualidade", carga: 104 },
    ],
  },
  {
    periodo: 7,
    nome: "7º Período",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Apresentações Clínicas I", carga: 104 },
      { nome: "Apresentações Clínicas II", carga: 104 },
      { nome: "Apresentações Clínicas III", carga: 92 },
      { nome: "Farmacologia Clínica II", carga: 40 },
      { nome: "Habilidades, Atitudes e Comunicação VII", carga: 80 },
      { nome: "Optativa (3)", carga: 40 },
      { nome: "Programa de Interação Serviço Ensino Comunidade VII", carga: 80 },
    ],
  },
  {
    periodo: 8,
    nome: "8º Período",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Apresentações Clínicas IV", carga: 104 },
      { nome: "Apresentações Clínicas V", carga: 104 },
      { nome: "Apresentações Clínicas VI", carga: 92 },
      { nome: "Farmacologia Clínica III", carga: 40 },
      { nome: "Habilidades, Atitudes e Comunicação VIII", carga: 80 },
      { nome: "Programa de Interação Serviço Ensino Comunidade VIII", carga: 80 },
    ],
  },
  {
    periodo: 9,
    nome: "9º Período – Internato I",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Internato I - Criança e Mulher", carga: 840 },
    ],
  },
  {
    periodo: 10,
    nome: "10º Período – Internato II",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Internato II - Adulto e Idoso", carga: 840 },
    ],
  },
  {
    periodo: 11,
    nome: "11º Período – Internato III",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Internato III - Família e Comunidade", carga: 840 },
    ],
  },
  {
    periodo: 12,
    nome: "12º Período – Internato IV",
    status: 'nao_iniciado' as const,
    progresso: 0,
    materias: [
      { nome: "Internato IV - Clínicas Avançadas", carga: 420 },
      { nome: "Internato V - Consolidação e Aprimoramento", carga: 420 },
    ],
  },
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
      // 1. Limpar períodos existentes anteriores se o usuário estiver reimportando
      try {
        const existingPeriods = await listPeriods(user.$id)
        for (const p of existingPeriods) {
          try { await deletePeriod(p.$id) } catch (e) { console.warn('Erro ao deletar período antigo:', e) }
        }
      } catch (errClean) {
        console.warn('Aviso ao listar períodos para limpeza:', errClean)
      }

      // 2. Criar os 12 períodos e disciplinas com resiliência por item
      for (const item of CURRICULO_MEDICINA_EXACT) {
        let periodDoc: Period | null = null
        try {
          periodDoc = await createPeriod(user.$id, {
            numero: item.periodo,
            nome: item.nome,
            status: item.status,
            progresso: item.progresso,
          })
        } catch (errPeriod) {
          console.error(`Erro ao criar período ${item.periodo}:`, errPeriod)
        }

        if (periodDoc) {
          for (let j = 0; j < item.materias.length; j++) {
            const mat = item.materias[j]
            const matCor = CORES_MATERIAS[j % CORES_MATERIAS.length]
            try {
              const materiaDoc = await createMateria(user.$id, { nome: mat.nome, cor: matCor })
              await createSubjectWorkspace(user.$id, {
                materia_id: materiaDoc.$id,
                period_id: periodDoc.$id,
                carga_horaria: mat.carga,
                status: item.periodo === 1 ? 'concluido' : item.periodo === 2 ? 'cursando' : 'trancado',
              })
            } catch (errMat) {
              console.error(`Erro ao criar disciplina ${mat.nome}:`, errMat)
            }
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['periods'] })
      await queryClient.invalidateQueries({ queryKey: ['materias'] })
      await queryClient.invalidateQueries({ queryKey: ['subject-workspaces'] })
    } catch (err) {
      console.error('Erro global ao importar matriz de Medicina:', err)
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
            title="Importa sua matriz curricular exata de Medicina (12 períodos)"
          >
            {importingMedicina ? (
              <Loader2 size={14} className="animate-spin text-indigo-400" />
            ) : (
              <Sparkles size={14} className="text-amber-400" />
            )}
            {importingMedicina ? 'Importando Matriz Oficial...' : 'Importar Minha Grade Oficial (12 Períodos)'}
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
            description="Importe com 1 clique a sua grade oficial de Medicina completa (do 1º período concluído até o Internato)."
            action={{ label: importingMedicina ? 'Importando...' : 'Importar Minha Grade Oficial', onClick: handleImportMedicina }}
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
                          className="btn-icon text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                        <span>Acessar disciplinas</span>
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
