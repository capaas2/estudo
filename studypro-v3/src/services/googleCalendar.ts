import { supabase } from '@/lib/supabase'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
}

export class GoogleCalendarService {
  private static CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  private static SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

  static async getAccessToken(): Promise<string | null> {
    const savedToken = localStorage.getItem('google_access_token')
    const expiry = localStorage.getItem('google_token_expiry')
    
    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
      return savedToken
    }

    return new Promise((resolve) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: this.SCOPES,
          callback: (response: any) => {
            if (response.access_token) {
              localStorage.setItem('google_access_token', response.access_token)
              localStorage.setItem('google_token_expiry', (Date.now() + response.expires_in * 1000).toString())
              resolve(response.access_token)
            } else {
              resolve(null)
            }
          },
        })
        client.requestAccessToken()
      } catch (err) {
        console.error('Erro GIS:', err)
        resolve(null)
      }
    })
  }

  static async fetchEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + new Date().toISOString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Erro ao buscar eventos do Google Calendar')
    }

    const data = await response.json()
    return data.items || []
  }

  static async syncEvents(events: GoogleCalendarEvent[], userId: string, targetMateriaId: string) {
    const keywordRegex = /tutoria|conferencia|conferência|consultoria|consutoria|conferéncia/i

    for (const event of events) {
      const isTarget = keywordRegex.test(event.summary)
      const materiaId = isTarget ? targetMateriaId : null
      const tipo = isTarget ? 'tutoria' : 'evento'
      
      const start = event.start.dateTime || event.start.date
      const end = event.end.dateTime || event.end.date

      // Verificar se já existe (upsert por google_event_id)
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('google_event_id', event.id)
        .single()

      if (existing) {
        await supabase.from('calendar_events').update({
          titulo: event.summary,
          descricao: event.description,
          data_inicio: start,
          data_fim: end,
          materia_id: materiaId,
          tipo: tipo,
        }).eq('id', existing.id)
      } else {
        await supabase.from('calendar_events').insert({
          user_id: userId,
          google_event_id: event.id,
          titulo: event.summary,
          descricao: event.description,
          data_inicio: start,
          data_fim: end,
          materia_id: materiaId,
          tipo: tipo,
          cor: isTarget ? '#8b5cf6' : '#06b6d4'
        })
      }
    }
  }
}
