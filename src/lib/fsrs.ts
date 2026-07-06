/**
 * FSRS (Free Spaced Repetition Scheduler) — Engine v4
 * 
 * Implementação simplificada do algoritmo FSRS para cálculo de
 * intervalos de repetição espaçada em flashcards.
 * 
 * Referência: https://github.com/open-spaced-repetition/fsrs4anki
 */

import type { Flashcard, FlashcardReview } from '@/types/database'

// Parâmetros padrão do FSRS
const W = [
  0.4, 0.6, 2.4, 5.8,  // w0-w3: initial stability for each rating
  4.93, 0.94, 0.86, 0.01, // w4-w7: difficulty parameters
  1.49, 0.14, 0.94,       // w8-w10: stability after failure
  2.18, 0.05, 0.34, 1.26, // w11-w14: recall parameters
  0.29, 2.61,              // w15-w16: additional modifiers
]

export type Rating = 'again' | 'hard' | 'good' | 'easy'
export type CardState = 'new' | 'learning' | 'review' | 'relearning'

const RATING_MAP: Record<Rating, number> = { again: 1, hard: 2, good: 3, easy: 4 }

interface ScheduleResult {
  stability: number
  difficulty: number
  state: CardState
  due: string          // ISO date string
  elapsed_days: number
  scheduled_days: number
}

/**
 * Calcula o próximo agendamento de um flashcard baseado na avaliação.
 */
export function schedule(card: Flashcard, rating: Rating, now?: Date): ScheduleResult {
  const currentDate = now || new Date()
  const ratingNum = RATING_MAP[rating]

  const lastReview = card.last_review ? new Date(card.last_review) : currentDate
  const elapsedDays = Math.max(0, (currentDate.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24))

  if (card.state === 'new') {
    return scheduleNew(ratingNum, currentDate)
  }

  if (card.state === 'learning' || card.state === 'relearning') {
    return scheduleLearning(card, ratingNum, currentDate, elapsedDays)
  }

  // review state
  return scheduleReview(card, ratingNum, currentDate, elapsedDays)
}

function scheduleNew(rating: number, now: Date): ScheduleResult {
  const initialStability = W[rating - 1] // w0-w3
  const initialDifficulty = clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10)

  if (rating === 1) {
    // Again → learning, retry in 1 minute
    return {
      stability: initialStability,
      difficulty: initialDifficulty,
      state: 'learning',
      due: addMinutes(now, 1).toISOString(),
      elapsed_days: 0,
      scheduled_days: 0,
    }
  }

  if (rating === 2) {
    // Hard → learning, 5 minutes
    return {
      stability: initialStability,
      difficulty: initialDifficulty,
      state: 'learning',
      due: addMinutes(now, 5).toISOString(),
      elapsed_days: 0,
      scheduled_days: 0,
    }
  }

  // Good or Easy → review
  const scheduledDays = rating === 3 ? Math.max(1, Math.round(initialStability)) : Math.max(1, Math.round(initialStability * 1.3))

  return {
    stability: initialStability,
    difficulty: initialDifficulty,
    state: 'review',
    due: addDays(now, scheduledDays).toISOString(),
    elapsed_days: 0,
    scheduled_days: scheduledDays,
  }
}

function scheduleLearning(card: Flashcard, rating: number, now: Date, elapsedDays: number): ScheduleResult {
  if (rating === 1) {
    // Again → relearning, 1 minute
    return {
      stability: card.stability,
      difficulty: card.difficulty,
      state: 'relearning',
      due: addMinutes(now, 1).toISOString(),
      elapsed_days: elapsedDays,
      scheduled_days: 0,
    }
  }

  if (rating === 2) {
    // Hard → stay learning, 5 minutes
    return {
      stability: card.stability,
      difficulty: card.difficulty,
      state: 'learning',
      due: addMinutes(now, 10).toISOString(),
      elapsed_days: elapsedDays,
      scheduled_days: 0,
    }
  }

  // Good or Easy → graduate to review
  const newStability = card.stability * (1 + Math.exp(W[8]) * (rating - 2) * Math.pow(card.stability, -W[9]))
  const scheduledDays = Math.max(1, Math.round(newStability))

  return {
    stability: newStability,
    difficulty: nextDifficulty(card.difficulty, rating),
    state: 'review',
    due: addDays(now, scheduledDays).toISOString(),
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
  }
}

function scheduleReview(card: Flashcard, rating: number, now: Date, elapsedDays: number): ScheduleResult {
  const retrievability = Math.pow(1 + elapsedDays / (9 * card.stability), -1)

  if (rating === 1) {
    // Lapse → relearning
    const newStability = Math.max(
      0.1,
      W[10] * Math.pow(card.difficulty, -W[11]) *
      (Math.pow(card.stability + 1, W[12]) - 1) *
      Math.exp((1 - retrievability) * W[13])
    )

    return {
      stability: newStability,
      difficulty: nextDifficulty(card.difficulty, rating),
      state: 'relearning',
      due: addMinutes(now, 5).toISOString(),
      elapsed_days: elapsedDays,
      scheduled_days: 0,
    }
  }

  // Hard, Good, Easy → stay in review
  const newStability = card.stability * (
    1 +
    Math.exp(W[8]) *
    (11 - card.difficulty) *
    Math.pow(card.stability, -W[9]) *
    (Math.exp((1 - retrievability) * W[10]) - 1) *
    (rating === 2 ? W[15] : rating === 4 ? W[16] : 1)
  )

  const scheduledDays = Math.max(1, Math.round(newStability))

  return {
    stability: newStability,
    difficulty: nextDifficulty(card.difficulty, rating),
    state: 'review',
    due: addDays(now, scheduledDays).toISOString(),
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
  }
}

function nextDifficulty(currentDifficulty: number, rating: number): number {
  const newDiff = currentDifficulty - W[6] * (rating - 3)
  // Mean reversion
  return clamp(
    W[7] * W[4] + (1 - W[7]) * newDiff,
    1,
    10
  )
}

// ============================================================
// Helpers
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Retorna label amigável para o intervalo agendado.
 */
export function formatInterval(scheduledDays: number): string {
  if (scheduledDays === 0) return 'Agora'
  if (scheduledDays === 1) return '1 dia'
  if (scheduledDays < 30) return `${scheduledDays} dias`
  if (scheduledDays < 365) return `${Math.round(scheduledDays / 30)} meses`
  return `${(scheduledDays / 365).toFixed(1)} anos`
}

/**
 * Calcula o preview dos intervalos para cada rating de um card.
 */
export function previewSchedule(card: Flashcard): Record<Rating, { label: string; days: number }> {
  const ratings: Rating[] = ['again', 'hard', 'good', 'easy']
  const result = {} as Record<Rating, { label: string; days: number }>

  for (const rating of ratings) {
    const s = schedule(card, rating)
    result[rating] = {
      label: formatInterval(s.scheduled_days),
      days: s.scheduled_days,
    }
  }

  return result
}
