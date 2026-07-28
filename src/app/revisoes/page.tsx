'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listReviews, createReview, updateReview, deleteReview } from '@/services/database/reviews'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, Plus, Check, Clock, AlertCircle, Trash2,
  Calendar, Layers, Filter, CheckCircle2, Sparkles,
} from 'lucide-react'
import type { Review } from '@/types/database'

export default function RevisoesPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'todas' | 'pendente' | 'concluida'>('todas')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', user?.$id],
    queryFn: () => listReviews(user!.$id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createReview(user!.$id, {
      titulo: newTitle,
      data_revisao: newDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setShowCreateModal(false)
      setNewTitle('')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => updateReview(id, { status: 'concluida' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  })

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pendente') return r.status === 'pendente'
    if (filter === 'concluida') return r.status === 'concluida'
    return true
  })

  const pendentesCount = reviews.filter(r => r.status === 'pendente').length

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <RotateCcw className="text-indigo-400" size={22} />
            Revisões Inteligentes (FSRS)
          </h1>
          <p className="page-subtitle">Sua fila de repetição espaçada calculada para otimizar a retenção em Medicina</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs">
            <Plus size={14} />
            Nova Revisão
          </button>
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* Banner de Estatísticas da Fila */}
        <div className="surface p-5 flex flex-wrap items-center justify-between gap-4 border border-indigo-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Status do Algoritmo FSRS</h2>
              <p className="text-xs text-slate-400">
                Você tem <strong className="text-indigo-300 font-semibold">{pendentesCount} revisões pendentes</strong> na fila de hoje.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setFilter('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'todas' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({reviews.length})
            </button>
            <button
              onClick={() => setFilter('pendente')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'pendente' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pendentes ({pendentesCount})
            </button>
            <button
              onClick={() => setFilter('concluida')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'concluida' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              Concluídas ({reviews.length - pendentesCount})
            </button>
          </div>
        </div>

        {/* Lista de Revisões */}
        {filteredReviews.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="Nenhuma revisão encontrada"
            description="Tudo em dia! As revisões geradas após simulados ou marcadas manualmente aparecerão aqui."
            action={{ label: 'Criar Revisão Manual', onClick: () => setShowCreateModal(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredReviews.map((review, idx) => {
                const isPendente = review.status === 'pendente'
                return (
                  <motion.div
                    key={review.$id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="surface-interactive p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className={`badge-sm ${isPendente ? 'badge-warning' : 'badge-success'} inline-flex items-center gap-1`}>
                          {isPendente ? <Clock size={10} /> : <CheckCircle2 size={10} />}
                          {isPendente ? 'Pendente' : 'Concluída'}
                        </span>
                        <button
                          onClick={() => deleteMutation.mutate(review.$id)}
                          className="btn-icon text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-white mb-1 leading-snug">{review.titulo}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                        <Calendar size={13} className="text-indigo-400" />
                        Data: {review.data_revisao ? new Date(review.data_revisao).toLocaleDateString('pt-BR') : 'Hoje'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      {isPendente ? (
                        <button
                          onClick={() => completeMutation.mutate(review.$id)}
                          disabled={completeMutation.isPending}
                          className="btn-primary text-xs w-full justify-center"
                        >
                          <Check size={14} />
                          Concluir Revisão FSRS
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          Revisado com Sucesso
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Criar Revisão */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Revisão Manual"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-outline text-xs">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newTitle}
              className="btn-primary text-xs"
            >
              {createMutation.isPending ? 'Criando...' : 'Adicionar à Fila FSRS'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tópico a Revisar</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Ex: Fisiologia Renal - Filtração Glomerular"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data da Primeira Revisão</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
