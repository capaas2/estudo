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
  Calendar, ChevronRight, Filter,
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

  const today = new Date().toISOString().split('T')[0]
  const pendentes = reviews.filter(r => r.status === 'pendente')
  const atrasadas = pendentes.filter(r => r.data_revisao < today)
  const paraHoje = pendentes.filter(r => r.data_revisao === today)

  const filtered = reviews.filter(r => filter === 'todas' || r.status === filter)

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Revisões</h1>
          <p className="page-subtitle">{pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''} • {atrasadas.length} atrasada{atrasadas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
          <Plus size={14} />
          Nova Revisão
        </button>
      </div>
      <div className="page-body">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <AlertCircle size={16} className="text-rose-400 mb-2" />
            <p className="text-2xl font-bold text-rose-400">{atrasadas.length}</p>
            <p className="text-xs text-slate-500">Atrasadas</p>
          </div>
          <div className="stat-card">
            <Clock size={16} className="text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-amber-400">{paraHoje.length}</p>
            <p className="text-xs text-slate-500">Para Hoje</p>
          </div>
          <div className="stat-card">
            <Check size={16} className="text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-emerald-400">{reviews.filter(r => r.status === 'concluida').length}</p>
            <p className="text-xs text-slate-500">Concluídas</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-4">
          {(['todas', 'pendente', 'concluida'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'tab-item-active' : 'tab-item'}>
              {f === 'todas' ? 'Todas' : f === 'pendente' ? 'Pendentes' : 'Concluídas'}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="Nenhuma revisão"
            description="Revisões são criadas automaticamente a partir de erros em simulados."
            action={{ label: 'Criar Revisão', onClick: () => setShowCreateModal(true) }}
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((review, i) => {
                const isOverdue = review.status === 'pendente' && review.data_revisao < today

                return (
                  <motion.div
                    key={review.$id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.02 }}
                    className={`glass-card p-4 flex items-center gap-4 ${isOverdue ? 'border-rose-500/20' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      review.status === 'concluida' ? 'bg-emerald-500/10' : isOverdue ? 'bg-rose-500/10' : 'bg-amber-500/10'
                    }`}>
                      {review.status === 'concluida'
                        ? <Check size={16} className="text-emerald-400" />
                        : isOverdue
                          ? <AlertCircle size={16} className="text-rose-400" />
                          : <Clock size={16} className="text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{review.titulo}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={10} />
                        {new Date(review.data_revisao).toLocaleDateString('pt-BR')}
                        {review.tipo === 'erro_simulado' && (
                          <span className="badge-sm badge-rose">Erro Simulado</span>
                        )}
                        {review.origem && <span className="truncate max-w-[150px]">• {review.origem}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {review.status === 'pendente' && (
                        <button
                          onClick={() => completeMutation.mutate(review.$id)}
                          className="btn-icon text-emerald-400 hover:bg-emerald-500/10"
                          title="Concluir"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(review.$id)}
                        className="btn-icon text-slate-500 hover:text-red-400"
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
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Revisão"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancelar</button>
            <button onClick={() => createMutation.mutate()} disabled={!newTitle.trim()} className="btn-premium text-xs">Criar</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Título</label>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="O que revisar?" className="form-input" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="form-input" />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
