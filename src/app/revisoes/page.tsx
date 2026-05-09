'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp, Plus, X, Save, Calendar } from 'lucide-react'

interface ReviewData {
  id: string; titulo: string; tipo: string; status: string; data_revisao: string;
  proxima_revisao?: string; intervalo_dias: number; nivel_confianca: number; materia_id?: string; origem?: string
}

const URGENCIA = {
  pendente: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
  concluida: { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  adiada: { label: 'Adiada', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: AlertTriangle },
}

export default function RevisoesPage() {
  const toast = useToast()
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string }[]>([])
  const [filtro, setFiltro] = useState('pendente')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ titulo: '', materia_id: '', tipo: 'manual', data_revisao: '' })

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('reviews').select('*').order('data_revisao'),
      supabase.from('materias').select('id, nome'),
    ])
    setReviews(r || [])
    setMaterias(m || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtered = reviews.filter(r => r.status === filtro)

  async function concluir(id: string, confianca: number) {
    const review = reviews.find(r => r.id === id)
    if (!review) return
    const novoIntervalo = Math.max(1, Math.round(review.intervalo_dias * (confianca >= 4 ? 2.5 : confianca >= 3 ? 1.5 : 1)))
    const proxima = new Date()
    proxima.setDate(proxima.getDate() + novoIntervalo)

    await supabase.from('reviews').update({
      status: 'concluida', nivel_confianca: confianca, intervalo_dias: novoIntervalo,
      proxima_revisao: proxima.toISOString()
    }).eq('id', id)
    toast('Revisão concluída! ✅', 'success')
    carregar()
  }

  async function criar() {
    if (!formData.titulo || !formData.data_revisao) return toast('Preencha título e data.', 'error')
    await supabase.from('reviews').insert({
      titulo: formData.titulo, materia_id: formData.materia_id || null, tipo: formData.tipo,
      data_revisao: formData.data_revisao, status: 'pendente', intervalo_dias: 1, nivel_confianca: 0
    })
    toast('Revisão agendada!', 'success')
    setShowForm(false)
    setFormData({ titulo: '', materia_id: '', tipo: 'manual', data_revisao: '' })
    carregar()
  }

  const pendentes = reviews.filter(r => r.status === 'pendente').length
  const concluidas = reviews.filter(r => r.status === 'concluida').length
  const hoje = new Date().toISOString().split('T')[0]
  const vencidas = reviews.filter(r => r.status === 'pendente' && r.data_revisao < hoje).length

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revisões Espaçadas</h2>
          <p className="text-slate-500 text-sm mt-0.5">Sistema de repetição espaçada para memorização eficiente</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-premium"><Plus size={16} /> Nova Revisão</button>
      </div>

      <div className="page-body space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pendentes', value: pendentes, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Concluídas', value: concluidas, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Vencidas', value: vencidas, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 bg-white/[0.02] p-1 rounded-xl w-fit">
          {(['pendente', 'concluida', 'adiada'] as const).map(f => (
            <button
              key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtro === f ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {URGENCIA[f].label} ({reviews.filter(r => r.status === f).length})
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw size={40} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500">Nenhuma revisão neste filtro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const mat = materias.find(m => m.id === r.materia_id)?.nome
              const vencida = r.status === 'pendente' && r.data_revisao < hoje
              return (
                <motion.div
                  key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${vencida ? 'border-red-500/20' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-200 truncate">{r.titulo}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      {mat && <span className="badge-sm bg-cyan-500/10 text-cyan-400">{mat}</span>}
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> {new Date(r.data_revisao).toLocaleDateString('pt-BR')}</span>
                      {vencida && <span className="badge-sm bg-red-500/10 text-red-400">Vencida!</span>}
                    </div>
                  </div>
                  {r.status === 'pendente' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n} onClick={() => concluir(r.id, n)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            n <= 2 ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : n <= 3 ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={['', 'Não lembro nada', 'Quase nada', 'Mais ou menos', 'Bem', 'Perfeito!'][n]}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Nova Revisão</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Título" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} className="input-dark" />
                <select value={formData.materia_id} onChange={e => setFormData({ ...formData, materia_id: e.target.value })} className="select-dark">
                  <option value="">Matéria (opcional)</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <input type="date" value={formData.data_revisao} onChange={e => setFormData({ ...formData, data_revisao: e.target.value })} className="input-dark" />
              </div>
              <button onClick={criar} className="btn-premium w-full justify-center mt-4"><Save size={16} /> Agendar Revisão</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
