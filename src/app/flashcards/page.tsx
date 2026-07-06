'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listFlashcards, createFlashcard, updateFlashcard, deleteFlashcard } from '@/services/database/flashcards'
import { createFlashcardReview } from '@/services/database/flashcards'
import { schedule, previewSchedule, formatInterval } from '@/lib/fsrs'
import type { Rating } from '@/lib/fsrs'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, Plus, RotateCcw, Eye, EyeOff, Trash2, Search,
  ChevronRight, ArrowLeft,
} from 'lucide-react'
import type { Flashcard } from '@/types/database'

export default function FlashcardsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'browse' | 'review'>('browse')
  const [reviewIndex, setReviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [newDeck, setNewDeck] = useState('Geral')

  const { data: flashcards = [], isLoading } = useQuery({
    queryKey: ['flashcards', user?.$id],
    queryFn: () => listFlashcards(user!.$id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createFlashcard(user!.$id, {
      deck: newDeck,
      frente: newFront,
      verso: newBack,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setNewFront('')
      setNewBack('')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ card, rating }: { card: Flashcard; rating: Rating }) => {
      const result = schedule(card, rating)

      await updateFlashcard(card.$id, {
        stability: result.stability,
        difficulty: result.difficulty,
        state: result.state,
        due: result.due,
        reps: card.reps + 1,
        lapses: rating === 'again' ? card.lapses + 1 : card.lapses,
        last_review: new Date().toISOString(),
      })

      await createFlashcardReview(user!.$id, {
        flashcard_id: card.$id,
        rating,
        stability: result.stability,
        difficulty: result.difficulty,
        elapsed_days: result.elapsed_days,
        scheduled_days: result.scheduled_days,
        state: result.state,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      setShowAnswer(false)
      if (reviewIndex < dueCards.length - 1) {
        setReviewIndex(i => i + 1)
      } else {
        setMode('browse')
        setReviewIndex(0)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFlashcard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
  })

  const dueCards = flashcards.filter(f => !f.due || new Date(f.due) <= new Date())
  const filtered = flashcards.filter(f =>
    f.frente.toLowerCase().includes(search.toLowerCase()) ||
    f.verso.toLowerCase().includes(search.toLowerCase())
  )

  // Group by deck
  const decks = filtered.reduce<Record<string, Flashcard[]>>((acc, card) => {
    const deck = card.deck || 'Sem Deck'
    if (!acc[deck]) acc[deck] = []
    acc[deck].push(card)
    return acc
  }, {})

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  // REVIEW MODE
  if (mode === 'review' && dueCards.length > 0) {
    const card = dueCards[reviewIndex]
    if (!card) { setMode('browse'); return null }
    const preview = previewSchedule(card)

    return (
      <AppShell>
        <div className="page-header">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('browse')} className="btn-icon">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="page-title">Revisão de Flashcards</h1>
              <p className="page-subtitle">{reviewIndex + 1} de {dueCards.length}</p>
            </div>
          </div>
        </div>
        <div className="page-body max-w-2xl">
          {/* Progress */}
          <div className="progress-bar mb-6">
            <div className="progress-bar-fill" style={{ width: `${((reviewIndex + 1) / dueCards.length) * 100}%` }} />
          </div>

          {/* Card */}
          <motion.div
            key={card.$id + (showAnswer ? '-a' : '-q')}
            initial={{ opacity: 0, rotateY: showAnswer ? 180 : 0 }}
            animate={{ opacity: 1, rotateY: 0 }}
            className="glass-card p-8 min-h-[280px] flex flex-col items-center justify-center text-center"
          >
            <p className="text-lg text-slate-200 font-medium leading-relaxed">
              {showAnswer ? card.verso : card.frente}
            </p>
            {!showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                className="btn-premium mt-6 text-xs"
              >
                <Eye size={14} />
                Mostrar Resposta
              </button>
            )}
          </motion.div>

          {/* Rating buttons */}
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-4 gap-3 mt-4"
            >
              {([
                { rating: 'again' as Rating, label: 'Errei', color: 'rose', sub: preview.again.label },
                { rating: 'hard' as Rating, label: 'Difícil', color: 'amber', sub: preview.hard.label },
                { rating: 'good' as Rating, label: 'Bom', color: 'emerald', sub: preview.good.label },
                { rating: 'easy' as Rating, label: 'Fácil', color: 'cyan', sub: preview.easy.label },
              ]).map(btn => (
                <button
                  key={btn.rating}
                  onClick={() => reviewMutation.mutate({ card, rating: btn.rating })}
                  disabled={reviewMutation.isPending}
                  className={`glass-card p-3 text-center transition-all hover:border-${btn.color}-500/30 hover:bg-${btn.color}-500/5`}
                >
                  <p className={`text-sm font-semibold text-${btn.color}-400`}>{btn.label}</p>
                  <p className="text-[0.6rem] text-slate-500 mt-0.5">{btn.sub}</p>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </AppShell>
    )
  }

  // BROWSE MODE
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Flashcards</h1>
          <p className="page-subtitle">{flashcards.length} cards • {dueCards.length} para revisar</p>
        </div>
        <div className="flex items-center gap-2">
          {dueCards.length > 0 && (
            <button
              onClick={() => { setMode('review'); setReviewIndex(0); setShowAnswer(false) }}
              className="btn-secondary text-xs"
            >
              <RotateCcw size={14} />
              Revisar ({dueCards.length})
            </button>
          )}
          <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
            <Plus size={14} />
            Novo Flashcard
          </button>
        </div>
      </div>
      <div className="page-body">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar flashcards..."
            className="form-input pl-9 text-sm"
          />
        </div>

        {flashcards.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Nenhum flashcard"
            description="Crie flashcards manualmente ou gere via IA."
            action={{ label: 'Criar Flashcard', onClick: () => setShowCreateModal(true) }}
          />
        ) : (
          Object.entries(decks).map(([deckName, cards]) => (
            <div key={deckName} className="mb-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                {deckName} ({cards.length})
              </h2>
              <div className="space-y-2">
                {cards.map(card => (
                  <div key={card.$id} className="glass-card p-4 flex items-center gap-4 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{card.frente}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{card.verso}</p>
                    </div>
                    <span className={`badge-sm badge-${
                      card.state === 'new' ? 'cyan' : card.state === 'review' ? 'emerald' : 'amber'
                    }`}>
                      {card.state === 'new' ? 'Novo' : card.state === 'review' ? 'Revisão' : 'Aprendendo'}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(card.$id)}
                      className="btn-icon text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

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
            <input type="text" value={newDeck} onChange={e => setNewDeck(e.target.value)} placeholder="Geral" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Frente (Pergunta)</label>
            <textarea value={newFront} onChange={e => setNewFront(e.target.value)} placeholder="Pergunta..." className="form-textarea" rows={3} />
          </div>
          <div className="form-group">
            <label className="form-label">Verso (Resposta)</label>
            <textarea value={newBack} onChange={e => setNewBack(e.target.value)} placeholder="Resposta..." className="form-textarea" rows={3} />
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
