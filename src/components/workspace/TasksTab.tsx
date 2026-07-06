'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListChecks, Plus, Check, Trash2, Circle } from 'lucide-react'

interface TasksTabProps {
  materiaId: string
}

interface Task {
  id: string
  titulo: string
  concluida: boolean
  createdAt: Date
}

export default function TasksTab({ materiaId }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'concluidas'>('todas')

  function addTask() {
    if (!newTask.trim()) return
    setTasks(prev => [{
      id: Date.now().toString(),
      titulo: newTask.trim(),
      concluida: false,
      createdAt: new Date(),
    }, ...prev])
    setNewTask('')
  }

  function toggleTask(id: string) {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, concluida: !t.concluida } : t
    ))
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pendentes') return !t.concluida
    if (filter === 'concluidas') return t.concluida
    return true
  })

  const totalPendentes = tasks.filter(t => !t.concluida).length
  const totalConcluidas = tasks.filter(t => t.concluida).length

  return (
    <div className="space-y-4">
      {/* Add task */}
      <form
        onSubmit={e => { e.preventDefault(); addTask() }}
        className="flex items-center gap-3"
      >
        <input
          type="text"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Nova tarefa..."
          className="form-input flex-1"
        />
        <button
          type="submit"
          disabled={!newTask.trim()}
          className="btn-premium text-xs"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </form>

      {/* Filters + stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['todas', 'pendentes', 'concluidas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'tab-item-active' : 'tab-item'}
            >
              {f === 'todas' ? `Todas (${tasks.length})` : f === 'pendentes' ? `Pendentes (${totalPendentes})` : `Concluídas (${totalConcluidas})`}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Progresso</span>
            <span className="text-xs font-semibold text-cyan-400">
              {tasks.length > 0 ? Math.round((totalConcluidas / tasks.length) * 100) : 0}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${tasks.length > 0 ? (totalConcluidas / tasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <ListChecks size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {tasks.length === 0 ? 'Nenhuma tarefa ainda' : 'Nenhuma tarefa neste filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    task.concluida
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'border-white/[0.12] hover:border-cyan-500/30'
                  }`}
                >
                  {task.concluida && <Check size={12} />}
                </button>
                <span className={`flex-1 text-sm transition-colors ${
                  task.concluida ? 'text-slate-500 line-through' : 'text-slate-200'
                }`}>
                  {task.titulo}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="btn-icon text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
