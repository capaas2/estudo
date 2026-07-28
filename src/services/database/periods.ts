import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Period } from '@/types/database'

const LOCAL_STORAGE_KEY_PERIODS = 'studypro_v4_periods'

export function getLocalPeriods(userId: string): Period[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PERIODS}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function setLocalPeriods(userId: string, periods: Period[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PERIODS}_${userId}`, JSON.stringify(periods))
  } catch {}
}

export async function listPeriods(userId: string): Promise<Period[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PERIODS,
      [
        Query.equal('user_id', userId),
        Query.orderAsc('numero'),
      ]
    )
    const docs = response.documents as unknown as Period[]
    if (docs.length > 0) {
      setLocalPeriods(userId, docs)
      return docs
    }
  } catch (err) {
    console.warn('Appwrite listPeriods fallback to local storage:', err)
  }
  return getLocalPeriods(userId)
}

export async function getPeriod(periodId: string): Promise<Period> {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PERIODS,
      periodId
    )
    return doc as unknown as Period
  } catch (err) {
    console.warn('Fallback getPeriod local storage:', err)
    if (typeof window !== 'undefined') {
      const allKey = Object.keys(localStorage).find(k => k.startsWith(LOCAL_STORAGE_KEY_PERIODS))
      if (allKey) {
        const list: Period[] = JSON.parse(localStorage.getItem(allKey) || '[]')
        const found = list.find(p => p.$id === periodId || String(p.numero) === periodId)
        if (found) return found
      }
    }
    throw err
  }
}

export async function createPeriod(userId: string, data: {
  numero: number
  nome: string
  status?: Period['status']
  progresso?: number
  meta_horas_semana?: number
}): Promise<Period> {
  const periodObj = {
    $id: `period_${data.numero}_${Date.now()}`,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: DATABASE_ID,
    $collectionId: COLLECTIONS.PERIODS,
    $sequence: 0,
    user_id: userId,
    numero: data.numero,
    nome: data.nome,
    status: data.status || 'nao_iniciado',
    progresso: data.progresso ?? 0,
    meta_horas_semana: data.meta_horas_semana || 0,
  } as unknown as Period

  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PERIODS,
      ID.unique(),
      {
        user_id: userId,
        numero: data.numero,
        nome: data.nome,
        status: data.status || 'nao_iniciado',
        progresso: data.progresso ?? 0,
        meta_horas_semana: data.meta_horas_semana || 0,
      },
      userPermissions(userId)
    )
    const result = doc as unknown as Period
    const currentLocal = getLocalPeriods(userId)
    setLocalPeriods(userId, [...currentLocal.filter(p => p.$id !== result.$id && p.numero !== data.numero), result])
    return result
  } catch (err) {
    console.warn('Criando período localmente (fallback):', err)
    const currentLocal = getLocalPeriods(userId)
    setLocalPeriods(userId, [...currentLocal.filter(p => p.numero !== data.numero), periodObj])
    return periodObj
  }
}

export async function updatePeriod(periodId: string, data: Partial<Omit<Period, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Period> {
  try {
    const doc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.PERIODS,
      periodId,
      data
    )
    const result = doc as unknown as Period
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_KEY_PERIODS))
      for (const k of keys) {
        const list: Period[] = JSON.parse(localStorage.getItem(k) || '[]')
        const updated = list.map(p => (p.$id === periodId || String(p.numero) === periodId) ? { ...p, ...data } : p)
        localStorage.setItem(k, JSON.stringify(updated))
      }
    }
    return result
  } catch (err) {
    console.warn('Atualizando período localmente:', err)
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_KEY_PERIODS))
      for (const k of keys) {
        const list: Period[] = JSON.parse(localStorage.getItem(k) || '[]')
        const updated = list.map(p => (p.$id === periodId || String(p.numero) === periodId) ? { ...p, ...data } : p)
        localStorage.setItem(k, JSON.stringify(updated))
      }
    }
    return { $id: periodId, ...data } as Period
  }
}

export async function deletePeriod(periodId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.PERIODS,
      periodId
    )
  } catch (err) {
    console.warn('Deletando período localmente:', err)
  }
  if (typeof window !== 'undefined') {
    const allKey = Object.keys(localStorage).find(k => k.startsWith(LOCAL_STORAGE_KEY_PERIODS))
    if (allKey) {
      const list: Period[] = JSON.parse(localStorage.getItem(allKey) || '[]')
      localStorage.setItem(allKey, JSON.stringify(list.filter(p => p.$id !== periodId)))
    }
  }
}
