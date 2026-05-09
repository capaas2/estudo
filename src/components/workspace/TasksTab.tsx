'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  MoreHorizontal, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Circle,
  GripVertical,
  Calendar as CalendarIcon,
  Filter,
  Search,
  Trash2,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Task {
  id: string
  titulo: string
  descricao: string
  status: 'todo' | 'doing' | 'done'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  vencimento: string | null
  ordem: number
}

interface TasksTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function TasksTab({ materiaId, workspaceId, mainColor }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null) // Column ID
  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    fetchTasks()
  }, [workspaceId])

  async function fetchTasks() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('ordem', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addTask(status: string) {
    if (!newTaskTitle.trim()) return
    try {
      const user = (await supabase.auth.getUser()).data.user
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user?.id,
          workspace_id: workspaceId,
          materia_id: materiaId,
          titulo: newTaskTitle,
          status: status,
          ordem: tasks.filter(t => t.status === status).length,
          prioridade: 'media'
        })
        .select()
        .single()

      if (error) throw error
      setTasks([...tasks, data])
      setNewTaskTitle('')
      setIsAddingTask(null)
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error)
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: Task['status']) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
    }
  }

  async function deleteTask(taskId: string) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
    }
  }

  const columns = [
    { id: 'todo', label: 'A Fazer', icon: Circle, color: 'text-slate-400' },
    { id: 'doing', label: 'Em Andamento', icon: Clock, color: 'text-amber-500' },
    { id: 'done', label: 'Concluído', icon: CheckCircle2, color: 'text-emerald-500' },
  ]

  const priorityColors = {
    baixa: 'bg-slate-500/20 text-slate-400',
    media: 'bg-blue-500/20 text-blue-400',
    alta: 'bg-orange-500/20 text-orange-400',
    urgente: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-white">Board de Tarefas</h3>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Filter size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Filtros</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Buscar tarefas..." 
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-white/20 transition-all w-48"
            />
          </div>
          <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col bg-white/[0.01] rounded-2xl border border-white/[0.04] overflow-hidden">
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <column.icon size={16} className={column.color} />
                <h4 className="text-sm font-bold text-slate-200">{column.label}</h4>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold text-slate-500 border border-white/10">
                  {tasks.filter(t => t.status === column.id).length}
                </span>
              </div>
              <button 
                onClick={() => setIsAddingTask(column.id)}
                className="p-1 hover:bg-white/5 rounded-md text-slate-500 hover:text-slate-300 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <AnimatePresence>
                {isAddingTask === column.id && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card p-4 border-dashed"
                    style={{ borderColor: `${mainColor}40` }}
                  >
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="O que precisa ser feito?"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTask(column.id)}
                      className="w-full bg-transparent text-sm font-medium text-white focus:outline-none mb-3"
                    />
                    <div className="flex items-center justify-between">
                       <div className="flex gap-2">
                          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 cursor-pointer hover:text-slate-300">
                             <CalendarIcon size={12} />
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => setIsAddingTask(null)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-300"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => addTask(column.id)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold text-white shadow-lg"
                            style={{ backgroundColor: mainColor }}
                          >
                            Adicionar
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}

                {tasks.filter(t => t.status === column.id).map((task) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-card p-4 group cursor-grab active:cursor-grabbing border-white/[0.05] hover:border-white/10 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-slate-600 group-hover:text-slate-400 transition-colors">
                        <GripVertical size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-slate-200 mb-2 leading-tight">
                          {task.titulo}
                        </h5>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${priorityColors[task.prioridade]}`}>
                            {task.prioridade}
                          </span>
                          
                          {task.vencimento && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                              <CalendarIcon size={10} />
                              {format(new Date(task.vencimento), "dd MMM", { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => deleteTask(task.id)}
                            className="p-1 hover:text-red-400 text-slate-600 transition-colors"
                         >
                            <Trash2 size={12} />
                         </button>
                         <button 
                            onClick={() => {
                              const next = column.id === 'todo' ? 'doing' : 'done'
                              updateTaskStatus(task.id, next as Task['status'])
                            }}
                            className="p-1 hover:text-emerald-400 text-slate-600 transition-colors"
                            hidden={column.id === 'done'}
                         >
                            <ChevronRight size={12} />
                         </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {!loading && tasks.filter(t => t.status === column.id).length === 0 && !isAddingTask && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-white/[0.03] rounded-2xl text-slate-700 text-xs italic">
                  Solte tarefas aqui
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

