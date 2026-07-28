import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Questao } from '@/types/database'

const LOCAL_STORAGE_KEY_QUESTOES = 'studypro_v4_questoes'

export function getLocalQuestoes(userId: string): Questao[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_QUESTOES}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function setLocalQuestoes(userId: string, questoes: Questao[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_QUESTOES}_${userId}`, JSON.stringify(questoes))
  } catch {}
}

export async function listQuestoes(userId: string, filters?: {
  materia_id?: string
  subtema_id?: string
  dificuldade?: Questao['dificuldade']
  tipo?: Questao['tipo']
  banca?: string
  favorita?: boolean
}): Promise<Questao[]> {
  try {
    const userQueries = [Query.equal('user_id', userId), Query.orderDesc('$createdAt')]
    const publicQueries = [Query.equal('is_publica', true), Query.orderDesc('$createdAt')]

    if (filters?.materia_id) {
      userQueries.push(Query.equal('materia_id', filters.materia_id))
      publicQueries.push(Query.equal('materia_id', filters.materia_id))
    }

    const [userRes, publicRes] = await Promise.allSettled([
      databases.listDocuments(DATABASE_ID, COLLECTIONS.QUESTOES, userQueries),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.QUESTOES, publicQueries),
    ])

    const docsMap = new Map<string, Questao>()

    if (userRes.status === 'fulfilled') {
      (userRes.value.documents as unknown as Questao[]).forEach(d => docsMap.set(d.$id, d))
    }
    if (publicRes.status === 'fulfilled') {
      (publicRes.value.documents as unknown as Questao[]).forEach(d => docsMap.set(d.$id, d))
    }

    const merged = Array.from(docsMap.values())
    if (merged.length > 0) {
      setLocalQuestoes(userId, merged)
      return merged
    }
  } catch (err) {
    console.warn('Fallback listQuestoes local storage:', err)
  }

  return getLocalQuestoes(userId)
}

export async function getQuestao(questaoId: string): Promise<Questao> {
  try {
    return await databases.getDocument(DATABASE_ID, COLLECTIONS.QUESTOES, questaoId) as unknown as Questao
  } catch (err) {
    if (typeof window !== 'undefined') {
      const allKey = Object.keys(localStorage).find(k => k.startsWith(LOCAL_STORAGE_KEY_QUESTOES))
      if (allKey) {
        const list: Questao[] = JSON.parse(localStorage.getItem(allKey) || '[]')
        const found = list.find(q => q.$id === questaoId)
        if (found) return found
      }
    }
    throw err
  }
}

export async function createQuestao(userId: string, data: Omit<Questao, keyof import('appwrite').Models.Document | 'user_id'>): Promise<Questao> {
  const localDoc: Questao = {
    $id: `questao_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: DATABASE_ID,
    $collectionId: COLLECTIONS.QUESTOES,
    $sequence: 0,
    user_id: userId,
    is_publica: data.is_publica ?? false,
    ...data,
  } as unknown as Questao

  try {
    const doc = await databases.createDocument(
      DATABASE_ID, COLLECTIONS.QUESTOES, ID.unique(),
      { user_id: userId, ...data },
      userPermissions(userId)
    )
    const result = doc as unknown as Questao
    const current = getLocalQuestoes(userId)
    setLocalQuestoes(userId, [...current.filter(q => q.$id !== result.$id), result])
    return result
  } catch (err) {
    console.warn('Criando questão localmente (fallback):', err)
    const current = getLocalQuestoes(userId)
    setLocalQuestoes(userId, [...current, localDoc])
    return localDoc
  }
}

export async function updateQuestao(questaoId: string, data: Partial<Omit<Questao, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Questao> {
  try {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.QUESTOES, questaoId, data) as unknown as Questao
  } catch (err) {
    return { $id: questaoId, ...data } as Questao
  }
}

export async function deleteQuestao(questaoId: string): Promise<void> {
  try {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.QUESTOES, questaoId)
  } catch (err) {}
}
