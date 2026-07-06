'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listNotes, createNote, updateNote, deleteNote } from '@/services/database/notes'
import { createFlashcard } from '@/services/database/flashcards'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Search, Trash2, Star, StarOff,
  Calendar, BookOpen, Sparkles, Layers, Wand2, Loader2,
  CheckCircle,
} from 'lucide-react'
import type { Note } from '@/types/database'

interface NotesTabProps {
  materiaId: string
}

export default function NotesTab({ materiaId }: NotesTabProps) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTipo, setNewTipo] = useState<Note['tipo']>('comum')
  const [newConteudo, setNewConteudo] = useState('')

  // IA generation state
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false)
  const [generatingMnemonics, setGeneratingMnemonics] = useState(false)
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(0)
  const [mnemonicsResult, setMnemonicsResult] = useState<{
    acronimo?: { titulo: string; explicacao: string }
    historia?: { titulo: string; texto: string }
    visual?: { titulo: string; descricao: string }
  } | null>(null)
  const [showMnemonicsModal, setShowMnemonicsModal] = useState(false)

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', user?.$id, materiaId],
    queryFn: () => listNotes(user!.$id, materiaId),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createNote(user!.$id, {
      titulo: newTitle,
      materia_id: materiaId,
      tipo: newTipo,
      conteudo: newConteudo ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: newConteudo }] }] } : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setShowCreateModal(false)
      setNewTitle('')
      setNewTipo('comum')
      setNewConteudo('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      setSelectedNote(null)
    },
  })

  const toggleFav = useMutation({
    mutationFn: (note: Note) => updateNote(note.$id, { is_favorita: !note.is_favorita }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })

  async function handleGenerateFlashcards(note: Note) {
    if (!user) return
    setGeneratingFlashcards(true)
    setFlashcardsGenerated(0)

    try {
      const text = `${note.titulo}\n${typeof note.conteudo === 'string' ? note.conteudo : JSON.stringify(note.conteudo || '')}`

      const response = await fetch('/api/flashcards-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, count: 5 }),
      })

      const data = await response.json()
      if (data.flashcards && Array.isArray(data.flashcards)) {
        for (const fc of data.flashcards) {
          await createFlashcard(user.$id, {
            materia_id: materiaId,
            deck: note.titulo,
            frente: fc.frente,
            verso: fc.verso,
          })
          setFlashcardsGenerated(prev => prev + 1)
        }
        queryClient.invalidateQueries({ queryKey: ['flashcards'] })
      }
    } catch (err) {
      console.error('Erro ao gerar flashcards:', err)
    } finally {
      setGeneratingFlashcards(false)
    }
  }

  async function handleGenerateMnemonics(note: Note) {
    setGeneratingMnemonics(true)
    setMnemonicsResult(null)

    try {
      const response = await fetch('/api/mnemonicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: note.titulo }),
      })

      const data = await response.json()
      if (data.mnemonics) {
        setMnemonicsResult(data.mnemonics)
        setShowMnemonicsModal(true)
      }
    } catch (err) {
      console.error('Erro ao gerar mnemônicos:', err)
    } finally {
      setGeneratingMnemonics(false)
    }
  }

  const filtered = notes.filter(n =>
    n.titulo.toLowerCase().includes(search.toLowerCase())
  )

  const tipoLabel: Record<Note['tipo'], { label: string; color: string }> = {
    'comum': { label: 'Nota', color: 'cyan' },
    'resumo-ia': { label: 'Resumo IA', color: 'violet' },
    'tutoria': { label: 'Tutoria', color: 'emerald' },
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar notas..." className="form-input pl-9 text-sm" />
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
          <Plus size={14} />
          Nova Nota
        </button>
      </div>

      {/* Notes Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
          description={search ? 'Tente outro termo de busca.' : 'Crie sua primeira nota para começar a organizar seus estudos.'}
          action={!search ? { label: 'Criar Nota', onClick: () => setShowCreateModal(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((note, i) => (
              <motion.div
                key={note.$id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card-hover p-5 cursor-pointer group"
                onClick={() => setSelectedNote(note)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`badge-sm badge-${tipoLabel[note.tipo].color}`}>
                    {tipoLabel[note.tipo].label}
                  </span>
                  <button onClick={e => { e.stopPropagation(); toggleFav.mutate(note) }} className="p-1 text-slate-600 hover:text-amber-400 transition-colors">
                    {note.is_favorita ? <Star size={14} className="fill-amber-400 text-amber-400" /> : <StarOff size={14} />}
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2 line-clamp-2">{note.titulo}</h3>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[0.65rem] text-slate-600">
                  <Calendar size={10} />
                  {new Date(note.$updatedAt).toLocaleDateString('pt-BR')}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nova Nota" footer={
        <>
          <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancelar</button>
          <button onClick={() => createMutation.mutate()} disabled={!newTitle.trim() || createMutation.isPending} className="btn-premium text-xs">
            {createMutation.isPending ? 'Criando...' : 'Criar Nota'}
          </button>
        </>
      }>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Título</label>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título da nota" className="form-input" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div className="flex gap-2">
              {(['comum', 'resumo-ia', 'tutoria'] as const).map(tipo => (
                <button key={tipo} onClick={() => setNewTipo(tipo)} className={`chip ${newTipo === tipo ? 'selected' : ''}`}>
                  {tipo === 'comum' && <FileText size={12} className="inline mr-1" />}
                  {tipo === 'resumo-ia' && <Sparkles size={12} className="inline mr-1" />}
                  {tipo === 'tutoria' && <BookOpen size={12} className="inline mr-1" />}
                  {tipoLabel[tipo].label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Conteúdo</label>
            <textarea value={newConteudo} onChange={e => setNewConteudo(e.target.value)} placeholder="Escreva o conteúdo da nota..." className="form-textarea" rows={6} />
          </div>
        </div>
      </Modal>

      {/* Note Detail Modal */}
      <Modal
        open={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        title={selectedNote?.titulo}
        size="lg"
        footer={
          <>
            <button onClick={() => selectedNote && deleteMutation.mutate(selectedNote.$id)} className="btn-danger text-xs">
              <Trash2 size={14} /> Excluir
            </button>
            <div className="flex-1" />
            <button onClick={() => setSelectedNote(null)} className="btn-secondary text-xs">Fechar</button>
          </>
        }
      >
        {selectedNote && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`badge-sm badge-${tipoLabel[selectedNote.tipo].color}`}>
                {tipoLabel[selectedNote.tipo].label}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(selectedNote.$updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Content */}
            <div className="min-h-[200px] bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
              {selectedNote.conteudo ? (
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {typeof selectedNote.conteudo === 'string' ? selectedNote.conteudo : JSON.stringify(selectedNote.conteudo)}
                </p>
              ) : (
                <p className="text-sm text-slate-500 italic">Nota sem conteúdo de texto.</p>
              )}
            </div>

            {/* IA Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => handleGenerateFlashcards(selectedNote)}
                disabled={generatingFlashcards}
                className="btn-secondary text-xs"
              >
                {generatingFlashcards ? (
                  <><Loader2 size={12} className="animate-spin" /> Gerando ({flashcardsGenerated})...</>
                ) : flashcardsGenerated > 0 ? (
                  <><CheckCircle size={12} className="text-emerald-400" /> {flashcardsGenerated} Flashcards Criados</>
                ) : (
                  <><Layers size={12} /> Gerar Flashcards</>
                )}
              </button>
              <button
                onClick={() => handleGenerateMnemonics(selectedNote)}
                disabled={generatingMnemonics}
                className="btn-secondary text-xs"
              >
                {generatingMnemonics ? (
                  <><Loader2 size={12} className="animate-spin" /> Gerando...</>
                ) : (
                  <><Wand2 size={12} /> Gerar Mnemônicos</>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Mnemonics Modal */}
      <Modal
        open={showMnemonicsModal}
        onClose={() => setShowMnemonicsModal(false)}
        title="Mnemônicos Gerados"
        size="lg"
        footer={
          <button onClick={() => setShowMnemonicsModal(false)} className="btn-premium text-xs">Fechar</button>
        }
      >
        {mnemonicsResult && (
          <div className="space-y-4">
            {mnemonicsResult.acronimo && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">🔤 Acrônimo</h4>
                <p className="text-sm font-semibold text-slate-200 mb-1">{mnemonicsResult.acronimo.titulo}</p>
                <p className="text-xs text-slate-400">{mnemonicsResult.acronimo.explicacao}</p>
              </div>
            )}
            {mnemonicsResult.historia && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">📖 História</h4>
                <p className="text-sm font-semibold text-slate-200 mb-1">{mnemonicsResult.historia.titulo}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{mnemonicsResult.historia.texto}</p>
              </div>
            )}
            {mnemonicsResult.visual && (
              <div className="glass-card p-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">🎨 Associação Visual</h4>
                <p className="text-sm font-semibold text-slate-200 mb-1">{mnemonicsResult.visual.titulo}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{mnemonicsResult.visual.descricao}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
