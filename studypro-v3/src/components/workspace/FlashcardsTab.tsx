'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Layers, 
  Search, 
  Play, 
  Settings, 
  MoreVertical, 
  Zap,
  TrendingUp,
  RotateCcw,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Flashcard {
  id: string
  frente: string
  verso: string
  deck: string
  tags: string[]
  criado_em: string
}

interface FlashcardsTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function FlashcardsTab({ materiaId, workspaceId, mainColor }: FlashcardsTabProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [isStudying, setIsStudying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCard, setNewCard] = useState({ frente: '', verso: '', deck: 'Geral' })

  useEffect(() => {
    fetchFlashcards()
  }, [materiaId])

  async function fetchFlashcards() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('materia_id', materiaId)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setFlashcards(data || [])
    } catch (error) {
      console.error('Erro ao buscar flashcards:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addCard() {
    if (!newCard.frente || !newCard.verso) return
    try {
      const user = (await supabase.auth.getUser()).data.user
      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user?.id,
          materia_id: materiaId,
          ...newCard
        })
        .select()
        .single()

      if (error) throw error
      setFlashcards([data, ...flashcards])
      setNewCard({ frente: '', verso: '', deck: 'Geral' })
      setShowAddModal(false)
    } catch (error) {
      console.error('Erro ao adicionar flashcard:', error)
    }
  }

  const startStudy = () => {
    if (flashcards.length === 0) return
    setIsStudying(true)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    } else {
      setIsStudying(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      {isStudying ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-12">
           <div className="flex items-center gap-4 text-slate-500 font-bold uppercase tracking-widest text-xs">
              <Layers size={14} />
              Card {currentIndex + 1} de {flashcards.length}
           </div>

           <div 
             className="w-full max-w-2xl aspect-[16/9] relative cursor-pointer perspective-1000"
             onClick={() => setIsFlipped(!isFlipped)}
           >
              <motion.div 
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="w-full h-full relative preserve-3d"
              >
                {/* Frente */}
                <div className="absolute inset-0 bg-[#161b2c] border-2 border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center p-12 backface-hidden shadow-2xl">
                   <span className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Pergunta</span>
                   <p className="text-2xl font-bold text-center text-white leading-relaxed">{flashcards[currentIndex].frente}</p>
                   <span className="absolute bottom-8 text-xs text-slate-500 flex items-center gap-2 animate-pulse">
                      <RotateCcw size={14} /> Clique para ver a resposta
                   </span>
                </div>

                {/* Verso */}
                <div className="absolute inset-0 bg-[#1e2439] border-2 border-white/20 rounded-[2.5rem] flex flex-col items-center justify-center p-12 backface-hidden shadow-2xl rotate-y-180" style={{ borderColor: `${mainColor}40` }}>
                   <span className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Resposta</span>
                   <p className="text-2xl font-bold text-center text-white leading-relaxed">{flashcards[currentIndex].verso}</p>
                </div>
              </motion.div>
           </div>

           <AnimatePresence>
             {isFlipped && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex gap-4"
               >
                  <button onClick={nextCard} className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-red-400 font-bold hover:bg-red-400/10 transition-all flex items-center gap-2">
                    <XCircle size={18} /> Errei
                  </button>
                  <button onClick={nextCard} className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-amber-400 font-bold hover:bg-amber-400/10 transition-all flex items-center gap-2">
                    <HelpCircle size={18} /> Difícil
                  </button>
                  <button onClick={nextCard} className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-emerald-400 font-bold hover:bg-emerald-400/10 transition-all flex items-center gap-2" style={{ backgroundColor: `${mainColor}10`, borderColor: mainColor }}>
                    <CheckCircle2 size={18} /> Fácil
                  </button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      ) : (
        <>
          <header className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Brain size={24} style={{ color: mainColor }} />
                Flashcards Intelligence
              </h3>
              <p className="text-sm text-slate-500 mt-1">Domine o conteúdo através da repetição e testes ativos.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAddModal(true)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all"
              >
                <Plus size={20} />
              </button>
              <button 
                onClick={startStudy}
                disabled={flashcards.length === 0}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: mainColor }}
              >
                <Play size={16} fill="currentColor" /> Estudar Agora
              </button>
            </div>
          </header>

          <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">
            <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar flashcards..." 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                   [1, 2, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-white/[0.02] animate-pulse" />)
                ) : flashcards.length === 0 ? (
                   <div className="col-span-2 flex flex-col items-center justify-center py-20 text-slate-600 italic">
                      Nenhum card criado ainda.
                   </div>
                ) : (
                  flashcards.map(card => (
                    <div key={card.id} className="glass-card p-6 border-white/[0.04] hover:border-white/10 transition-all group relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical size={14} className="text-slate-500 cursor-pointer" />
                       </div>
                       <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">{card.deck}</div>
                       <h5 className="text-sm font-bold text-slate-200 line-clamp-2 mb-4 leading-relaxed">{card.frente}</h5>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Domínio: 85%</span>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="col-span-4 space-y-6">
               <div className="glass-card p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                     <TrendingUp size={16} className="text-amber-400" />
                     Status do Deck
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total</span>
                        <span className="text-2xl font-black text-white">{flashcards.length}</span>
                     </div>
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dominados</span>
                        <span className="text-2xl font-black text-emerald-400">0</span>
                     </div>
                  </div>
               </div>

               <div className="glass-card p-6">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                     <Settings size={16} className="text-slate-500" />
                     Configurações
                  </h4>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Cards por sessão</span>
                        <span className="font-bold text-white">20</span>
                     </div>
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Ordem aleatória</span>
                        <div className="w-8 h-4 bg-emerald-500/20 rounded-full relative">
                           <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-emerald-500 rounded-full" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Adição (Simplificado) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
               onClick={() => setShowAddModal(false)}
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-[#0d1221] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 shadow-2xl"
             >
                <h4 className="text-xl font-bold text-white mb-6">Novo Flashcard</h4>
                <div className="space-y-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pergunta (Frente)</label>
                      <textarea 
                        value={newCard.frente}
                        onChange={(e) => setNewCard({...newCard, frente: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-white/20 h-24 resize-none"
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Resposta (Verso)</label>
                      <textarea 
                        value={newCard.verso}
                        onChange={(e) => setNewCard({...newCard, verso: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-white/20 h-24 resize-none"
                      />
                   </div>
                </div>
                <div className="mt-8 flex gap-3">
                   <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-2xl bg-white/5 font-bold text-slate-400">Cancelar</button>
                   <button onClick={addCard} className="flex-1 py-3 rounded-2xl font-bold text-white shadow-xl" style={{ backgroundColor: mainColor }}>Criar Card</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}
