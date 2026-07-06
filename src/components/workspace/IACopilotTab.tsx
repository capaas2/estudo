'use client'

import { useState, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listNotes } from '@/services/database/notes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, Bot, User, Loader2, FileText,
  Lightbulb, ChevronDown, Layers, Wand2,
} from 'lucide-react'
import type { Note } from '@/types/database'

interface IACopilotTabProps {
  materiaId: string
  materiaNome: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { titulo: string; id: string }[]
  timestamp: Date
}

export default function IACopilotTab({ materiaId, materiaNome }: IACopilotTabProps) {
  const { data: user } = useCurrentUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSources, setShowSources] = useState<Record<string, boolean>>({})

  // RAG: load notes for this subject only
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.$id, materiaId],
    queryFn: () => listNotes(user!.$id, materiaId),
    enabled: !!user,
  })

  function findRelevantNotes(query: string): Note[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    if (keywords.length === 0) return notes.slice(0, 3) // Return latest 3 if no keywords

    const scored = notes.map(note => {
      const content = `${note.titulo} ${JSON.stringify(note.conteudo || '')}`.toLowerCase()
      const score = keywords.reduce((s, kw) => s + (content.includes(kw) ? 1 : 0), 0)
      return { note, score }
    })

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.note)
  }

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    const question = input
    setInput('')
    setLoading(true)

    try {
      const relevantNotes = findRelevantNotes(question)
      const context = relevantNotes.map(n => ({
        titulo: n.titulo,
        conteudo: typeof n.conteudo === 'string' ? n.conteudo : JSON.stringify(n.conteudo || '').slice(0, 500),
      }))

      const response = await fetch('/api/copiloto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, materiaNome }),
      })

      const data = await response.json()

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.answer || 'Sem resposta.',
        sources: relevantNotes.length > 0
          ? relevantNotes.map(n => ({ titulo: n.titulo, id: n.$id }))
          : undefined,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro ao conectar com a IA.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)]">
      {/* Info bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/5 border border-violet-500/10 rounded-xl mb-3 text-xs text-violet-400/80">
        <Sparkles size={12} />
        Copiloto restrito a <span className="font-semibold">{materiaNome}</span> — {notes.length} nota{notes.length !== 1 ? 's' : ''} como contexto
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
              <Bot size={28} className="text-violet-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-200 mb-2">Copiloto de {materiaNome}</h3>
              <p className="text-xs text-slate-500 mb-4">Pergunte qualquer coisa sobre a matéria. Usa suas notas como contexto.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  `Resuma os principais conceitos de ${materiaNome}`,
                  'Explique para eu memorizar',
                  'Crie uma questão sobre este tema',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)} className="chip text-[0.65rem]">{s}</button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={12} className="text-violet-400" />
                </div>
              )}
              <div className="max-w-[80%]">
                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-cyan-500/10 border border-cyan-500/20 text-slate-200' : 'bg-white/[0.03] border border-white/[0.06] text-slate-300'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1">
                    <button onClick={() => setShowSources(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))} className="text-[0.6rem] text-violet-400/60 hover:text-violet-400 flex items-center gap-1">
                      <FileText size={9} /> {msg.sources.length} nota{msg.sources.length > 1 ? 's' : ''}
                      <ChevronDown size={9} className={`transition-transform ${showSources[msg.id] ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showSources[msg.id] && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1 space-y-0.5">
                          {msg.sources.map(src => (
                            <p key={src.id} className="text-[0.55rem] text-slate-500 flex items-center gap-1"><FileText size={8} />{src.titulo}</p>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-cyan-400" />
                </div>
              )}
            </motion.div>
          ))
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <Loader2 size={12} className="text-violet-400 animate-spin" />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-white/[0.06] mt-3">
        <form onSubmit={e => { e.preventDefault(); handleSend() }} className="flex items-center gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder={`Pergunte sobre ${materiaNome}...`} className="form-input flex-1" disabled={loading} />
          <button type="submit" disabled={!input.trim() || loading} className="btn-premium px-3">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  )
}
