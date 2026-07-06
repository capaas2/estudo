'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listQuestoes, createQuestao, deleteQuestao, updateQuestao } from '@/services/database/questoes'
import { listMaterias } from '@/services/database/materias'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import Modal from '@/components/shared/Modal'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, Plus, Search, Trash2, Star, StarOff, Filter,
  CheckCircle, ChevronDown, Sparkles,
} from 'lucide-react'
import type { Questao } from '@/types/database'

export default function QuestoesPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterDif, setFilterDif] = useState('')
  const [filterMateria, setFilterMateria] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  // Form
  const [newEnunciado, setNewEnunciado] = useState('')
  const [newTipo, setNewTipo] = useState<Questao['tipo']>('objetiva')
  const [newDif, setNewDif] = useState<Questao['dificuldade']>('medio')
  const [newMateria, setNewMateria] = useState('')
  const [newAlts, setNewAlts] = useState([
    { letra: 'A', texto: '' }, { letra: 'B', texto: '' },
    { letra: 'C', texto: '' }, { letra: 'D', texto: '' }, { letra: 'E', texto: '' },
  ])
  const [newGabarito, setNewGabarito] = useState('')
  const [newExplicacao, setNewExplicacao] = useState('')

  const { data: materias = [] } = useQuery({
    queryKey: ['materias', user?.$id],
    queryFn: () => listMaterias(user!.$id),
    enabled: !!user,
  })

  const { data: questoes = [], isLoading } = useQuery({
    queryKey: ['questoes', user?.$id, filterMateria, filterDif, filterTipo],
    queryFn: () => listQuestoes(user!.$id, {
      materia_id: filterMateria || undefined,
      dificuldade: (filterDif as Questao['dificuldade']) || undefined,
      tipo: (filterTipo as Questao['tipo']) || undefined,
    }),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createQuestao(user!.$id, {
      materia_id: newMateria || 'geral',
      tipo: newTipo,
      enunciado: newEnunciado,
      alternativas: newTipo === 'objetiva' ? newAlts.filter(a => a.texto.trim()) : undefined,
      gabarito: newGabarito,
      explicacao: newExplicacao,
      dificuldade: newDif,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] })
      setShowCreateModal(false)
      setNewEnunciado('')
      setNewGabarito('')
      setNewExplicacao('')
      setNewAlts([{ letra: 'A', texto: '' }, { letra: 'B', texto: '' }, { letra: 'C', texto: '' }, { letra: 'D', texto: '' }, { letra: 'E', texto: '' }])
    },
  })

  const toggleFav = useMutation({
    mutationFn: (q: Questao) => updateQuestao(q.$id, { favorita: !q.favorita }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questoes'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestao(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questoes'] }),
  })

  async function handleGenerate() {
    if (!generatePrompt.trim() || !user) return
    setGenerating(true)

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Gere 3 questões objetivas de múltipla escolha (5 alternativas A-E) sobre o tema: "${generatePrompt}". Formato JSON array: [{"enunciado":"...","alternativas":[{"letra":"A","texto":"..."},...],"gabarito":"A","explicacao":"...","dificuldade":"facil|medio|dificil"}]. Responda APENAS o JSON, sem markdown.` }] }],
        }),
      })
      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Parse JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const generated = JSON.parse(jsonMatch[0])
        for (const q of generated) {
          await createQuestao(user.$id, {
            materia_id: filterMateria || 'geral',
            tipo: 'objetiva',
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            gabarito: q.gabarito,
            explicacao: q.explicacao,
            dificuldade: q.dificuldade || 'medio',
          })
        }
        queryClient.invalidateQueries({ queryKey: ['questoes'] })
        setShowGenerateModal(false)
        setGeneratePrompt('')
      }
    } catch (err) {
      console.error('Erro ao gerar questões:', err)
    } finally {
      setGenerating(false)
    }
  }

  const filtered = questoes.filter(q =>
    q.enunciado.toLowerCase().includes(search.toLowerCase())
  )

  const difLabel: Record<string, { l: string; c: string }> = {
    facil: { l: 'Fácil', c: 'emerald' },
    medio: { l: 'Médio', c: 'amber' },
    dificil: { l: 'Difícil', c: 'rose' },
  }

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Banco de Questões</h1>
          <p className="page-subtitle">{questoes.length} questão(ões)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGenerateModal(true)} className="btn-secondary text-xs">
            <Sparkles size={14} />
            Gerar via IA
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-premium text-xs">
            <Plus size={14} />
            Nova Questão
          </button>
        </div>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="form-input pl-9 text-sm" />
          </div>
          <select value={filterMateria} onChange={e => setFilterMateria(e.target.value)} className="form-select text-xs w-36">
            <option value="">Todas matérias</option>
            {materias.map(m => <option key={m.$id} value={m.$id}>{m.nome}</option>)}
          </select>
          <select value={filterDif} onChange={e => setFilterDif(e.target.value)} className="form-select text-xs w-28">
            <option value="">Dificuldade</option>
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="form-select text-xs w-28">
            <option value="">Tipo</option>
            <option value="objetiva">Objetiva</option>
            <option value="discursiva">Discursiva</option>
          </select>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Database}
            title="Banco vazio"
            description="Adicione questões manualmente ou gere via IA."
            action={{ label: 'Criar Questão', onClick: () => setShowCreateModal(true) }}
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
                      <span className={`badge-sm badge-${difLabel[q.dificuldade]?.c || 'cyan'}`}>
                        {difLabel[q.dificuldade]?.l || q.dificuldade}
                      </span>
                      <span className="badge-sm badge-cyan">{q.tipo === 'objetiva' ? 'Objetiva' : 'Discursiva'}</span>
                      {q.banca && <span className="badge-sm badge-slate">{q.banca}</span>}
                    </div>
                    <p className="text-sm text-slate-200 mb-2 line-clamp-2">{q.enunciado}</p>

                    {q.tipo === 'objetiva' && q.alternativas && (
                      <>
                        <button
                          onClick={() => setExpandedId(expandedId === q.$id ? null : q.$id)}
                          className="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                        >
                          <ChevronDown size={12} className={`transition-transform ${expandedId === q.$id ? 'rotate-180' : ''}`} />
                          {expandedId === q.$id ? 'Ocultar' : 'Ver alternativas'}
                        </button>
                        <AnimatePresence>
                          {expandedId === q.$id && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1">
                              {q.alternativas.map(alt => (
                                <div key={alt.letra} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${alt.letra === q.gabarito ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400'}`}>
                                  {alt.letra === q.gabarito && <CheckCircle size={12} />}
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
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleFav.mutate(q)} className="btn-icon">
                      {q.favorita ? <Star size={14} className="fill-amber-400 text-amber-400" /> : <StarOff size={14} className="text-slate-600" />}
                    </button>
                    <button onClick={() => deleteMutation.mutate(q.$id)} className="btn-icon text-slate-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nova Questão" size="lg" footer={
        <>
          <button onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">Cancelar</button>
          <button onClick={() => createMutation.mutate()} disabled={!newEnunciado.trim()} className="btn-premium text-xs">{createMutation.isPending ? 'Criando...' : 'Criar'}</button>
        </>
      }>
        <div className="space-y-4">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Matéria</label>
              <select value={newMateria} onChange={e => setNewMateria(e.target.value)} className="form-select">
                <option value="">Selecione</option>
                {materias.map(m => <option key={m.$id} value={m.$id}>{m.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Dificuldade</label>
              <div className="flex gap-2">
                {(['facil', 'medio', 'dificil'] as const).map(d => (
                  <button key={d} onClick={() => setNewDif(d)} className={`chip ${newDif === d ? 'selected' : ''}`}>{difLabel[d].l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Enunciado</label>
            <textarea value={newEnunciado} onChange={e => setNewEnunciado(e.target.value)} placeholder="Digite o enunciado..." className="form-textarea" rows={4} />
          </div>
          {newTipo === 'objetiva' && (
            <div className="form-group">
              <label className="form-label">Alternativas</label>
              <div className="space-y-2">
                {newAlts.map((alt, idx) => (
                  <div key={alt.letra} className="flex items-center gap-2">
                    <button onClick={() => setNewGabarito(alt.letra)} className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-all ${newGabarito === alt.letra ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'}`}>{alt.letra}</button>
                    <input type="text" value={alt.texto} onChange={e => { const u = [...newAlts]; u[idx].texto = e.target.value; setNewAlts(u) }} placeholder={`Alternativa ${alt.letra}`} className="form-input text-sm flex-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Explicação (opcional)</label>
            <textarea value={newExplicacao} onChange={e => setNewExplicacao(e.target.value)} placeholder="Explicação..." className="form-textarea" rows={3} />
          </div>
        </div>
      </Modal>

      {/* Generate Modal */}
      <Modal open={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Gerar Questões via IA" footer={
        <>
          <button onClick={() => setShowGenerateModal(false)} className="btn-secondary text-xs">Cancelar</button>
          <button onClick={handleGenerate} disabled={!generatePrompt.trim() || generating} className="btn-premium text-xs">{generating ? 'Gerando...' : 'Gerar 3 Questões'}</button>
        </>
      }>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label">Tema</label>
            <textarea value={generatePrompt} onChange={e => setGeneratePrompt(e.target.value)} placeholder="Ex: Anatomia do coração, válvulas cardíacas e circulação coronariana" className="form-textarea" rows={3} autoFocus />
          </div>
          <p className="text-xs text-slate-500">A IA vai gerar 3 questões objetivas com gabarito e explicação. Requer GEMINI_API_KEY configurada.</p>
        </div>
      </Modal>
    </AppShell>
  )
}
