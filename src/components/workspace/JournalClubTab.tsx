'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import EmptyState from '@/components/shared/EmptyState'
import { Newspaper, Plus, ExternalLink, Calendar, BookOpen } from 'lucide-react'
import Modal from '@/components/shared/Modal'

interface JournalClubTabProps {
  materiaId: string
}

interface JournalEntry {
  id: string
  titulo: string
  autores: string
  journal: string
  ano: number
  url?: string
  resumo?: string
  discussao?: string
  createdAt: Date
}

export default function JournalClubTab({ materiaId }: JournalClubTabProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitulo, setNewTitulo] = useState('')
  const [newAutores, setNewAutores] = useState('')
  const [newJournal, setNewJournal] = useState('')
  const [newAno, setNewAno] = useState(new Date().getFullYear())
  const [newUrl, setNewUrl] = useState('')

  function handleCreate() {
    if (!newTitulo.trim()) return
    const entry: JournalEntry = {
      id: Date.now().toString(),
      titulo: newTitulo,
      autores: newAutores,
      journal: newJournal,
      ano: newAno,
      url: newUrl || undefined,
      createdAt: new Date(),
    }
    setEntries(prev => [entry, ...prev])
    setShowCreateModal(false)
    setNewTitulo('')
    setNewAutores('')
    setNewJournal('')
    setNewUrl('')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Registro de artigos discutidos em sessões de Clube de Revista
        </p>
        <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
          <Plus size={14} />
          Novo Artigo
        </button>
      </div>

      {/* List */}
      {entries.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Nenhum artigo registrado"
          description="Adicione artigos discutidos no clube de revista da sua turma."
          action={{ label: 'Adicionar Artigo', onClick: () => setShowCreateModal(true) }}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">{entry.titulo}</h3>
                  <p className="text-xs text-slate-400 mb-2">{entry.autores}</p>
                  <div className="flex items-center gap-3 text-[0.65rem] text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen size={10} />
                      {entry.journal}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {entry.ano}
                    </span>
                  </div>
                </div>
                {entry.url && (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon text-cyan-400"
                    title="Abrir artigo"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Artigo — Clube de Revista"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancelar</button>
            <button onClick={handleCreate} disabled={!newTitulo.trim()} className="btn-premium text-xs">
              Adicionar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Título do Artigo</label>
            <input
              type="text"
              value={newTitulo}
              onChange={e => setNewTitulo(e.target.value)}
              placeholder="Ex: Effect of intensive vs standard blood-pressure control..."
              className="form-input"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Autores</label>
            <input
              type="text"
              value={newAutores}
              onChange={e => setNewAutores(e.target.value)}
              placeholder="Ex: Smith J, Johnson A, et al."
              className="form-input"
            />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Journal</label>
              <input
                type="text"
                value={newJournal}
                onChange={e => setNewJournal(e.target.value)}
                placeholder="Ex: NEJM"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Ano</label>
              <input
                type="number"
                value={newAno}
                onChange={e => setNewAno(parseInt(e.target.value) || 2024)}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">URL (opcional)</label>
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
              className="form-input"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
