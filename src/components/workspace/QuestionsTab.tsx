'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  HelpCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight,
  Plus,
  Target,
  BarChart2,
  BookOpen,
  X,
  Upload,
  Sparkles,
  Brain,
  Layers,
  Save,
  Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/shared/Toast'
import { extrairQuestoesDePDF, gerarGabaritoIA } from '@/services/iaService'
import { uploadImagemQuestao } from '@/services/storageService'

interface Question {
  id: string
  enunciado: string
  assunto: string
  dificuldade: 'facil' | 'medio' | 'dificil'
  tipo: 'objetiva' | 'discursiva'
  criado_em: string
  acertos?: number
}

interface QuestionsTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

  const toast = useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    acertos: 0,
    erros: 0,
    taxa: 0
  })

  // Modais
  const [showAddModal, setShowAddModal] = useState(false)
  const [showIAModal, setShowIAModal] = useState(false)
  const [iaContent, setIaContent] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [gerandoGab, setGerandoGab] = useState(false)

  const [form, setForm] = useState<any>({
    tipo: 'objetiva', 
    enunciado: '', 
    dificuldade: 'medio', 
    alternativas: [
      { letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }
    ],
    gabarito: '', 
    explicacao: '',
    subitens: [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
  })

  useEffect(() => {
    fetchQuestionsAndStats()
  }, [materiaId])

  async function fetchQuestionsAndStats() {
    setLoading(true)
    try {
      // 1. Buscar Questões
      const { data: questionsData, error: qError } = await supabase
        .from('questoes')
        .select(`
          *,
          subtemas (nome)
        `)
        .eq('materia_id', materiaId)
        .order('criado_em', { ascending: false })

      if (qError) throw qError

      // 2. Buscar Respostas para calcular estatísticas
      const { data: responses, error: rError } = await supabase
        .from('respostas_simulado')
        .select('esta_correta, questao_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

      if (rError) throw rError

      const materiaQuestions = questionsData || []
      const materiaQuestionIds = materiaQuestions.map(q => q.id)
      
      // Filtrar respostas apenas desta matéria
      const relevantResponses = responses?.filter(r => materiaQuestionIds.includes(r.questao_id)) || []
      const correctCount = relevantResponses.filter(r => r.esta_correta).length
      const totalResponses = relevantResponses.length
      const taxa = totalResponses > 0 ? Math.round((correctCount / totalResponses) * 100) : 0

      // Mapear acertos por questão
      const questionsWithStats = materiaQuestions.map(q => ({
        ...q,
        assunto: q.subtemas?.nome || 'Geral',
        acertos: relevantResponses.filter(r => r.questao_id === q.id && r.esta_correta).length
      }))

      setQuestions(questionsWithStats)
      setStats({
        total: totalResponses,
        acertos: correctCount,
        erros: totalResponses - correctCount,
        taxa
      })
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'facil': return 'text-emerald-400 bg-emerald-500/10'
      case 'medio': return 'text-amber-400 bg-amber-500/10'
      case 'dificil': return 'text-rose-400 bg-rose-500/10'
      default: return 'text-slate-400 bg-slate-500/10'
    }
  }

  const filteredQuestions = questions.filter(q => 
    q.enunciado.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.assunto && q.assunto.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  async function salvarQuestao(e: React.FormEvent) {
    e.preventDefault()
    if (!form.enunciado?.trim()) return toast('Preencha o enunciado', 'error')

    try {
      const dados = {
        materia_id: materiaId,
        tipo: form.tipo,
        enunciado: form.enunciado,
        dificuldade: form.dificuldade,
        alternativas: form.tipo === 'objetiva' ? form.alternativas : [],
        gabarito: form.tipo === 'objetiva' ? form.gabarito : '',
        explicacao: form.explicacao,
        subitens: form.tipo === 'discursiva' ? form.subitens : []
      }

      const { error } = await supabase.from('questoes').insert(dados)
      if (error) throw error

      toast('Questão criada!', 'success')
      setShowAddModal(false)
      fetchQuestionsAndStats()
    } catch (error) {
      console.error(error)
      toast('Erro ao salvar questão', 'error')
    }
  }

  async function gerarIA() {
    if (!iaContent) return toast('Insira o texto para gerar questões', 'error')
    setIaLoading(true)
    try {
      toast('IA analisando e gerando questões...', 'info')
      const result = await extrairQuestoesDePDF(iaContent) // Reaproveitando a lógica de extração que gera JSON
      const list = (result as any).questoes || []
      
      if (list.length === 0) throw new Error('Nenhuma questão gerada')

      const insertData = list.map((q: any) => ({
        materia_id: materiaId,
        tipo: q.tipo,
        enunciado: q.enunciado,
        dificuldade: q.dificuldade || 'medio',
        alternativas: q.alternativas || [],
        gabarito: q.gabarito || '',
        explicacao: q.explicacao || '',
        subitens: q.subitens || []
      }))

      const { error } = await supabase.from('questoes').insert(insertData)
      if (error) throw error

      toast(`${list.length} questões geradas com sucesso!`, 'success')
      setShowIAModal(false)
      setIaContent('')
      fetchQuestionsAndStats()
    } catch (error) {
      console.error(error)
      toast('Erro ao gerar questões com IA', 'error')
    } finally {
      setIaLoading(false)
    }
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Deseja excluir esta questão?')) return
    try {
      const { error } = await supabase.from('questoes').delete().eq('id', id)
      if (error) throw error
      toast('Questão excluída', 'info')
      fetchQuestionsAndStats()
    } catch (error) {
      toast('Erro ao excluir', 'error')
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle size={24} style={{ color: mainColor }} />
            Banco de Questões
          </h3>
          <p className="text-sm text-slate-500 mt-1">Pratique e valide seu conhecimento com simulados e exercícios.</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setShowIAModal(true)}
            className="flex-1 sm:flex-none p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all flex items-center justify-center gap-2"
            title="Gerar com IA"
          >
            <Sparkles size={18} />
            <span className="text-xs font-bold">IA</span>
          </button>
          <button className="hidden sm:flex px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm hover:text-white transition-all items-center gap-2">
             <BookOpen size={16} /> Ver Teoria
          </button>
          <button 
            onClick={() => {
              setForm({
                tipo: 'objetiva', enunciado: '', dificuldade: 'medio', alternativas: [
                  { letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }
                ],
                gabarito: '', explicacao: '', subitens: [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
              })
              setShowAddModal(true)
            }}
            className="flex-[2] sm:flex-none px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-center" 
            style={{ backgroundColor: mainColor }}
          >
             <Plus size={16} /> <span className="whitespace-nowrap">Nova Questão</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-8 overflow-hidden">
        {/* Lista de Questões */}
        <div className="order-2 lg:order-1 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
          <div className="flex gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por enunciado ou assunto..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all text-slate-300"
                />
             </div>
             <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                <Filter size={18} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {loading ? (
               [1, 2, 3].map(i => <div key={i} className="h-24 rounded-3xl bg-white/[0.02] animate-pulse" />)
            ) : filteredQuestions.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center py-20 text-slate-600 italic gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center">
                    <HelpCircle size={32} />
                  </div>
                  <p>Nenhuma questão encontrada para os filtros aplicados.</p>
               </div>
            ) : (
              filteredQuestions.map(q => (
                <div key={q.id} className="glass-card p-6 border-white/[0.04] hover:border-white/10 transition-all group cursor-pointer">
                   <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getDifficultyColor(q.dificuldade)}`}>
                            {q.dificuldade}
                         </span>
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{q.assunto}</span>
                      </div>
                      <div className="text-slate-600 group-hover:text-white transition-colors">
                         <ChevronRight size={18} />
                      </div>
                   </div>
                   <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-4">{q.enunciado}</p>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            <Clock size={12} /> {formatDistanceToNow(new Date(q.criado_em), { locale: ptBR, addSuffix: true })}
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                            <CheckCircle2 size={12} /> {q.acertos || 0} acertos pessoais
                         </div>
                      </div>
                      <button className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Resolver Agora</button>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estatísticas de Desempenho */}
        <div className="order-1 lg:order-2 lg:col-span-4 space-y-6">
           <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                 <Target size={16} className="text-emerald-400" />
                 Taxa de Acerto Real
              </h4>
              <div className="flex flex-col items-center py-4">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                       <circle 
                         cx="64" 
                         cy="64" 
                         r="58" 
                         stroke="currentColor" 
                         strokeWidth="8" 
                         fill="transparent" 
                         className="text-emerald-500 shadow-xl transition-all duration-1000" 
                         strokeDasharray="364.4" 
                         strokeDashoffset={364.4 - (364.4 * stats.taxa) / 100} 
                       />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-2xl font-black text-white">{stats.taxa}%</span>
                       <span className="text-[8px] font-bold text-slate-500 uppercase">Geral</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="glass-card p-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                 <BarChart2 size={16} />
                 Resumo do Banco
              </h4>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Total de Resoluções</span>
                    <span className="text-white">{stats.total}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Total Acertos</span>
                    <span className="text-emerald-400">{stats.acertos}</span>
                 </div>
                 <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-400">Total Erros</span>
                    <span className="text-rose-400">{stats.erros}</span>
                 </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/[0.05]">
                 <button className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    Ver Relatório Detalhado
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Modal Nova Questão */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0d1221] border border-white/10 rounded-[2.5rem] w-full max-w-2xl relative z-10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h4 className="text-xl font-bold text-white">Nova Questão</h4>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-500"><X size={20} /></button>
              </div>
              <form onSubmit={salvarQuestao} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tipo</label>
                    <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-white/20" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                      <option value="objetiva">Objetiva</option>
                      <option value="discursiva">Discursiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Dificuldade</label>
                    <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-white/20" value={form.dificuldade} onChange={e => setForm({...form, dificuldade: e.target.value})}>
                      <option value="facil">Fácil</option>
                      <option value="medio">Médio</option>
                      <option value="dificil">Difícil</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Enunciado</label>
                  <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-white/20 h-32 resize-none" value={form.enunciado} onChange={e => setForm({...form, enunciado: e.target.value})} placeholder="Digite o enunciado da questão..." />
                </div>

                {form.tipo === 'objetiva' ? (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Alternativas</label>
                    {form.alternativas.map((alt: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <button type="button" onClick={() => setForm({...form, gabarito: alt.letra})} className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all shrink-0 ${form.gabarito === alt.letra ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-500 border border-white/10 hover:border-white/20'}`}>
                          {alt.letra}
                        </button>
                        <input className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-white/20" value={alt.texto} onChange={e => { const a = [...form.alternativas]; a[i].texto = e.target.value; setForm({...form, alternativas: a}) }} placeholder={`Alternativa ${alt.letra}...`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Gabarito Esperado</label>
                    <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-white/20 h-32 resize-none" value={form.explicacao} onChange={e => setForm({...form, explicacao: e.target.value})} placeholder="Descreva a resposta correta e critérios de correção..." />
                  </div>
                )}
              </form>
              <div className="p-8 border-t border-white/5 flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-2xl bg-white/5 font-bold text-slate-400">Cancelar</button>
                <button onClick={salvarQuestao} className="flex-1 py-3 rounded-2xl font-bold text-white shadow-xl" style={{ backgroundColor: mainColor }}>Criar Questão</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IA Modal */}
      <AnimatePresence>
        {showIAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIAModal(false)} />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0d1221] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400"><Brain size={24} /></div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Gerar Questões com IA</h4>
                    <p className="text-xs text-slate-500">Transforme textos em questões de prova.</p>
                  </div>
                </div>
                <div className="space-y-4">
                   <textarea value={iaContent} onChange={(e) => setIaContent(e.target.value)} placeholder="Cole o texto base (resumo, artigo ou aula) para gerar questões..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-white/20 h-64 resize-none" />
                </div>
                <div className="mt-8 flex gap-3">
                   <button onClick={() => setShowIAModal(false)} className="px-6 py-3 rounded-2xl bg-white/5 font-bold text-slate-400">Cancelar</button>
                   <button onClick={gerarIA} disabled={iaLoading} className="flex-1 py-3 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: '#8b5cf6' }}>
                      {iaLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles size={16} /> Gerar Questões</>}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
