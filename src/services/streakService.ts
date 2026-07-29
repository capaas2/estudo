/**
 * Serviço de Gerenciamento do Streak de Estudo (Sequência Diária)
 * Registra os dias de acesso do usuário e calcula a sequência real consecutiva.
 */

export interface StreakData {
  lastAccessDate: string // Formato YYYY-MM-DD
  currentStreak: number
  accessHistory: string[] // Lista de datas YYYY-MM-DD em que o usuário acessou
}

const LOCAL_STORAGE_KEY_STREAK = 'studypro_v4_streak'

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getYesterdayString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function getOrUpdateStreak(userId: string): StreakData {
  if (typeof window === 'undefined') {
    return { lastAccessDate: getTodayString(), currentStreak: 1, accessHistory: [getTodayString()] }
  }

  const storageKey = `${LOCAL_STORAGE_KEY_STREAK}_${userId}`
  const today = getTodayString()
  const yesterday = getYesterdayString()

  let rawData = localStorage.getItem(storageKey)
  let data: StreakData = rawData ? JSON.parse(rawData) : {
    lastAccessDate: '',
    currentStreak: 0,
    accessHistory: [],
  }

  if (!data.lastAccessDate) {
    // Primeiro acesso
    data = {
      lastAccessDate: today,
      currentStreak: 1,
      accessHistory: [today],
    }
  } else if (data.lastAccessDate === today) {
    // Já acessou hoje, mantém a contagem atual
    if (!data.accessHistory.includes(today)) {
      data.accessHistory.push(today)
    }
  } else if (data.lastAccessDate === yesterday) {
    // Acessou ontem e acessou hoje -> Incrementa a sequência!
    data.currentStreak += 1
    data.lastAccessDate = today
    if (!data.accessHistory.includes(today)) {
      data.accessHistory.push(today)
    }
  } else {
    // Perdeu a sequência -> Reinicia para 1 dia
    data.currentStreak = 1
    data.lastAccessDate = today
    if (!data.accessHistory.includes(today)) {
      data.accessHistory.push(today)
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(data))
  return data
}

/**
 * Retorna os 7 dias da semana atual com indicação de quais foram acessados.
 */
export function getWeeklyDaysStatus(history: string[] = []): { dayLabel: string; date: string; active: boolean; isToday: boolean }[] {
  const todayStr = getTodayString()
  const current = new Date()
  const dayOfWeek = current.getDay() // 0 = Domingo, 1 = Segunda...
  // Ajuste para segunda-feira ser o dia 0
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(current)
  monday.setDate(current.getDate() + mondayOffset)

  const labels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

  return labels.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return {
      dayLabel: label,
      date: dateStr,
      active: history.includes(dateStr),
      isToday: dateStr === todayStr,
    }
  })
}
