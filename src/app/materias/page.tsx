'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { BookOpen, Plus, X, Save, Trash2, Edit3 } from 'lucide-react'

interface MateriaData {
  id: string; nome: string; descricao?: string; cor?: string; icone?: string
}

const CORES = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#f97316', '#14b8a6', '#6366f1']

export default function MateriasPage() {
  const toast = useToast()
  const [materias, setMaterias] = useState<MateriaData[]>([])
  const [subtemas, setSubtemas] = useState<{ id: string; materia_id: string; nome: string }[]>([])
  const [questoes, setQuestoes] = useState<{ materia_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', descricao: '', cor: '#06b6d4' })

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: m }, { data: s }, { data: q }] = await Promise.all([
      supabase.from('materias').select('*').order('nome'),
      supabase.from('subtemas').select('id, materia_id, nome'),
      supabase.from('questoes').select('materia_id'),
    ])
    setMaterias(m || [])
    setSubtemas(s || [])
    setQuestoes(q || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    if (!form.nome) return toast('Informe o nome da matéria.', 'error')
    if (editId) {
      await supabase.from('materias').update({ nome: form.nome, descricao: form.descricao || null, cor: form.cor }).eq('id', editId)
      toast('Matéria atualizada!', 'success')
    } else {
      await supabase.from('materias').insert({ nome: form.nome, descricao: form.descricao || null, cor: form.cor })
      toast('Matéria criada!', 'success')
    }
    setShowForm(false)
    setEditId(null)
    setForm({ nome: '', descricao: '', cor: '#06b6d4' })
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta matéria?')) return
    await supabase.from('materias').delete().eq('id', id)
    toast('Matéria excluída.', 'info')
    carregar()
  }

  function editar(m: MateriaData) {
    setEditId(m.id)
    setForm({ nome: m.nome, descricao: m.descricao || '', cor: m.cor || '#06b6d4' })
    setShowForm(true)
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Matérias</h2>
          <p className="text-slate-500 text-sm mt-0.5">{materias.length} matérias cadastradas</p>
        </div>
        <button onClick={() => { setEditId(null); setForm({ nome: '', descricao: '', cor: '#06b6d4' }); setShowForm(true) }} className="btn-premium">
          <Plus size={16} /> Nova Matéria
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
        ) : materias.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="mx-auto text-slate-700 mb-3" />
            <h3 className="text-lg font-semibold text-slate-300">Nenhuma matéria ainda</h3>
            <p className="text-sm text-slate-500 mt-1">Crie suas matérias para organizar questões e simulados.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Matérias Públicas (Com Questões) */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-6 bg-cyan-500 rounded-full" />
                <h3 className="text-xl font-bold text-white">Matérias Públicas</h3>
                <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full">Com banco de questões</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materias.filter(m => {
                  const qCount = questoes.filter(q => q.materia_id === m.id).length
                  return qCount > 0
                }).map(m => {
                  const subCount = subtemas.filter(s => s.materia_id === m.id).length
                  const qCount = questoes.filter(q => q.materia_id === m.id).length
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden group">
                      <div className="h-2" style={{ backgroundColor: m.cor || '#06b6d4' }} />
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-200 text-lg">{m.nome}</h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => editar(m)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500"><Edit3 size={14} /></button>
                          </div>
                        </div>
                        {m.descricao && <p className="text-xs text-slate-500">{m.descricao}</p>}
                        <div className="flex gap-3">
                          <span className="badge-sm bg-cyan-500/10 text-cyan-400">{subCount} subtemas</span>
                          <span className="badge-sm bg-violet-500/10 text-violet-400">{qCount} questões</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>

            {/* Minhas Matérias */}
            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-6 bg-slate-700 rounded-full" />
                <h3 className="text-xl font-bold text-white">Minhas Matérias</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materias.filter(m => {
                  const qCount = questoes.filter(q => q.materia_id === m.id).length
                  return qCount === 0
                }).map(m => {
                  const subCount = subtemas.filter(s => s.materia_id === m.id).length
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden group border-dashed border-white/5">
                      <div className="h-2 opacity-30" style={{ backgroundColor: m.cor || '#06b6d4' }} />
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-400 text-lg">{m.nome}</h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => editar(m)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500"><Edit3 size={14} /></button>
                            <button onClick={() => excluir(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="badge-sm bg-white/5 text-slate-500">{subCount} subtemas</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{editId ? 'Editar Matéria' : 'Nova Matéria'}</h3>
              <div className="space-y-3">
                <input placeholder="Nome da matéria" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="input-dark" />
                <textarea placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input-dark min-h-[60px]" />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Cor</p>
                  <div className="flex gap-2 flex-wrap">
                    {CORES.map(c => (
                      <button key={c} onClick={() => setForm({ ...form, cor: c })}
                        className={`w-8 h-8 rounded-lg transition-all ${form.cor === c ? 'ring-2 ring-white/30 scale-110' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={salvar} className="btn-premium w-full justify-center mt-4"><Save size={16} /> Salvar</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
