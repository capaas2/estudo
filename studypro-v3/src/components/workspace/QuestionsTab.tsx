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
  BookOpen
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

export default function QuestionsTab({ materiaId, workspaceId, mainColor }: QuestionsTabProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    acertos: 0,
    erros: 0,
    taxa: 0
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
    q.assunto.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle size={24} style={{ color: mainColor }} />
            Banco de Questões
          </h3>
          <p className="text-sm text-slate-500 mt-1">Pratique e valide seu conhecimento com simulados e exercícios.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm hover:text-white transition-all flex items-center gap-2">
             <BookOpen size={16} /> Ver Teoria
          </button>
          <button className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2" style={{ backgroundColor: mainColor }}>
             <Plus size={16} /> Nova Questão
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Lista de Questões */}
        <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
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
        <div className="col-span-4 space-y-6">
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
    </div>
  )
}
