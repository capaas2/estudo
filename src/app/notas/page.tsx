'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import TiptapEditor from '@/components/editor/TiptapEditor'
import { FileText, Plus, Search, MoreVertical, Trash2, Save, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NoteData {
  id: string; titulo: string; conteudo: any; icone: string; materia_id?: string; atualizado_em: string
}

export default function NotasPage() {
  const toast = useToast()
  const [notas, setNotas] = useState<NoteData[]>([])
  const [activeNote, setActiveNote] = useState<NoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('notes').select('id, titulo, conteudo, icone, materia_id, atualizado_em').order('atualizado_em', { ascending: false })
    setNotas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criarNota() {
    const { data, error } = await supabase.from('notes').insert({
      titulo: 'Nova Nota', icone: '📄', conteudo: ''
    }).select().single()
    if (error || !data) return toast('Erro ao criar nota', 'error')
    
    setNotas(prev => [data, ...prev])
    setActiveNote(data)
  }

  async function salvarNota() {
    if (!activeNote) return
    setIsSaving(true)
    const { error } = await supabase.from('notes').update({
      titulo: activeNote.titulo,
      icone: activeNote.icone,
      conteudo: activeNote.conteudo,
      atualizado_em: new Date().toISOString()
    }).eq('id', activeNote.id)
    
    setIsSaving(false)
    if (error) return toast('Erro ao salvar', 'error')
    
    setNotas(prev => prev.map(n => n.id === activeNote.id ? { ...activeNote, atualizado_em: new Date().toISOString() } : n))
    toast('Nota salva', 'success')
  }

  // Auto-save debounce (optional: could add a useDebounce hook here for automatic saving)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeNote) salvarNota()
    }, 5000)
    return () => clearTimeout(timer)
  }, [activeNote?.conteudo, activeNote?.titulo, activeNote?.icone])

  async function excluirNota(id: string) {
    if (!confirm('Excluir esta nota permanentemente?')) return
    await supabase.from('notes').delete().eq('id', id)
    setNotas(prev => prev.filter(n => n.id !== id))
    if (activeNote?.id === id) setActiveNote(null)
    toast('Nota excluída', 'info')
  }

  const filtered = buscas(notas, busca)
  function buscas(arr: NoteData[], q: string) {
    if (!q) return arr
    return arr.filter(n => n.titulo.toLowerCase().includes(q.toLowerCase()))
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-theme(spacing.20))] md:h-[calc(100vh-theme(spacing.8))] -mx-4 -mt-4 md:m-0 overflow-hidden bg-slate-900/50 md:rounded-2xl border border-white/[0.05]">
        
        {/* Sidebar de Notas */}
        <div className={`w-full md:w-80 flex flex-col border-r border-white/[0.05] bg-white/[0.02] ${activeNote ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-200 flex items-center gap-2"><FileText size={18} className="text-cyan-400" /> Cadernos</h2>
              <button onClick={criarNota} className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                placeholder="Buscar notas..." 
                value={busca} onChange={e => setBusca(e.target.value)} 
                className="w-full bg-black/20 border border-white/[0.05] rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center p-4"><div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-500 p-4">Nenhuma nota encontrada.</p>
            ) : (
              filtered.map(nota => (
                <button
                  key={nota.id}
                  onClick={() => setActiveNote(nota)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                    activeNote?.id === nota.id ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <span className="text-xl">{nota.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${activeNote?.id === nota.id ? 'text-cyan-400' : 'text-slate-300'}`}>{nota.titulo}</p>
                    <p className="text-[10px] text-slate-500">{new Date(nota.atualizado_em).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div onClick={e => { e.stopPropagation(); excluirNota(nota.id) }} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all">
                    <Trash2 size={14} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área do Editor */}
        <div className={`flex-1 flex flex-col bg-transparent relative ${!activeNote ? 'hidden md:flex' : 'flex'}`}>
          {activeNote ? (
            <>
              {/* Editor Header */}
              <div className="flex items-center gap-4 p-4 border-b border-white/[0.05] bg-white/[0.01]">
                <button onClick={() => setActiveNote(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-200"><X size={20} /></button>
                <input 
                  value={activeNote.icone} onChange={e => setActiveNote({ ...activeNote, icone: e.target.value })}
                  className="w-10 h-10 bg-transparent text-2xl text-center focus:outline-none hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="Emoji do ícone"
                />
                <input 
                  value={activeNote.titulo} onChange={e => setActiveNote({ ...activeNote, titulo: e.target.value })}
                  className="flex-1 bg-transparent text-xl font-bold text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  placeholder="Título da nota"
                />
                <div className="flex items-center gap-3">
                  {isSaving && <span className="text-xs text-slate-500 flex items-center gap-1"><div className="w-3 h-3 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" /> Salvando...</span>}
                  <button onClick={salvarNota} className="btn-premium py-1.5 px-3 text-xs"><Save size={14} /> Salvar</button>
                </div>
              </div>

              {/* Tiptap */}
              <div className="flex-1 overflow-hidden">
                <TiptapEditor 
                  content={activeNote.conteudo || ''} 
                  onChange={(html) => setActiveNote({ ...activeNote, conteudo: html })}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>Selecione uma nota ou crie uma nova para começar.</p>
              <button onClick={criarNota} className="mt-4 btn-premium"><Plus size={16} /> Nova Nota</button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
