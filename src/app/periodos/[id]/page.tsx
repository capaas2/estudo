'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, BookOpen, Target, Clock, CheckCircle, Plus, Trash2, X, Save } from 'lucide-react'
import { useToast } from '@/components/shared/Toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function PeriodoIndividual({ params }: { params: Promise<{ id: string }> }) {
  const [periodo, setPeriodo] = useState<any>(null)
  const [subjectsWorkspace, setSubjectsWorkspace] = useState<any[]>([])
  const [metas, setMetas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const addToast = useToast()

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  
  // Forms state
  const [novaMateriaNome, setNovaMateriaNome] = useState('')
  const [novaMeta, setNovaMeta] = useState({ titulo: '', tipo: 'semestral', meta_valor: 10 })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)
    try {
      const resolvedParams = await params
      const { id } = resolvedParams
      const periodoNumero = parseInt(id)

      // Carrega o Período
      let { data: periodData } = await supabase
        .from('periods')
        .select('*')
        .eq('numero', periodoNumero)
        .single()

      if (!periodData && !isNaN(periodoNumero) && periodoNumero >= 1 && periodoNumero <= 12) {
        periodData = {
          id: `fallback-${periodoNumero}`, // identificador fictício para o frontend
          numero: periodoNumero,
          nome: `${periodoNumero}º Período`,
          status: 'nao_iniciado',
          progresso: 0
        }
      } else if (!periodData) {
        router.push('/periodos')
        return
      }
      setPeriodo(periodData)

      const isRealPeriod = !periodData.id.startsWith('fallback')

      // Carrega Matérias (se o período existir de fato)
      if (isRealPeriod) {
        const { data: subs } = await supabase
          .from('subjects_workspace')
          .select('*, materias(*)')
          .eq('period_id', periodData.id)
        setSubjectsWorkspace(subs || [])
      } else {
        setSubjectsWorkspace([])
      }

      // Carrega Metas do usuário vinculadas ao período
      if (isRealPeriod) {
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('period_id', periodData.id)
        setMetas(goalsData || [])
      } else {
        // Fallback: busca por tag se o período ainda não existe no banco
        const tag = `[P${periodoNumero}]`
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .like('titulo', `%${tag}%`)
        setMetas(goalsData || [])
      }

    } catch (error) {
      const err = error as Error
      console.error(err)
      addToast(`Erro ao carregar período: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ============== MATÉRIAS ==============
  async function handleAddSubject() {
    if (!novaMateriaNome.trim()) return
    try {
      let currentPeriod = periodo
      // Se for um período fallback, precisamos CRIAR ele no banco primeiro!
      if (periodo.id.startsWith('fallback')) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não logado')

        const { data: newPeriod, error: err1 } = await supabase.from('periods').insert({
          user_id: user.id,
          numero: periodo.numero,
          nome: periodo.nome,
          status: 'em_andamento',
          progresso: 0
        }).select().single()
        
        if (err1) throw err1
        currentPeriod = newPeriod
        setPeriodo(newPeriod)
      }

      // Criar a Matéria base
      const { data: { user } } = await supabase.auth.getUser()
      const { data: newMateria, error: err2 } = await supabase.from('materias').insert({
        user_id: user?.id,
        nome: novaMateriaNome,
      }).select().single()

      if (err2) throw err2

      // Vincular ao Período no subjects_workspace
      const { error: err3 } = await supabase.from('subjects_workspace').insert({
        user_id: user?.id,
        materia_id: newMateria.id,
        period_id: currentPeriod.id,
        status: 'cursando',
        progresso: 0
      })

      if (err3) throw err3

      addToast('Matéria vinculada com sucesso!', 'success')
      setNovaMateriaNome('')
      setShowSubjectModal(false)
      carregarDados()
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    }
  }

  async function handleRemoveSubject(workspaceId: string) {
    if (!confirm('Remover esta matéria do período?')) return
    try {
      await supabase.from('subjects_workspace').delete().eq('id', workspaceId)
      addToast('Removida', 'success')
      carregarDados()
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    }
  }

  // ============== METAS ==============
  async function handleAddGoal() {
    if (!novaMeta.titulo.trim() || novaMeta.meta_valor <= 0) return
    try {
      let currentPeriod = periodo
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não logado')

      // Se for um período fallback, precisamos CRIAR ele no banco primeiro!
      if (periodo.id.startsWith('fallback')) {
        const { data: newPeriod, error: err1 } = await supabase.from('periods').insert({
          user_id: user.id,
          numero: periodo.numero,
          nome: periodo.nome,
          status: 'em_andamento',
          progresso: 0
        }).select().single()
        
        if (err1) throw err1
        currentPeriod = newPeriod
        setPeriodo(newPeriod)
      }

      const { error } = await supabase.from('goals').insert({
        user_id: user?.id,
        period_id: currentPeriod.id,
        titulo: novaMeta.titulo,
        tipo: novaMeta.tipo,
        meta_valor: novaMeta.meta_valor,
        valor_atual: 0,
        completa: false
      })

      if (error) throw error

      addToast('Meta criada!', 'success')
      setNovaMeta({ titulo: '', tipo: 'semestral', meta_valor: 10 })
      setShowGoalModal(false)
      carregarDados()
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    }
  }

  async function handleRemoveGoal(id: string) {
    if (!confirm('Excluir meta?')) return
    try {
      await supabase.from('goals').delete().eq('id', id)
      carregarDados()
    } catch (err) {}
  }

  async function updateGoalProgress(id: string, current: number, max: number, delta: number) {
    try {
      const newVal = Math.max(0, Math.min(max, current + delta))
      const isComplete = newVal >= max
      await supabase.from('goals').update({ valor_atual: newVal, completa: isComplete }).eq('id', id)
      carregarDados()
      if (isComplete && current < max) {
        addToast('Meta concluída! 🎉', 'success')
      }
    } catch (err) {}
  }


  if (loading || !periodo) {
    return <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="page-header border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl sticky top-0 z-40 p-4 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/periodos" className="p-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-slate-400 hover:text-slate-200 transition-all">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-100 flex items-center gap-3">
              {periodo.nome}
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 mt-1">
              Visão geral do {periodo.numero}º período
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <Clock size={14} className="text-cyan-400" />
            <span className="text-[10px] sm:text-xs font-medium text-slate-300">
              {periodo.status === 'em_andamento' ? 'Em andamento' : periodo.status === 'concluido' ? 'Concluído' : 'Não iniciado'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Target size={14} />
            <span className="text-[10px] sm:text-xs font-bold">{periodo.progresso}% Concluído</span>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* ===================== MATÉRIAS ===================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
                <BookOpen size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Matérias deste Período</h2>
            </div>
            <button onClick={() => setShowSubjectModal(true)} className="btn-premium py-1.5 px-3 text-xs">
              <Plus size={14} /> Adicionar Matéria
            </button>
          </div>
          
          {subjectsWorkspace.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectsWorkspace.map((sw: any) => (
                <Link 
                  href={`/periodos/${periodo.numero}/${sw.id}`} 
                  key={sw.id} 
                  className="stat-card group relative block hover:scale-[1.02] transition-all hover:border-violet-500/30 cursor-pointer"
                >
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      handleRemoveSubject(sw.id)
                    }} 
                    className="absolute top-3 right-3 z-10 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                  <h3 className="text-base font-semibold text-slate-200 pr-6 group-hover:text-violet-400 transition-colors">
                    {sw.materias?.nome || 'Matéria Desconhecida'}
                  </h3>
                  <div className="mt-4 w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${sw.progresso || 0}%` }}
                      className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full"
                    ></motion.div>
                  </div>
                  <div className="mt-3 flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    <span>{sw.status || 'cursando'}</span>
                    <span>{sw.progresso || 0}%</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-card p-10 text-center flex flex-col items-center justify-center border-dashed">
              <BookOpen size={32} className="text-slate-600 mb-3" />
              <h3 className="text-slate-300 font-medium">Nenhuma matéria vinculada</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">Adicione as matérias que você cursará neste semestre.</p>
              <button onClick={() => setShowSubjectModal(true)} className="btn-premium py-2 px-4 text-xs">
                Adicionar Primeira Matéria
              </button>
            </div>
          )}
        </section>

        {/* ===================== METAS ===================== */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Target size={18} />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Metas do Período</h2>
            </div>
            <button onClick={() => setShowGoalModal(true)} className="btn-premium py-1.5 px-3 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30">
              <Plus size={14} /> Nova Meta
            </button>
          </div>

          {metas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metas.map((m) => {
                const pct = (m.valor_atual / m.meta_valor) * 100
                const titleClean = m.titulo.replace(/\[P\d+\]/g, '').trim()
                return (
                  <div key={m.id} className={`glass-card p-5 group ${m.completa ? 'border-emerald-500/30' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {m.completa ? <CheckCircle size={18} className="text-emerald-400" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-500" />}
                        <h3 className={`font-bold ${m.completa ? 'text-emerald-400 line-through opacity-80' : 'text-slate-200'}`}>{titleClean}</h3>
                      </div>
                      <button onClick={() => handleRemoveGoal(m.id)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{m.valor_atual} / {m.meta_valor}</span>
                        <span className="text-cyan-400 font-bold">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className={`h-full transition-all duration-500 ${m.completa ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-violet-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {!m.completa && (
                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => updateGoalProgress(m.id, m.valor_atual, m.meta_valor, -1)} className="w-8 h-8 rounded-lg bg-white/[0.04] text-slate-400 hover:bg-white/10 flex items-center justify-center font-bold">-</button>
                        <button onClick={() => updateGoalProgress(m.id, m.valor_atual, m.meta_valor, 1)} className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 flex items-center justify-center font-bold">+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="glass-card p-10 text-center flex flex-col items-center justify-center border-dashed">
              <Target size={32} className="text-slate-600 mb-3" />
              <h3 className="text-slate-300 font-medium">Nenhuma meta configurada</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">Adicione objetivos como "Fazer 100 Questões" para este semestre.</p>
              <button onClick={() => setShowGoalModal(true)} className="btn-premium py-2 px-4 text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
                Criar Primeira Meta
              </button>
            </div>
          )}
        </section>
      </div>

      {/* MODAL MATÉRIA */}
      <AnimatePresence>
        {showSubjectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card p-6 w-full max-w-md border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-100">Vincular Matéria</h3>
                <button onClick={() => setShowSubjectModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Nome da Matéria</label>
                  <input 
                    autoFocus
                    placeholder="Ex: Anatomia I" 
                    value={novaMateriaNome} 
                    onChange={e => setNovaMateriaNome(e.target.value)} 
                    className="input-dark w-full"
                    onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                  />
                </div>
                <button onClick={handleAddSubject} className="btn-premium w-full justify-center py-2.5">
                  Adicionar Matéria
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL META */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card p-6 w-full max-w-md border-emerald-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-emerald-400">Nova Meta para o {periodo.numero}º Período</h3>
                <button onClick={() => setShowGoalModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Objetivo (ex: Resolver Questões)</label>
                  <input 
                    autoFocus
                    placeholder="Ex: Resolver questões de Anatomia" 
                    value={novaMeta.titulo} 
                    onChange={e => setNovaMeta({ ...novaMeta, titulo: e.target.value })} 
                    className="input-dark w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Frequência</label>
                    <select value={novaMeta.tipo} onChange={e => setNovaMeta({ ...novaMeta, tipo: e.target.value })} className="select-dark w-full">
                      <option value="diaria">Diária</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                      <option value="semestral">Semestral</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Quantidade alvo</label>
                    <input type="number" placeholder="Ex: 50" value={novaMeta.meta_valor || ''} onChange={e => setNovaMeta({ ...novaMeta, meta_valor: parseInt(e.target.value) || 0 })} className="input-dark w-full" />
                  </div>
                </div>
                <button onClick={handleAddGoal} className="btn-premium w-full justify-center py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30">
                  Criar Meta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
