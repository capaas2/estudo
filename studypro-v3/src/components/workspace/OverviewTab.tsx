'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Trophy, 
  Target, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Brain,
  Zap,
  ArrowRight
} from 'lucide-react'
import { motion } from 'framer-motion'

interface OverviewTabProps {
  materia: any
  workspace: any
  workspaceId: string
  mainColor: string
}

export default function OverviewTab({ materia, workspace, workspaceId, mainColor }: OverviewTabProps) {
  const [stats, setStats] = useState({
    tasksDone: 0,
    totalTasks: 0,
    notesCount: 0,
    reviewsPending: 0,
    averageScore: 0,
    faltas: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [workspaceId, materia.id])

  async function fetchStats() {
    setLoading(true)
    try {
      // 1. Tarefas
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('workspace_id', workspaceId)

      // 2. Notas
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('materia_id', materia.id)

      // 3. Revisões Pendentes
      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('materia_id', materia.id)
        .eq('status', 'pendente')
      
      setStats({
        tasksDone: tasks?.filter(t => t.status === 'done').length || 0,
        totalTasks: tasks?.length || 0,
        notesCount: notesCount || 0,
        reviewsPending: reviewsCount || 0,
        averageScore: 0, 
        faltas: 0 
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const taskProgress = stats.totalTasks > 0 ? Math.round((stats.tasksDone / stats.totalTasks) * 100) : 0
  const manualProgress = workspace?.progresso || 0
  const totalCarga = workspace?.carga_horaria || 0
  const realizadoCarga = Math.round((totalCarga * manualProgress) / 100) 

  return (
    <div className="h-full flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
      {/* Hero Stats */}
      <div className="grid grid-cols-4 gap-6">
         {[
           { label: 'Progresso Geral', value: `${manualProgress}%`, icon: Trophy, color: mainColor },
           { label: 'Tarefas Ativas', value: stats.totalTasks - stats.tasksDone, icon: Target, color: '#f59e0b' },
           { label: 'Notas Criadas', value: stats.notesCount, icon: Brain, color: '#8b5cf6' },
           { label: 'Revisões Hoje', value: stats.reviewsPending, icon: Zap, color: '#ec4899' },
         ].map((stat, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className="glass-card p-6 border-white/[0.05] hover:border-white/10 transition-all group"
           >
              <div className="flex items-center justify-between mb-4">
                 <div className="p-3 rounded-2xl bg-white/5" style={{ color: stat.color }}>
                    <stat.icon size={20} />
                 </div>
                 <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                   {loading ? '...' : 'Ativo'}
                 </span>
              </div>
              <h4 className="text-2xl font-black text-white mb-1">{stat.value}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{stat.label}</p>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Progresso Visual */}
        <div className="col-span-8 space-y-8">
           <div className="glass-card p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <TrendingUp size={120} style={{ color: mainColor }} />
              </div>
              <div className="relative z-10">
                 <h3 className="text-xl font-bold text-white mb-2">Meta do Período</h3>
                 <p className="text-sm text-slate-500 mb-8">
                   Você completou {stats.tasksDone} de {stats.totalTasks} tarefas planejadas.
                 </p>
                 
                 <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                       <span>PROCESSO DE APRENDIZAGEM</span>
                       <span style={{ color: mainColor }}>{taskProgress}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.05]">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${taskProgress}%` }}
                         className="h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                         style={{ backgroundColor: mainColor }}
                       />
                    </div>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="glass-card p-6">
                 <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-cyan-400" />
                    Carga Horária
                 </h4>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-500">Total Disciplina</span>
                       <span className="text-xs font-bold text-white">{totalCarga}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-500">Estimado Realizado</span>
                       <span className="text-xs font-bold text-white">{realizadoCarga}h</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${manualProgress}%` }}
                         className="h-full bg-cyan-400" 
                       />
                    </div>
                 </div>
              </div>

              <div className="glass-card p-6">
                 <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    Status Acadêmico
                 </h4>
                 <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                       <span className="text-[10px] font-black text-emerald-400 uppercase block mb-1">Média</span>
                       <span className="text-xl font-black text-white">{stats.averageScore.toFixed(1)}</span>
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                       <span className="text-[10px] font-black text-amber-400 uppercase block mb-1">Faltas</span>
                       <span className="text-xl font-black text-white">{stats.faltas}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Timeline Rápida */}
        <div className="col-span-4 space-y-6">
           <div className="glass-card p-6">
              <h4 className="font-bold text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                 <Calendar size={16} style={{ color: mainColor }} />
                 Tarefas Pendentes
              </h4>
              <div className="space-y-6">
                 {stats.totalTasks - stats.tasksDone === 0 ? (
                   <p className="text-xs text-slate-500 italic">Nenhuma tarefa pendente.</p>
                 ) : (
                   <p className="text-xs text-slate-500">
                     Você tem {stats.totalTasks - stats.tasksDone} tarefas aguardando conclusão na aba de Tarefas.
                   </p>
                 )}
              </div>
              <button className="w-full mt-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                 Ver Todas as Tarefas <ArrowRight size={14} />
              </button>
           </div>

           <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Brain size={20} />
                 </div>
                 <div>
                    <h4 className="font-bold text-white text-sm">IA Copilot</h4>
                    <p className="text-[10px] text-slate-400">Insights em tempo real</p>
                 </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                {stats.reviewsPending > 0 
                  ? `Você tem ${stats.reviewsPending} revisões pendentes. Inicie o ciclo de repetição espaçada agora para não esquecer o conteúdo!`
                  : stats.totalTasks > 0 
                    ? "Continue focando nas suas tarefas ativas para manter o ritmo de estudo alto."
                    : "Comece criando algumas notas ou tarefas para que eu possa analisar seu desempenho."}
              </p>
           </div>
        </div>
      </div>
    </div>
  )
}
