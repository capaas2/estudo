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

interface CalendarTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function CalendarTab({ materiaId, workspaceId, mainColor }: CalendarTabProps) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon size={24} style={{ color: mainColor }} />
            Cronograma Acadêmico
          </h3>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas aulas, provas e prazos importantes.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
             <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-white/10">Mês</button>
             <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-300 transition-all">Semana</button>
             <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-300 transition-all">Lista</button>
          </div>
          <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Calendário Principal */}
        <div className="col-span-9 glass-card p-6 overflow-hidden flex flex-col">
          <div className="flex-1 calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
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
        <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
           <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Próximos 7 Dias</h4>
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
              </div>
           </div>
        </div>
      </div>

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
