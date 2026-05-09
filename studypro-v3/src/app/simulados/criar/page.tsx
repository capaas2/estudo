'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import { ChevronLeft, Plus, Check, Settings2, BookOpen, Layers } from 'lucide-react'
import Link from 'next/link'

export default function CriarSimuladoPage() {
  const router = useRouter()
  const toast = useToast()
  
  const [materias, setMaterias] = useState<{ id: string; nome: string; cor: string }[]>([])
  const [subtemas, setSubtemas] = useState<{ id: string; nome: string; materia_id: string }[]>([])
  
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  
  const [selectedMateria, setSelectedMateria] = useState<string>('')
  const [selectedSubtemas, setSelectedSubtemas] = useState<string[]>([])
  const [titulo, setTitulo] = useState('')
  const [numQuestoes, setNumQuestoes] = useState(10)
  const [tipo, setTipo] = useState<'manual' | 'automatico'>('automatico')

  useEffect(() => {
    async function loadData() {
      const [{ data: m }, { data: s }] = await Promise.all([
        supabase.from('materias').select('id, nome, cor').order('nome'),
        supabase.from('subtemas').select('id, nome, materia_id').order('nome')
      ])
      setMaterias(m || [])
      setSubtemas(s || [])
      setLoading(false)
    }
    loadData()
  }, [])

  const filteredSubtemas = subtemas.filter(s => s.materia_id === selectedMateria)

  async function handleCriar() {
    if (!selectedMateria) return toast('Selecione uma matéria', 'error')
    if (!titulo) return toast('Digite um título para o simulado', 'error')
    
    setCriando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Buscar questões baseadas nos filtros
      let query = supabase.from('questoes')
        .select('id')
        .eq('materia_id', selectedMateria)
      
      if (selectedSubtemas.length > 0) {
        query = query.in('subtema_id', selectedSubtemas)
      }

      const { data: questoesDisponiveis, error: qError } = await query.limit(numQuestoes * 2)
      
      if (qError) throw qError
      if (!questoesDisponiveis || questoesDisponiveis.length === 0) {
        toast('Nenhuma questão encontrada com estes filtros.', 'error')
        setCriando(false)
        return
      }

      // Randomizar e pegar a quantidade solicitada
      const ids = questoesDisponiveis
        .sort(() => Math.random() - 0.5)
        .slice(0, numQuestoes)
        .map(q => q.id)

      const { data: simulado, error: sError } = await supabase.from('simulados').insert({
        titulo,
        materia_id: selectedMateria,
        subtema_ids: selectedSubtemas,
        tipo,
        questao_ids: ids,
        user_id: user.id,
        status: 'criado',
        nota_maxima: ids.length
      }).select().single()

      if (sError) throw sError

      toast('Simulado criado com sucesso!', 'success')
      router.push(`/simulados/${simulado.id}/executar`)
    } catch (error: any) {
      toast(error.message || 'Erro ao criar simulado', 'error')
    } finally {
      setCriando(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <Link href="/simulados" className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors mb-6 group w-fit">
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Voltar para Simulados</span>
        </Link>

        <div className="space-y-8">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-white">Novo Simulado</h1>
            <p className="text-slate-400 mt-2">Configure os parâmetros para gerar um novo teste de conhecimentos.</p>
          </header>

          <div className="grid gap-6">
            {/* Título */}
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3 text-cyan-400 mb-2">
                <Settings2 size={20} />
                <h2 className="text-lg font-semibold text-slate-100">Configurações Básicas</h2>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título do Simulado</label>
                <input 
                  type="text" 
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Simulado Geral de Genética - Aula 01"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade de Questões</label>
                  <select 
                    value={numQuestoes}
                    onChange={e => setNumQuestoes(Number(e.target.value))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all appearance-none"
                  >
                    {[5, 10, 15, 20, 30, 40, 50].map(n => (
                      <option key={n} value={n} className="bg-slate-900">{n} Questões</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modo de Geração</label>
                  <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                    <button 
                      onClick={() => setTipo('automatico')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${tipo === 'automatico' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Automático
                    </button>
                    <button 
                      onClick={() => setTipo('manual')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${tipo === 'manual' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Manual
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Seleção de Matéria */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 text-amber-400 mb-6">
                <BookOpen size={20} />
                <h2 className="text-lg font-semibold text-slate-100">Matéria Principal</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {materias.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedMateria(m.id)
                      setSelectedSubtemas([])
                    }}
                    className={`p-4 rounded-xl border transition-all text-left group relative overflow-hidden ${selectedMateria === m.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}
                  >
                    <div className="w-2 h-2 rounded-full mb-3" style={{ backgroundColor: m.cor }} />
                    <span className={`text-sm font-medium transition-colors ${selectedMateria === m.id ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>{m.nome}</span>
                    {selectedMateria === m.id && (
                      <div className="absolute top-2 right-2 text-cyan-400">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtemas (Opcional) */}
            {selectedMateria && filteredSubtemas.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center gap-3 text-emerald-400 mb-6">
                  <Layers size={20} />
                  <h2 className="text-lg font-semibold text-slate-100">Subtemas (Opcional)</h2>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {filteredSubtemas.map(s => {
                    const isSelected = selectedSubtemas.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (isSelected) setSelectedSubtemas(prev => prev.filter(id => id !== s.id))
                          else setSelectedSubtemas(prev => [...prev, s.id])
                        }}
                        className={`px-4 py-2 rounded-full border text-xs font-medium transition-all ${isSelected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/[0.03] border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'}`}
                      >
                        {s.nome}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-slate-600 mt-4 italic">* Se nenhum subtema for selecionado, questões de todos os subtemas serão incluídas.</p>
              </motion.div>
            )}

            <div className="pt-4">
              <button 
                onClick={handleCriar}
                disabled={criando || !selectedMateria || !titulo}
                className="btn-premium w-full py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {criando ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={22} className="group-hover:rotate-90 transition-transform" /> 
                    Gerar Simulado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
