'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listReviews, createReview, updateReview, deleteReview } from '@/services/database/reviews'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, Plus, Check, Clock, AlertCircle, ChevronRight, Trash2, Calendar,
} from 'lucide-react'
import type { Review } from '@/types/database'

interface ReviewsTabProps {
  materiaId: string
}

export default function ReviewsTab({ materiaId }: ReviewsTabProps) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [filter, setFilter] = useState<'todas' | 'pendente' | 'concluida'>('todas')

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', user?.$id, materiaId],
    queryFn: () => listReviews(user!.$id, materiaId),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createReview(user!.$id, {
      titulo: newTitle,
      materia_id: materiaId,
      data_revisao: newDate,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setShowCreateModal(false)
      setNewTitle('')
    },
  })

  const completeMutation = useMutation({
    mutationFn: (reviewId: string) => updateReview(reviewId, {
      status: 'concluida',
      proxima_revisao: getNextReviewDate(1).toISOString().split('T')[0],
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  })

  function getNextReviewDate(intervalDays: number): Date {
    const d = new Date()
    d.setDate(d.getDate() + intervalDays)
    return d
  }

  const filtered = reviews.filter(r => filter === 'todas' || r.status === filter)
  const today = new Date().toISOString().split('T')[0]
  const pendentes = reviews.filter(r => r.status === 'pendente')
  const atrasadas = pendentes.filter(r => r.data_revisao < today)
  const paraHoje = pendentes.filter(r => r.data_revisao === today)
  const futuras = pendentes.filter(r => r.data_revisao > today)

  const statusConfig: Record<Review['status'], { icon: typeof Check; color: string; label: string }> = {
    pendente: { icon: Clock, color: 'amber', label: 'Pendente' },
    concluida: { icon: Check, color: 'emerald', label: 'Concluída' },
    adiada: { icon: AlertCircle, color: 'rose', label: 'Adiada' },
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-rose-400" />
            <span className="text-xs text-slate-400">Atrasadas</span>
          </div>
          <p className="text-xl font-bold text-rose-400">{atrasadas.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-400" />
            <span className="text-xs text-slate-400">Hoje</span>
          </div>
          <p className="text-xl font-bold text-amber-400">{paraHoje.length}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-cyan-400" />
            <span className="text-xs text-slate-400">Futuras</span>
          </div>
          <p className="text-xl font-bold text-cyan-400">{futuras.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['todas', 'pendente', 'concluida'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'tab-item-active' : 'tab-item'}
            >
              {f === 'todas' ? 'Todas' : f === 'pendente' ? 'Pendentes' : 'Concluídas'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
          <Plus size={14} />
          Nova Revisão
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="Nenhuma revisão"
          description="Revisões são criadas automaticamente a partir de erros em simulados, ou manualmente."
          action={{ label: 'Criar Revisão', onClick: () => setShowCreateModal(true) }}
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((review, i) => {
              const config = statusConfig[review.status]
              const isOverdue = review.status === 'pendente' && review.data_revisao < today
              return (
                <motion.div
                  key={review.$id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass-card p-4 flex items-center gap-4 ${isOverdue ? 'border-rose-500/20' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-${config.color}-500/10 text-${config.color}-400`}>
                    <config.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{review.titulo}</p>
                    <p className={`text-xs ${isOverdue ? 'text-rose-400' : 'text-slate-500'}`}>
                      {isOverdue ? `Atrasada desde ${new Date(review.data_revisao).toLocaleDateString('pt-BR')}` :
                        `Agendada para ${new Date(review.data_revisao).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {review.status === 'pendente' && (
                      <button
                        onClick={() => completeMutation.mutate(review.$id)}
                        className="btn-icon text-emerald-400 hover:bg-emerald-500/10"
                        title="Marcar como concluída"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(review.$id)}
                      className="btn-icon text-slate-500 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Revisão"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || createMutation.isPending}
              className="btn-premium text-xs"
            >
              Criar Revisão
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Título</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="O que você precisa revisar?"
              className="form-input"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data da Revisão</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
