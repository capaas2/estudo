'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listQuestoes, createQuestao } from '@/services/database/questoes'
import { listSimulados } from '@/services/database/simulados'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  HelpCircle, Plus, Search, Filter, BookOpen, ClipboardList,
  CheckCircle2, Clock, Award, ArrowRight, Sparkles, ChevronRight,
} from 'lucide-react'

export default function QuestoesPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'banco' | 'simulados'>('banco')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false)

  // Form states para nova questão
  const [enunciado, setEnunciado] = useState('')
  const [opcaoA, setOpcaoA] = useState('')
  const [opcaoB, setOpcaoB] = useState('')
  const [opcaoC, setOpcaoC] = useState('')
  const [opcaoD, setOpcaoD] = useState('')
  const [correta, setCorreta] = useState('A')

  const { data: questoes = [], isLoading: loadingQuestoes } = useQuery({
    queryKey: ['questoes', user?.$id],
    queryFn: () => listQuestoes(user!.$id),
    enabled: !!user,
  })

  const { data: simulados = [], isLoading: loadingSimulados } = useQuery({
    queryKey: ['simulados', user?.$id],
    queryFn: () => listSimulados(user!.$id),
    enabled: !!user,
  })

  const createQuestionMutation = useMutation({
    mutationFn: () => createQuestao(user!.$id, {
      enunciado,
      tipo: 'objetiva',
      materia_id: 'geral',
      dificuldade: 'medio',
      gabarito: correta,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] })
      setShowCreateQuestionModal(false)
      setEnunciado('')
      setOpcaoA('')
      setOpcaoB('')
      setOpcaoC('')
      setOpcaoD('')
    },
  })

  if (userLoading || loadingQuestoes || loadingSimulados) return <AppShell><PageLoading /></AppShell>

  const filteredQuestoes = questoes.filter(q =>
    q.enunciado.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HelpCircle className="text-indigo-400" size={22} />
            Questões & Simulados
          </h1>
          <p className="page-subtitle">Pratique com questões objetivas de Medicina e avalie seu desempenho</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'banco' ? (
            <button onClick={() => setShowCreateQuestionModal(true)} className="btn-primary text-xs">
              <Plus size={14} />
              Nova Questão
            </button>
          ) : (
            <Link href="/simulados/criar" className="btn-primary text-xs">
              <Plus size={14} />
              Criar Novo Simulado
            </Link>
          )}
        </div>
      </div>

      {/* Pill Navigation Bar */}
      <div className="px-8 py-3 border-b border-white/[0.06] bg-[#08090d]/60 backdrop-blur-sm flex items-center gap-2">
        <button
          onClick={() => setActiveTab('banco')}
          className={activeTab === 'banco' ? 'pill-tab-active' : 'pill-tab'}
        >
          <BookOpen size={15} />
          <span>Banco de Questões ({questoes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('simulados')}
          className={activeTab === 'simulados' ? 'pill-tab-active' : 'pill-tab'}
        >
          <ClipboardList size={15} />
          <span>Meus Simulados ({simulados.length})</span>
        </button>
      </div>

      <div className="page-body space-y-6">
        {/* ABA: BANCO DE QUESTÕES */}
        {activeTab === 'banco' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar questões por enunciado..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {filteredQuestoes.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nenhuma questão cadastrada"
                description="Cadastre suas próprias questões de Medicina ou importe de PDFs para treinar."
                action={{ label: 'Criar Primeira Questão', onClick: () => setShowCreateQuestionModal(true) }}
              />
            ) : (
              <div className="space-y-4">
                {filteredQuestoes.map((q, idx) => (
                  <motion.div
                    key={q.$id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="surface p-5 hover:border-white/[0.12] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="badge-sm badge-indigo">Questão #{idx + 1}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-relaxed mb-4">{q.enunciado}</p>

                    {/* Resposta Correta Badge */}
                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                      <span>Gabarito: <strong className="text-emerald-400 font-bold">Opção {q.gabarito || 'A'}</strong></span>
                      <button className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1">
                        Ver Opções <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: MEUS SIMULADOS */}
        {activeTab === 'simulados' && (
          <div className="space-y-6">
            {simulados.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum simulado realizado"
                description="Monte simulados personalizados por matéria ou aleatórios para testar seus conhecimentos."
                action={{ label: 'Criar Simulado', onClick: () => window.location.href = '/simulados/criar' }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {simulados.map((sim, idx) => {
                  const isConcluido = sim.status === 'finalizado'
                  const taxa = sim.nota_maxima && sim.nota_maxima > 0 ? Math.round(((sim.nota || 0) / sim.nota_maxima) * 100) : 0

                  return (
                    <motion.div
                      key={sim.$id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="surface-interactive p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`badge-sm ${isConcluido ? 'badge-success' : 'badge-warning'}`}>
                            {isConcluido ? 'Finalizado' : 'Em Andamento'}
                          </span>
                          <span className="text-xs font-bold text-indigo-400">{taxa}%</span>
                        </div>
                        <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{sim.titulo}</h3>
                        <p className="text-xs text-slate-400">Nota: {sim.nota || 0} / {sim.nota_maxima || 10}</p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <Link
                          href={isConcluido ? `/simulados/${sim.$id}/resultado` : `/simulados/${sim.$id}/executar`}
                          className="btn-primary text-xs w-full justify-center"
                        >
                          {isConcluido ? 'Ver Resultado & Análise' : 'Continuar Simulado'}
                        </Link>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Criar Questão */}
      <Modal
        open={showCreateQuestionModal}
        onClose={() => setShowCreateQuestionModal(false)}
        title="Cadastrar Nova Questão"
        footer={
          <>
            <button onClick={() => setShowCreateQuestionModal(false)} className="btn-outline text-xs">Cancelar</button>
            <button
              onClick={() => createQuestionMutation.mutate()}
              disabled={createQuestionMutation.isPending || !enunciado}
              className="btn-primary text-xs"
            >
              {createQuestionMutation.isPending ? 'Salvando...' : 'Salvar Questão'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Enunciado da Questão</label>
            <textarea
              rows={3}
              value={enunciado}
              onChange={e => setEnunciado(e.target.value)}
              placeholder="Digite o enunciado completo da questão..."
              className="form-textarea"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Opção A</label>
              <input type="text" value={opcaoA} onChange={e => setOpcaoA(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Opção B</label>
              <input type="text" value={opcaoB} onChange={e => setOpcaoB(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Opção C</label>
              <input type="text" value={opcaoC} onChange={e => setOpcaoC(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Opção D</label>
              <input type="text" value={opcaoD} onChange={e => setOpcaoD(e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Opção Correta</label>
            <select value={correta} onChange={e => setCorreta(e.target.value)} className="form-select">
              <option value="A">Opção A</option>
              <option value="B">Opção B</option>
              <option value="C">Opção C</option>
              <option value="D">Opção D</option>
            </select>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
