'use client'

import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { supabase } from '@/lib/supabase'
import { Plus, Filter, MoreVertical, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/components/shared/Toast'
import { useRef } from 'react'
import { X, Save, RefreshCw } from 'lucide-react'
import { GoogleCalendarService } from '@/services/googleCalendar'

interface CalendarTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function CalendarTab({ materiaId, workspaceId, mainColor }: CalendarTabProps) {
  const toast = useToast()
  const calendarRef = useRef<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dayGridMonth')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    titulo: '', tipo: 'aula', data_inicio: '', data_fim: '', descricao: ''
  })

  useEffect(() => {
    fetchEvents()
  }, [materiaId])

  async function fetchEvents() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('materia_id', materiaId)

      if (error) throw error
      
      const formattedEvents = data.map(event => ({
        id: event.id,
        title: event.titulo,
        start: event.data_inicio,
        end: event.data_fim,
        backgroundColor: event.cor || mainColor,
        borderColor: 'transparent',
        extendedProps: {
          tipo: event.tipo,
          descricao: event.descricao
        }
      }))
      
      setEvents(formattedEvents)
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
    } finally {
      setLoading(false)
    }
  }

  function changeView(view: string) {
    setCurrentView(view)
    if (calendarRef.current) {
      const api = calendarRef.current.getApi()
      api.changeView(view)
    }
  }

  async function salvarEvento() {
    if (!form.titulo || !form.data_inicio) return toast('Preencha o título e data.', 'error')
    try {
      const { error } = await supabase.from('calendar_events').insert({
        titulo: form.titulo,
        tipo: form.tipo,
        materia_id: materiaId,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        descricao: form.descricao || null,
        cor: form.tipo === 'aula' ? '#3b82f6' : 
             form.tipo === 'prova' ? '#ef4444' : 
             form.tipo === 'trabalho' ? '#f59e0b' : 
             form.tipo === 'abertura' ? '#8b5cf6' : 
             form.tipo === 'fechamento' ? '#10b981' : 
             '#64748b'
      })

      if (error) throw error
      toast('Evento agendado!', 'success')
      setShowModal(false)
      fetchEvents()
    } catch {
      toast('Erro ao salvar evento.', 'error')
    }
  }

  async function sincronizarGoogle() {
    try {
      const token = await GoogleCalendarService.getAccessToken()
      if (!token) return toast('Acesso ao Google negado.', 'error')

      toast('Buscando eventos...', 'info')
      const googleEvents = await GoogleCalendarService.fetchEvents(token)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await GoogleCalendarService.syncEvents(googleEvents, user.id, materiaId)
      
      toast('Sincronização concluída!', 'success')
      fetchEvents()
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      toast('Erro na sincronização.', 'error')
    }
  }

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon size={24} style={{ color: mainColor }} />
            Cronograma Acadêmico
          </h3>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">Gerencie suas aulas, provas e prazos importantes.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={sincronizarGoogle}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="Sincronizar com Google Calendar"
          >
            <RefreshCw size={16} />
            <span>Sincronizar</span>
          </button>
          <button 
            onClick={() => {
              setForm({ titulo: '', tipo: 'aula', data_inicio: new Date().toISOString().slice(0, 16), data_fim: '', descricao: '' })
              setShowModal(true)
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all ml-auto sm:ml-0"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-8 overflow-y-auto lg:overflow-hidden custom-scrollbar pb-6 lg:pb-0">
        {/* Calendário Principal */}
        <div className="lg:col-span-9 glass-card p-4 lg:p-6 min-h-[500px] lg:min-h-0 flex flex-col order-2 lg:order-1">
          <div className="flex-1 calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth'}
              headerToolbar={false}
              events={events}
              locale="pt-br"
              height="100%"
              dayMaxEvents={true}
              eventContent={(eventInfo) => (
                <div className="px-2 py-1 rounded-lg text-[10px] font-bold truncate flex items-center gap-1.5" style={{ backgroundColor: `${eventInfo.event.backgroundColor}20`, color: eventInfo.event.backgroundColor }}>
                   <div className="w-1 h-1 rounded-full" style={{ backgroundColor: eventInfo.event.backgroundColor }} />
                   {eventInfo.event.title}
                </div>
              )}
            />
          </div>
        </div>

        {/* Barra Lateral: Próximos Eventos */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-1 lg:order-2">
           <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <h4 className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Próximos 7 Dias</h4>
              <div className="space-y-6">
                 {events.length === 0 ? (
                   <p className="text-xs text-slate-600 italic">Nenhum evento agendado.</p>
                 ) : (
                   events.slice(0, 3).map(event => (
                     <div key={event.id} className="relative pl-4 border-l-2" style={{ borderColor: event.backgroundColor }}>
                        <h5 className="text-sm font-bold text-white mb-1">{event.title}</h5>
                        <div className="space-y-1">
                           <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                              <Clock size={10} /> {format(new Date(event.start), "HH:mm")}
                           </div>
                           <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              <MapPin size={10} /> Online / Presencial
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>

           <div className="glass-card p-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Legenda</h4>
              <div className="space-y-3">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Aulas</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Provas</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Trabalhos</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Abertura de Problema</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase">Fechamento de Problema</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 w-full max-w-md shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Agendar Evento</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-500"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Título</label>
                  <input className="input-dark" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Nome da aula, prova..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo</label>
                    <select className="select-dark" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                      <option value="aula">Aula</option>
                      <option value="prova">Prova</option>
                      <option value="trabalho">Trabalho</option>
                      <option value="abertura">Abertura de Problema</option>
                      <option value="fechamento">Fechamento de Problema</option>
                      <option value="evento">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Início</label>
                    <input type="datetime-local" className="input-dark" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descrição</label>
                  <textarea className="input-dark min-h-[80px]" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Detalhes adicionais..." />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200">Cancelar</button>
                <button onClick={salvarEvento} className="btn-premium flex-1 justify-center"><Save size={16} /> Agendar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .fc {
          --fc-border-color: rgba(255, 255, 255, 0.04);
          --fc-button-bg-color: transparent;
          --fc-button-border-color: rgba(255, 255, 255, 0.1);
          --fc-button-text-color: #94a3b8;
          --fc-button-hover-bg-color: rgba(255, 255, 255, 0.05);
          --fc-button-active-bg-color: rgba(255, 255, 255, 0.1);
          --fc-today-bg-color: rgba(255, 255, 255, 0.02);
          font-family: inherit;
        }
        .fc .fc-toolbar-title { font-size: 1rem; font-weight: 800; color: white; text-transform: uppercase; letter-spacing: 0.1em; }
        .fc .fc-col-header-cell-cushion { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #475569; padding: 1rem 0; }
        .fc .fc-daygrid-day-number { font-size: 11px; font-weight: 700; color: #475569; padding: 8px; }
        .fc .fc-daygrid-day.fc-day-today { background: rgba(255, 255, 255, 0.03); }
        .fc .fc-daygrid-event { border: none !important; margin-bottom: 2px !important; }
        .fc-theme-standard td, .fc-theme-standard th { border-color: rgba(255, 255, 255, 0.04) !important; }
        .calendar-container {
           mask-image: linear-gradient(to bottom, black 95%, transparent 100%);
        }
      `}</style>
    </div>
  )
}
