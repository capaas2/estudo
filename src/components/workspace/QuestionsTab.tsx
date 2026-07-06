'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listQuestoes, createQuestao, deleteQuestao } from '@/services/database/questoes'
import Modal from '@/components/shared/Modal'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Plus, Search, Trash2, Filter, Star, StarOff,
  CheckCircle, XCircle, ChevronDown, Tag,
} from 'lucide-react'
import type { Questao } from '@/types/database'

interface QuestionsTabProps {
  materiaId: string
}

export default function QuestionsTab({ materiaId }: QuestionsTabProps) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterDificuldade, setFilterDificuldade] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Form state
  const [newEnunciado, setNewEnunciado] = useState('')
  const [newTipo, setNewTipo] = useState<Questao['tipo']>('objetiva')
  const [newDificuldade, setNewDificuldade] = useState<Questao['dificuldade']>('medio')
  const [newAlternativas, setNewAlternativas] = useState([
    { letra: 'A', texto: '' }, { letra: 'B', texto: '' },
    { letra: 'C', texto: '' }, { letra: 'D', texto: '' }, { letra: 'E', texto: '' },
  ])
  const [newGabarito, setNewGabarito] = useState('')
  const [newExplicacao, setNewExplicacao] = useState('')

  const { data: questoes = [], isLoading } = useQuery({
    queryKey: ['questoes', user?.$id, materiaId],
    queryFn: () => listQuestoes(user!.$id, { materia_id: materiaId }),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createQuestao(user!.$id, {
      materia_id: materiaId,
      tipo: newTipo,
      enunciado: newEnunciado,
      alternativas: newTipo === 'objetiva' ? newAlternativas.filter(a => a.texto.trim()) : undefined,
      gabarito: newGabarito,
      explicacao: newExplicacao,
      dificuldade: newDificuldade,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] })
      setShowCreateModal(false)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestao(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questoes'] }),
  })

  function resetForm() {
    setNewEnunciado('')
    setNewTipo('objetiva')
    setNewDificuldade('medio')
    setNewAlternativas([
      { letra: 'A', texto: '' }, { letra: 'B', texto: '' },
      { letra: 'C', texto: '' }, { letra: 'D', texto: '' }, { letra: 'E', texto: '' },
    ])
    setNewGabarito('')
    setNewExplicacao('')
  }

  const filtered = questoes.filter(q => {
    const matchSearch = q.enunciado.toLowerCase().includes(search.toLowerCase())
    const matchDif = !filterDificuldade || q.dificuldade === filterDificuldade
    return matchSearch && matchDif
  })

  const difLabel: Record<Questao['dificuldade'], { label: string; color: string }> = {
    facil: { label: 'Fácil', color: 'emerald' },
    medio: { label: 'Médio', color: 'amber' },
    dificil: { label: 'Difícil', color: 'rose' },
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar questões..."
            className="form-input pl-9 text-sm"
          />
        </div>
        <select
          value={filterDificuldade}
          onChange={e => setFilterDificuldade(e.target.value)}
          className="form-select text-xs w-32"
        >
          <option value="">Todas</option>
          <option value="facil">Fácil</option>
          <option value="medio">Médio</option>
          <option value="dificil">Difícil</option>
        </select>
        <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
          <Plus size={14} />
          Nova Questão
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span>{questoes.length} questões</span>
        <span>•</span>
        <span className="text-emerald-400">{questoes.filter(q => q.dificuldade === 'facil').length} fáceis</span>
        <span className="text-amber-400">{questoes.filter(q => q.dificuldade === 'medio').length} médias</span>
        <span className="text-rose-400">{questoes.filter(q => q.dificuldade === 'dificil').length} difíceis</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search ? 'Nenhuma questão encontrada' : 'Banco vazio'}
          description="Adicione questões manualmente ou importe de um PDF via IA."
          action={!search ? { label: 'Criar Questão', onClick: () => setShowCreateModal(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <motion.div
              key={q.$id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-slate-600 font-mono mt-0.5 shrink-0">Q{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge-sm badge-${difLabel[q.dificuldade].color}`}>
                      {difLabel[q.dificuldade].label}
                    </span>
                    <span className="badge-sm badge-cyan">{q.tipo === 'objetiva' ? 'Objetiva' : 'Discursiva'}</span>
                  </div>
                  <p className="text-sm text-slate-200 mb-2 line-clamp-2">{q.enunciado}</p>

                  {/* Alternativas colapsáveis */}
                  {q.tipo === 'objetiva' && q.alternativas && (
                    <button
                      onClick={() => setExpandedId(expandedId === q.$id ? null : q.$id)}
                      className="text-xs text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
                    >
                      <ChevronDown size={12} className={`transition-transform ${expandedId === q.$id ? 'rotate-180' : ''}`} />
                      {expandedId === q.$id ? 'Ocultar alternativas' : 'Ver alternativas'}
                    </button>
                  )}

                  <AnimatePresence>
                    {expandedId === q.$id && q.alternativas && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 space-y-1"
                      >
                        {q.alternativas.map(alt => (
                          <div
                            key={alt.letra}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                              alt.letra === q.gabarito
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'text-slate-400'
                            }`}
                          >
                            {alt.letra === q.gabarito ? <CheckCircle size={12} /> : <span className="w-3" />}
                            <span className="font-semibold">{alt.letra})</span>
                            <span>{alt.texto}</span>
                          </div>
                        ))}
                        {q.explicacao && (
                          <div className="mt-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                            <p className="text-xs text-slate-500"><span className="font-semibold text-slate-400">Explicação:</span> {q.explicacao}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(q.$id)}
                  className="btn-icon text-slate-500 hover:text-red-400 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm() }}
        title="Nova Questão"
        size="lg"
        footer={
          <>
            <button onClick={() => { setShowCreateModal(false); resetForm() }} className="btn-secondary text-xs">Cancelar</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newEnunciado.trim() || createMutation.isPending}
              className="btn-premium text-xs"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Questão'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div className="flex gap-2">
                {(['objetiva', 'discursiva'] as const).map(t => (
                  <button key={t} onClick={() => setNewTipo(t)} className={`chip ${newTipo === t ? 'selected' : ''}`}>
                    {t === 'objetiva' ? 'Objetiva' : 'Discursiva'}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Dificuldade</label>
              <div className="flex gap-2">
                {(['facil', 'medio', 'dificil'] as const).map(d => (
                  <button key={d} onClick={() => setNewDificuldade(d)} className={`chip ${newDificuldade === d ? 'selected' : ''}`}>
                    {difLabel[d].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Enunciado</label>
            <textarea
              value={newEnunciado}
              onChange={e => setNewEnunciado(e.target.value)}
              placeholder="Digite o enunciado da questão..."
              className="form-textarea"
              rows={4}
            />
          </div>

          {newTipo === 'objetiva' && (
            <>
              <div className="form-group">
                <label className="form-label">Alternativas</label>
                <div className="space-y-2">
                  {newAlternativas.map((alt, idx) => (
                    <div key={alt.letra} className="flex items-center gap-2">
                      <button
                        onClick={() => setNewGabarito(alt.letra)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-all ${
                          newGabarito === alt.letra
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        {alt.letra}
                      </button>
                      <input
                        type="text"
                        value={alt.texto}
                        onChange={e => {
                          const updated = [...newAlternativas]
                          updated[idx].texto = e.target.value
                          setNewAlternativas(updated)
                        }}
                        placeholder={`Alternativa ${alt.letra}`}
                        className="form-input text-sm flex-1"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[0.6rem] text-slate-600 mt-1 ml-1">Clique na letra para selecionar o gabarito</p>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Explicação (opcional)</label>
            <textarea
              value={newExplicacao}
              onChange={e => setNewExplicacao(e.target.value)}
              placeholder="Explicação do gabarito..."
              className="form-textarea"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
