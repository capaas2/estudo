'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import { gerarFlashcardsIA } from '@/services/iaService'
import AppShell from '@/components/layout/AppShell'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Plus, RotateCcw, X, Save, Brain, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

interface FlashcardData {
  id: string; frente: string; verso: string; deck: string; tags?: string[]; materia_id?: string
}

export default function FlashcardsPage() {
  const toast = useToast()
  const [cards, setCards] = useState<FlashcardData[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string }[]>([])
  const [deckFilter, setDeckFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showStudy, setShowStudy] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showIAForm, setShowIAForm] = useState(false)
  const [iaContent, setIaContent] = useState('')
  const [iaMateria, setIaMateria] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [formData, setFormData] = useState({ frente: '', verso: '', deck: 'Geral', materia_id: '' })

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: f }, { data: m }] = await Promise.all([
      supabase.from('flashcards').select('*').order('criado_em', { ascending: false }),
      supabase.from('materias').select('id, nome'),
    ])
    setCards(f || [])
    setMaterias(m || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const decks = [...new Set(cards.map(c => c.deck))]
  const filtered = deckFilter ? cards.filter(c => c.deck === deckFilter) : cards

  async function criar() {
    if (!formData.frente || !formData.verso) return toast('Preencha frente e verso.', 'error')
    await supabase.from('flashcards').insert({
      frente: formData.frente, verso: formData.verso, deck: formData.deck || 'Geral',
      materia_id: formData.materia_id || null
    })
    toast('Flashcard criado!', 'success')
    setShowForm(false)
    setFormData({ frente: '', verso: '', deck: 'Geral', materia_id: '' })
    carregar()
  }

  async function gerarIA() {
    if (!iaContent || !iaMateria) return toast('Preencha conteúdo e matéria.', 'error')
    setIaLoading(true)
    try {
      const result = await gerarFlashcardsIA(iaContent, iaMateria, 10)
      const flashcards = (result as { flashcards: { frente: string; verso: string; tags?: string[] }[] }).flashcards || []
      if (flashcards.length === 0) return toast('IA não gerou flashcards.', 'error')
      for (const fc of flashcards) {
        await supabase.from('flashcards').insert({
          frente: fc.frente, verso: fc.verso, deck: iaMateria, tags: fc.tags || []
        })
      }
      toast(`${flashcards.length} flashcards gerados pela IA! 🧠`, 'success')
      setShowIAForm(false)
      carregar()
    } catch { toast('Erro ao gerar flashcards.', 'error') }
    setIaLoading(false)
  }

  function startStudy() {
    if (filtered.length === 0) return toast('Nenhum flashcard para estudar.', 'error')
    setCurrentIdx(0)
    setFlipped(false)
    setShowStudy(true)
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flashcards</h2>
          <p className="text-slate-500 text-sm mt-0.5">{cards.length} cards · {decks.length} decks</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowIAForm(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors flex items-center gap-2">
            <Brain size={16} /> Gerar com IA
          </button>
          <button onClick={() => setShowForm(true)} className="btn-premium"><Plus size={16} /> Novo Card</button>
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* Deck filters */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setDeckFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!deckFilter ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'}`}>
            Todos ({cards.length})
          </button>
          {decks.map(d => (
            <button key={d} onClick={() => setDeckFilter(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${deckFilter === d ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'}`}>
              {d} ({cards.filter(c => c.deck === d).length})
            </button>
          ))}
        </div>

        {/* Study button */}
        {filtered.length > 0 && (
          <button onClick={startStudy} className="btn-premium"><RotateCcw size={16} /> Estudar ({filtered.length} cards)</button>
        )}

        {/* Cards grid */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={48} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500">Nenhum flashcard ainda.</p>
            <p className="text-slate-600 text-sm mt-1">Crie manualmente ou gere com IA!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 30).map(c => (
              <div key={c.id} className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge-sm bg-violet-500/10 text-violet-400">{c.deck}</span>
                </div>
                <p className="text-sm font-semibold text-slate-200">{c.frente}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{c.verso}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study Mode */}
      <AnimatePresence>
        {showStudy && filtered.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0e1a]/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-4">
            <button onClick={() => setShowStudy(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-300"><X size={24} /></button>
            <p className="text-sm text-slate-500 mb-4">{currentIdx + 1} / {filtered.length}</p>
            <motion.div
              key={currentIdx + '-' + String(flipped)}
              initial={{ rotateY: 90 }} animate={{ rotateY: 0 }}
              className="glass-card p-10 w-full max-w-xl min-h-[250px] flex items-center justify-center cursor-pointer"
              onClick={() => setFlipped(!flipped)}
            >
              <p className={`text-center ${flipped ? 'text-base text-slate-300' : 'text-xl font-bold text-slate-100'}`}>
                {flipped ? filtered[currentIdx].verso : filtered[currentIdx].frente}
              </p>
            </motion.div>
            <p className="text-xs text-slate-600 mt-3">Clique para virar</p>
            <div className="flex gap-4 mt-6">
              <button onClick={() => { setCurrentIdx(Math.max(0, currentIdx - 1)); setFlipped(false) }}
                disabled={currentIdx === 0} className="p-3 rounded-xl bg-white/[0.04] text-slate-400 disabled:opacity-30">
                <ArrowLeft size={20} />
              </button>
              <button onClick={() => { setCurrentIdx(Math.min(filtered.length - 1, currentIdx + 1)); setFlipped(false) }}
                disabled={currentIdx === filtered.length - 1} className="p-3 rounded-xl bg-white/[0.04] text-slate-400 disabled:opacity-30">
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Novo Flashcard</h3>
              <div className="space-y-3">
                <textarea placeholder="Frente (pergunta)" value={formData.frente} onChange={e => setFormData({ ...formData, frente: e.target.value })} className="input-dark min-h-[80px]" />
                <textarea placeholder="Verso (resposta)" value={formData.verso} onChange={e => setFormData({ ...formData, verso: e.target.value })} className="input-dark min-h-[80px]" />
                <input placeholder="Deck" value={formData.deck} onChange={e => setFormData({ ...formData, deck: e.target.value })} className="input-dark" />
              </div>
              <button onClick={criar} className="btn-premium w-full justify-center mt-4"><Save size={16} /> Criar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* IA Modal */}
      <AnimatePresence>
        {showIAForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowIAForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Brain size={20} className="text-violet-400" /> Gerar Flashcards com IA</h3>
              <div className="space-y-3">
                <input placeholder="Matéria / Assunto" value={iaMateria} onChange={e => setIaMateria(e.target.value)} className="input-dark" />
                <textarea placeholder="Cole aqui o conteúdo para gerar flashcards..." value={iaContent} onChange={e => setIaContent(e.target.value)} className="input-dark min-h-[150px]" />
              </div>
              <button onClick={gerarIA} disabled={iaLoading} className="btn-premium w-full justify-center mt-4 disabled:opacity-50">
                {iaLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles size={16} /> Gerar 10 Flashcards</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
