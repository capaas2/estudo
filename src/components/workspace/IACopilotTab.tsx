'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Brain, 
  Zap, 
  Paperclip, 
  MessageSquare, 
  History, 
  Settings2,
  AlertCircle,
  RotateCcw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { gerarFlashcardsIA } from '@/services/iaService'
import { useToast } from '@/components/shared/Toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface IACopilotTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function IACopilotTab({ materiaId, workspaceId, mainColor }: IACopilotTabProps) {
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu Mentor IA especializado nesta matéria. Como posso te ajudar hoje?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function fetchConfig() {
    const { data } = await supabase.from('configuracoes').select('*').eq('id', 'default').single()
    setConfig(data)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      if (!config?.openrouter_api_key) {
        throw new Error('Chave de API do OpenRouter não configurada.')
      }

      // Buscar contexto da matéria (notas e tarefas)
      const { data: notes } = await supabase.from('notes').select('titulo, conteudo').eq('materia_id', materiaId).limit(5)
      const { data: tasks } = await supabase.from('tasks').select('titulo, status').eq('workspace_id', workspaceId)

      const contextText = `
        Contexto da Matéria:
        Notas: ${notes?.map(n => n.titulo).join(', ')}
        Tarefas Pendentes: ${tasks?.filter(t => t.status !== 'done').map(t => t.titulo).join(', ')}
      `

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.openrouter_api_key}`,
          "HTTP-Referer": "https://studypro.com",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: config.modelo_ia || "google/gemini-pro-1.5",
          messages: [
            { role: "system", content: `Você é um mentor acadêmico altamente inteligente. Ajude o aluno com a matéria. Aqui está o contexto atual dele: ${contextText}. Seja conciso, didático e motivador.` },
            ...messages,
            { role: "user", content: userMsg }
          ]
        })
      })

      const data = await response.json()
      const assistantMsg = data.choices[0].message.content
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMsg }])
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${error.message}. Verifique as configurações de IA.` }])
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(action: string) {
    let prompt = ""
    switch(action) {
      case 'resumir': prompt = "Pode fazer um resumo das minhas notas desta matéria?"; break;
      case 'flashcards': await handleGenerateFlashcards(); return;
      case 'explicar': prompt = "Pode me explicar os conceitos principais desta matéria como se eu tivesse 5 anos?"; break;
      default: return;
    }
    setInput(prompt)
    // Pequeno delay para o state do input atualizar antes de enviar
    setTimeout(() => sendMessage(), 100)
  }

  async function handleGenerateFlashcards() {
    setLoading(true)
    toast('Gerando flashcards com IA baseado no contexto...', 'info')
    try {
      // Buscar contexto das notas para gerar flashcards
      const { data: notes } = await supabase.from('notes').select('conteudo').eq('materia_id', materiaId).limit(3)
      const context = notes?.map(n => n.conteudo).join('\n') || 'Conteúdo geral da matéria'
      
      const result = await gerarFlashcardsIA(context, 'Geral', 5)
      const cards = (result as any).flashcards || []
      
      if (cards.length === 0) throw new Error('Nenhum flashcard gerado')

      const user = (await supabase.auth.getUser()).data.user
      const insertData = cards.map((fc: any) => ({
        user_id: user?.id,
        materia_id: materiaId,
        frente: fc.frente,
        verso: fc.verso,
        deck: 'IA Copilot',
        tags: ['IA']
      }))

      const { error } = await supabase.from('flashcards').insert(insertData)
      if (error) throw error

      setMessages(prev => [...prev, { role: 'assistant', content: `Acabei de gerar ${cards.length} novos flashcards para você! Você pode encontrá-los na aba de Flashcards.` }])
      toast(`${cards.length} flashcards criados!`, 'success')
    } catch (err) {
      toast('Erro ao gerar flashcards.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={24} className="text-violet-400 animate-pulse" />
            IA Copilot Intelligence
          </h3>
          <p className="text-sm text-slate-500 mt-1">Seu mentor pessoal com contexto total.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center">
             <Settings2 size={18} />
          </button>
          <button 
            onClick={() => setMessages([{ role: 'assistant', content: 'Chat reiniciado. Como posso ajudar?' }])}
            className="flex-1 sm:flex-none p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center"
          >
             <RotateCcw size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 overflow-hidden">
        {/* Janela de Chat */}
        <div className="flex-1 lg:col-span-8 glass-card flex flex-col overflow-hidden bg-white/[0.01]">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'assistant' 
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/20' 
                      : 'bg-white/10 text-white border border-white/10'
                  }`}>
                    {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
                  </div>
                  <div className={`max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed ${
                    msg.role === 'assistant' 
                      ? 'bg-white/[0.03] text-slate-200 border border-white/[0.05] rounded-tl-none' 
                      : 'text-white border border-white/10 rounded-tr-none'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: `${mainColor}20`, borderColor: `${mainColor}40` } : {}}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
               <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center animate-pulse">
                     <Bot size={20} />
                  </div>
                  <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex gap-1 items-center">
                     <div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <div className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" />
                  </div>
               </div>
            )}
          </div>

          <footer className="p-6 border-t border-white/[0.06] bg-white/[0.02]">
             <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Pergunte sobre a matéria..."
                  className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-4 sm:pl-6 pr-20 sm:pr-24 text-sm focus:outline-none focus:border-white/20 transition-all text-white"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                   <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
                      <Paperclip size={18} />
                   </button>
                   <button 
                     onClick={sendMessage}
                     disabled={loading || !input.trim()}
                     className="p-2.5 rounded-xl text-white shadow-lg disabled:opacity-50 transition-all hover:scale-105"
                     style={{ backgroundColor: mainColor }}
                   >
                      <Send size={18} />
                   </button>
                </div>
             </div>
          </footer>
        </div>

        {/* Barra Lateral: Ferramentas de IA */}
        <div className="flex-shrink-0 lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
           <div className="glass-card p-6 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                 <Zap size={14} className="text-amber-500" />
                 Ações Sugeridas
              </h4>
              <div className="space-y-3">
                 <button 
                  onClick={() => handleAction('resumir')}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-bold text-slate-300 hover:bg-white/10 transition-all group"
                 >
                    <div className="flex items-center justify-between">
                       <span>Resumir minhas notas</span>
                       <MessageSquare size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                 </button>
                 <button 
                  onClick={() => handleAction('flashcards')}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-bold text-slate-300 hover:bg-white/10 transition-all group"
                 >
                    <div className="flex items-center justify-between">
                       <span>Criar flashcards deste assunto</span>
                       <Brain size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                 </button>
                 <button 
                  onClick={() => handleAction('explicar')}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs font-bold text-slate-300 hover:bg-white/10 transition-all group"
                 >
                    <div className="flex items-center justify-between">
                       <span>Explicar como se eu tivesse 5 anos</span>
                       <Sparkles size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                 </button>
              </div>
           </div>

           <div className="glass-card p-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                 <History size={14} />
                 Dúvidas Frequentes
              </h4>
              <div className="space-y-4">
                 <p className="text-[10px] text-slate-500 leading-relaxed italic">
                   "A IA utiliza o conteúdo das suas notas e o status das suas tarefas para fornecer respostas personalizadas."
                 </p>
                 <div className="flex items-center gap-2 text-xs text-amber-500 font-bold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <AlertCircle size={14} />
                    <span>Beta: Pode cometer erros.</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
