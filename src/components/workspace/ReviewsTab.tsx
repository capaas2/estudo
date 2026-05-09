'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  RefreshCw, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  Brain,
  History,
  TrendingUp,
  MoreVertical,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Review {
  id: string
  titulo: string
  tipo: 'manual' | 'automatica' | 'erro_simulado'
  status: 'pendente' | 'concluida' | 'adiada'
  data_revisao: string
  proxima_revisao: string | null
  intervalo_dias: number
  nivel_confianca: number
}

interface ReviewsTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function ReviewsTab({ materiaId, workspaceId, mainColor }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newReviewTitle, setNewReviewTitle] = useState('')

  useEffect(() => {
    fetchReviews()
  }, [materiaId])

  async function fetchReviews() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('materia_id', materiaId)
        .order('data_revisao', { ascending: true })

      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('Erro ao buscar revisões:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addReview() {
    if (!newReviewTitle.trim()) return
    try {
      const user = (await supabase.auth.getUser()).data.user
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user?.id,
          materia_id: materiaId,
          titulo: newReviewTitle,
          data_revisao: new Date().toISOString().split('T')[0],
          status: 'pendente',
          intervalo_dias: 1,
          nivel_confianca: 0
        })
        .select()
        .single()

      if (error) throw error
      setReviews([...reviews, data])
      setNewReviewTitle('')
      setIsAdding(false)
    } catch (error) {
      console.error('Erro ao adicionar revisão:', error)
    }
  }

  async function completeReview(review: Review, quality: number) {
    // Algoritmo SM-2 simplificado
    // quality: 0 (esqueci) a 5 (muito fácil)
    let nextInterval = 1
    if (quality >= 3) {
       if (review.intervalo_dias === 1) nextInterval = 3
       else if (review.intervalo_dias === 3) nextInterval = 7
       else nextInterval = Math.round(review.intervalo_dias * (1.5 + quality * 0.1))
    } else {
       nextInterval = 1
    }

    const proximaData = addDays(new Date(), nextInterval).toISOString().split('T')[0]

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          status: 'concluida',
          nivel_confianca: quality,
          proxima_revisao: proximaData,
          intervalo_dias: nextInterval,
          data_revisao: new Date().toISOString().split('T')[0]
        })
        .eq('id', review.id)

      if (error) throw error
      
      // Se a revisão foi bem sucedida, podemos criar a próxima pendente automaticamente ou apenas atualizar o estado
      // Aqui vou apenas atualizar o estado local para refletir a mudança
      setReviews(reviews.map(r => r.id === review.id ? { 
        ...r, 
        status: 'concluida', 
        nivel_confianca: quality, 
        proxima_revisao: proximaData,
        intervalo_dias: nextInterval
      } : r))
    } catch (error) {
      console.error('Erro ao completar revisão:', error)
    }
  }

  const pendingReviews = reviews.filter(r => r.status === 'pendente' || isPast(new Date(r.data_revisao)))
  const upcomingReviews = reviews.filter(r => r.status === 'concluida' && r.proxima_revisao && !isPast(new Date(r.proxima_revisao)))

  return (
    <div className="h-full flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Coluna Principal: Próximas Revisões */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Brain size={24} style={{ color: mainColor }} />
                 Ciclo de Revisões
              </h3>
              <p className="text-sm text-slate-500 mt-1">Algoritmo de Repetição Espaçada ativo.</p>
           </div>
           <button 
             onClick={() => setIsAdding(true)}
             className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center justify-center gap-2"
           >
             <Plus size={16} /> Nova Revisão
           </button>
        </header>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-6 border-dashed"
              style={{ borderColor: `${mainColor}40` }}
            >
              <h4 className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-widest">O que você quer revisar?</h4>
               <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Ex: Ciclo de Krebs..."
                  value={newReviewTitle}
                  onChange={(e) => setNewReviewTitle(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/20 transition-all text-white"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={addReview}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
                    style={{ backgroundColor: mainColor }}
                  >
                    Agendar
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-300 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="space-y-4">
           <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              <AlertCircle size={14} className="text-amber-500" />
              Pendente ou Atrasado ({pendingReviews.length})
           </div>
           
           {pendingReviews.length === 0 ? (
             <div className="glass-card p-10 flex flex-col items-center justify-center text-slate-600 gap-3 border-dashed">
                <CheckCircle2 size={40} className="text-emerald-500/20" />
                <p className="italic">Tudo em dia! Nenhuma revisão pendente para hoje.</p>
             </div>
           ) : (
             <div className="space-y-3">
               {pendingReviews.map(review => (
                 <div key={review.id} className="glass-card p-6 flex items-center justify-between group border-white/[0.05] hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform flex-shrink-0">
                          <RefreshCw size={20} />
                       </div>
                       <div className="min-w-0">
                          <h5 className="font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{review.titulo}</h5>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 uppercase font-bold">
                                {review.tipo}
                             </span>
                             <span className="text-[10px] flex items-center gap-1 text-amber-500 font-bold">
                                <Clock size={10} /> 
                                {isToday(new Date(review.data_revisao)) ? 'Hoje' : format(new Date(review.data_revisao), "dd/MM", { locale: ptBR })}
                             </span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">Como foi o seu domínio?</span>
                       {[1, 2, 3, 4, 5].map(q => (
                         <button 
                           key={q}
                           onClick={() => completeReview(review, q)}
                           className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold hover:bg-white/20 transition-all hover:scale-110"
                           style={{ color: q > 3 ? '#10b981' : q > 2 ? '#f59e0b' : '#ef4444' }}
                         >
                           {q}
                         </button>
                       ))}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </section>

        <section className="space-y-4">
           <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              <CalendarIcon size={14} />
              Próximas revisões ({upcomingReviews.length})
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              {upcomingReviews.map(review => (
                <div key={review.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                   <div className="flex justify-between items-start mb-3">
                      <h6 className="text-sm font-bold text-slate-300 truncate w-40">{review.titulo}</h6>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                         Nível {review.nivel_confianca}
                      </span>
                   </div>
                   <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2 text-slate-500 font-bold">
                         <CalendarIcon size={12} />
                         {format(new Date(review.proxima_revisao!), "dd 'de' MMMM", { locale: ptBR })}
                      </div>
                      <div className="text-emerald-500 font-bold">
                         Em {review.intervalo_dias} dias
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </div>

      {/* Coluna Lateral: Estatísticas e Insights */}
      <div className="lg:col-span-4 space-y-6">
         <div className="glass-card p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
            <h4 className="font-bold text-white mb-6 flex items-center gap-2">
               <TrendingUp size={18} className="text-cyan-400" />
               Performance de Retenção
            </h4>
            
            <div className="space-y-6">
                <div className="flex items-end justify-around h-24 gap-2">
                   {[0, 0, 0, 0, 0, 0, 0].map((h, i) => (
                     <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          className="absolute bottom-0 left-0 right-0 rounded-t-lg"
                          style={{ backgroundColor: mainColor, opacity: 0.3 + (h/200) }}
                        />
                     </div>
                   ))}
                </div>
               
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Taxa de Acerto</span>
                      <span className="text-xl font-black text-white">0%</span>
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Dificuldade Média</span>
                      <span className="text-xl font-black text-slate-500">---</span>
                   </div>
                </div>
            </div>
         </div>

         <div className="glass-card p-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
               <History size={18} className="text-slate-400" />
               Histórico Recente
            </h4>
             <div className="space-y-4">
                <p className="text-xs text-slate-500 italic">Nenhum histórico disponível.</p>
             </div>
         </div>

         <div className="glass-card p-6 border-dashed bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500">
                  <Zap size={18} />
               </div>
               <h4 className="font-bold text-white text-sm">Dica Pro</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed italic">
              "Tente revisar conteúdos difíceis logo pela manhã. A repetição espaçada funciona melhor quando o cérebro está descansado."
            </p>
         </div>
      </div>
    </div>
  )
}
