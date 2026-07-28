'use client'

import { useState, useRef, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listNotes } from '@/services/database/notes'
import AppShell from '@/components/layout/AppShell'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, Bot, User, Loader2, FileText,
  Brain, Lightbulb, BookOpen, Search, ChevronDown,
} from 'lucide-react'
import type { Note } from '@/types/database'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: { titulo: string; id: string }[]
  timestamp: Date
}

export default function CopilotoPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSources, setShowSources] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load all notes for RAG context
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.$id],
    queryFn: () => listNotes(user!.$id),
    enabled: !!user,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Simple RAG: busca notas relevantes por keyword matching.
   * Em produção, usaria embeddings via /api/embeddings.
   */
  function findRelevantNotes(query: string): Note[] {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    if (keywords.length === 0) return []

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
      // RAG: find relevant notes
      const relevantNotes = findRelevantNotes(question)
      const context = relevantNotes.map(n => ({
        titulo: n.titulo,
        conteudo: typeof n.conteudo === 'string' ? n.conteudo : JSON.stringify(n.conteudo || '').slice(0, 500),
      }))

      const response = await fetch('/api/copiloto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context, userEmail: user?.email }),
      })

      const data = await response.json()
      const text = data?.answer || 'Desculpe, não consegui gerar uma resposta.'

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        sources: relevantNotes.length > 0
          ? relevantNotes.map(n => ({ titulo: n.titulo, id: n.$id }))
          : undefined,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro ao conectar com a IA. Verifique se a GEMINI_API_KEY está configurada.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-rose-500/20 flex items-center justify-center">
              <Brain size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">IA Copilot</h1>
              <p className="text-xs text-slate-500">
                {notes.length > 0
                  ? `RAG ativo — ${notes.length} notas indexadas`
                  : 'Chat livre com IA — crie notas para ativar RAG'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-lg"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-6">
                  <Bot size={36} className="text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-200 mb-2">Copiloto de Estudos</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Pergunte qualquer coisa. O copiloto usa suas notas como contexto para respostas mais precisas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Lightbulb, text: 'Explique a fisiopatologia da insuficiência cardíaca' },
                    { icon: BookOpen, text: 'Resuma os tipos de choque e seus tratamentos' },
                    { icon: Search, text: 'Quais são os critérios diagnósticos do LES?' },
                    { icon: Brain, text: 'Compare os mecanismos de ação das classes de anti-hipertensivos' },
                  ].map(suggestion => (
                    <button
                      key={suggestion.text}
                      onClick={() => setInput(suggestion.text)}
                      className="glass-card p-3 text-left hover:border-violet-500/20 transition-all group"
                    >
                      <suggestion.icon size={14} className="text-violet-400/60 mb-1.5 group-hover:text-violet-400 transition-colors" />
                      <p className="text-xs text-slate-400 line-clamp-2 group-hover:text-slate-300 transition-colors">{suggestion.text}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-violet-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/10 border border-cyan-500/20 text-slate-200'
                        : 'bg-white/[0.03] border border-white/[0.06] text-slate-300'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowSources(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="text-[0.65rem] text-violet-400/60 hover:text-violet-400 flex items-center gap-1 transition-colors"
                        >
                          <FileText size={10} />
                          {msg.sources.length} nota{msg.sources.length > 1 ? 's' : ''} referenciada{msg.sources.length > 1 ? 's' : ''}
                          <ChevronDown size={10} className={`transition-transform ${showSources[msg.id] ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {showSources[msg.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-1 space-y-1"
                            >
                              {msg.sources.map(src => (
                                <p key={src.id} className="text-[0.6rem] text-slate-500 flex items-center gap-1">
                                  <FileText size={9} />
                                  {src.titulo}
                                </p>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <p className="text-[0.55rem] text-slate-600 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} className="text-cyan-400" />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Loader2 size={14} className="text-violet-400 animate-spin" />
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
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <form
            onSubmit={e => { e.preventDefault(); handleSend() }}
            className="flex items-center gap-3 max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte algo ao copiloto..."
              className="form-input flex-1"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn-premium px-4"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
