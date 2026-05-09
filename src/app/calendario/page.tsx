'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, X, Clock, BookOpen, Tag, Save, RefreshCw } from 'lucide-react'
import { GoogleCalendarService } from '@/services/googleCalendar'

const TIPO_CORES: Record<string, string> = {
  evento: '#06b6d4',
  prova: '#ef4444',
  tutoria: '#8b5cf6',
  revisao: '#f59e0b',
  tarefa: '#10b981',
  aula: '#3b82f6',
}

interface CalEvent {
  id: string; titulo: string; tipo: string; materia_id?: string;
  data_inicio: string; data_fim?: string; cor?: string; completo?: boolean; descricao?: string
}

export default function CalendarioPage() {
  const toast = useToast()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string }[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  const [form, setForm] = useState({
    titulo: '', tipo: 'evento', materia_id: '', data_inicio: '', data_fim: '', descricao: ''
  })
  const [syncing, setSyncing] = useState(false)

  const GENETICA_ID = '90185a0e-b3f7-4bf4-b40b-6a2cfef96baa'

  const carregar = useCallback(async () => {
    const [{ data: evts }, { data: mats }] = await Promise.all([
      supabase.from('calendar_events').select('*').order('data_inicio'),
      supabase.from('materias').select('id, nome'),
    ])
    setEvents(evts || [])
    setMaterias(mats || [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function handleDateSelect(selectInfo: DateSelectArg) {
    setSelectedEvent(null)
    setForm({
      titulo: '', tipo: 'evento', materia_id: '', descricao: '',
      data_inicio: selectInfo.startStr, data_fim: selectInfo.endStr || selectInfo.startStr,
    })
    setShowModal(true)
  }

  function handleEventClick(clickInfo: EventClickArg) {
    const ev = events.find(e => e.id === clickInfo.event.id)
    if (ev) {
      setSelectedEvent(ev)
      setForm({
        titulo: ev.titulo, tipo: ev.tipo, materia_id: ev.materia_id || '',
        data_inicio: ev.data_inicio, data_fim: ev.data_fim || '', descricao: ev.descricao || ''
      })
      setShowModal(true)
    }
  }

  async function salvar() {
    if (!form.titulo || !form.data_inicio) return toast('Preencha o título e data.', 'error')
    try {
      if (selectedEvent) {
        await supabase.from('calendar_events').update({
          titulo: form.titulo, tipo: form.tipo, materia_id: form.materia_id || null,
          data_inicio: form.data_inicio, data_fim: form.data_fim || null, descricao: form.descricao || null,
          cor: TIPO_CORES[form.tipo] || '#06b6d4',
        }).eq('id', selectedEvent.id)
        toast('Evento atualizado!', 'success')
      } else {
        await supabase.from('calendar_events').insert({
          titulo: form.titulo, tipo: form.tipo, materia_id: form.materia_id || null,
          data_inicio: form.data_inicio, data_fim: form.data_fim || null, descricao: form.descricao || null,
          cor: TIPO_CORES[form.tipo] || '#06b6d4',
        })
        toast('Evento criado!', 'success')
      }
      setShowModal(false)
      carregar()
    } catch { toast('Erro ao salvar evento.', 'error') }
  }

  async function excluir() {
    if (!selectedEvent) return
    await supabase.from('calendar_events').delete().eq('id', selectedEvent.id)
    toast('Evento excluído.', 'info')
    setShowModal(false)
    carregar()
  }

  async function sincronizarGoogle() {
    setSyncing(true)
    try {
      // 1. Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return toast('Usuário não autenticado.', 'error')

      // 2. Tentar obter token salvo (ou pedir login)
      let token = await GoogleCalendarService.getAccessToken()
      
      if (!token) {
        // Mock de trigger de login - Em produção abriria o popup do Google
        toast('Conectando ao Google...', 'info')
        // Aqui o usuário precisaria autorizar. Para o MVP, vamos assumir que ele pode colar um token
        // ou que o sistema já lidou com isso via GIS.
        // Simulando a necessidade de configuração:
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!clientId) {
          toast('Configure o Google Client ID nas variáveis de ambiente.', 'error')
          return
        }
      }

      if (token) {
        const gEvents = await GoogleCalendarService.fetchEvents(token)
        await GoogleCalendarService.syncEvents(gEvents, user.id, GENETICA_ID)
        toast('Calendário sincronizado com sucesso!', 'success')
        carregar()
      } else {
        toast('Não foi possível obter acesso ao Google Calendar.', 'error')
      }
    } catch (error: any) {
      console.error(error)
      toast('Erro na sincronização: ' + error.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const calEvents = events.map(e => ({
    id: e.id, title: e.titulo, start: e.data_inicio, end: e.data_fim || undefined,
    color: e.cor || TIPO_CORES[e.tipo] || '#06b6d4',
    extendedProps: { tipo: e.tipo }
  }))

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendário</h2>
          <p className="text-slate-500 text-sm mt-0.5">Organize provas, tutorias, revisões e eventos</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={sincronizarGoogle} 
            disabled={syncing}
            className="btn-premium bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Google'}
          </button>
          <button onClick={() => { setSelectedEvent(null); setForm({ titulo: '', tipo: 'evento', materia_id: '', data_inicio: new Date().toISOString().slice(0, 16), data_fim: '', descricao: '' }); setShowModal(true) }} className="btn-premium">
            <Plus size={16} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="glass-card p-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' }}
            locale="pt-br"
            selectable={true}
            editable={true}
            events={calEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {Object.entries(TIPO_CORES).map(([tipo, cor]) => (
            <div key={tipo} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cor }} />
              <span className="text-xs text-slate-400 capitalize">{tipo}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-slate-200">
                  {selectedEvent ? 'Editar Evento' : 'Novo Evento'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <input placeholder="Título" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="input-dark" />
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="select-dark">
                  {Object.keys(TIPO_CORES).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <select value={form.materia_id} onChange={e => setForm({ ...form, materia_id: e.target.value })} className="select-dark">
                  <option value="">Matéria (opcional)</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input type="datetime-local" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className="input-dark" />
                  <input type="datetime-local" value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} className="input-dark" placeholder="Fim (opc.)" />
                </div>
                <textarea placeholder="Descrição (opcional)" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input-dark min-h-[60px]" />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={salvar} className="btn-premium flex-1 justify-center"><Save size={16} /> Salvar</button>
                {selectedEvent && (
                  <button onClick={excluir} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                    Excluir
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
