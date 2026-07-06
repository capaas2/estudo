'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listFlashcards, createFlashcard, deleteFlashcard } from '@/services/database/flashcards'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Plus, Search, Trash2, RotateCcw, Eye, EyeOff, ChevronRight,
} from 'lucide-react'
import type { Flashcard } from '@/types/database'

interface FlashcardsTabProps {
  materiaId: string
  materiaNome: string
}

export default function FlashcardsTab({ materiaId, materiaNome }: FlashcardsTabProps) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({})
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [newDeck, setNewDeck] = useState('Geral')

  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['flashcards', user?.$id, materiaId],
    queryFn: () => listFlashcards(user!.$id, materiaId),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createFlashcard(user!.$id, {
      materia_id: materiaId,
      deck: newDeck,
      frente: newFront,
      verso: newBack,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setNewFront('')
      setNewBack('')
      // Mantém o modal aberto para criar mais
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFlashcard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
  })

  const filtered = flashcards.filter(f =>
    f.frente.toLowerCase().includes(search.toLowerCase()) ||
    f.verso.toLowerCase().includes(search.toLowerCase())
  )

  const stateLabel: Record<Flashcard['state'], { label: string; color: string }> = {
    new: { label: 'Novo', color: 'cyan' },
    learning: { label: 'Aprendendo', color: 'amber' },
    review: { label: 'Revisão', color: 'emerald' },
    relearning: { label: 'Reaprendendo', color: 'rose' },
  }

  const dueCount = flashcards.filter(f => f.due && new Date(f.due) <= new Date()).length

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-100">{flashcards.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-amber-400">{dueCount}</p>
          <p className="text-xs text-slate-500">Para Revisar</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-cyan-400">{flashcards.filter(f => f.state === 'new').length}</p>
          <p className="text-xs text-slate-500">Novos</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-emerald-400">{flashcards.filter(f => f.state === 'review').length}</p>
          <p className="text-xs text-slate-500">Maduros</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar flashcards..."
            className="form-input pl-9 text-sm"
          />
        </div>
        {dueCount > 0 && (
          <button className="btn-secondary text-xs">
            <RotateCcw size={14} />
            Revisar ({dueCount})
          </button>
        )}
        <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
          <Plus size={14} />
          Novo Flashcard
        </button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={search ? 'Nenhum flashcard encontrado' : 'Nenhum flashcard'}
          description="Crie flashcards manualmente ou gere via IA a partir de notas."
          action={!search ? { label: 'Criar Flashcard', onClick: () => setShowCreateModal(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((card, i) => (
              <motion.div
                key={card.$id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`badge-sm badge-${stateLabel[card.state].color}`}>
                    {stateLabel[card.state].label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowAnswer(prev => ({ ...prev, [card.$id]: !prev[card.$id] }))}
                      className="btn-icon"
                      title={showAnswer[card.$id] ? 'Ocultar resposta' : 'Mostrar resposta'}
                    >
                      {showAnswer[card.$id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(card.$id)}
                      className="btn-icon text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-200 font-medium mb-2">{card.frente}</p>

                <AnimatePresence>
                  {showAnswer[card.$id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/[0.06] pt-2 mt-2"
                    >
                      <p className="text-sm text-slate-400">{card.verso}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {card.deck && (
                  <p className="text-[0.6rem] text-slate-600 mt-2">Deck: {card.deck}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Flashcard"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Fechar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newFront.trim() || !newBack.trim() || createMutation.isPending}
              className="btn-premium text-xs"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar e Continuar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Deck</label>
            <input
              type="text"
              value={newDeck}
              onChange={e => setNewDeck(e.target.value)}
              placeholder="Nome do deck"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Frente (Pergunta)</label>
            <textarea
              value={newFront}
              onChange={e => setNewFront(e.target.value)}
              placeholder="Ex: O que é hipertensão arterial sistêmica?"
              className="form-textarea"
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Verso (Resposta)</label>
            <textarea
              value={newBack}
              onChange={e => setNewBack(e.target.value)}
              placeholder="Ex: Condição crônica caracterizada pela elevação sustentada..."
              className="form-textarea"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
