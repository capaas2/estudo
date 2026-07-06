import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Questao } from '@/types/database'

export async function listQuestoes(userId: string, filters?: {
  materia_id?: string
  subtema_id?: string
  dificuldade?: Questao['dificuldade']
  tipo?: Questao['tipo']
  banca?: string
  favorita?: boolean
}): Promise<Questao[]> {
  const queries = [Query.equal('user_id', userId), Query.orderDesc('$createdAt')]

  if (filters?.materia_id) queries.push(Query.equal('materia_id', filters.materia_id))
  if (filters?.subtema_id) queries.push(Query.equal('subtema_id', filters.subtema_id))
  if (filters?.dificuldade) queries.push(Query.equal('dificuldade', filters.dificuldade))
  if (filters?.tipo) queries.push(Query.equal('tipo', filters.tipo))
  if (filters?.banca) queries.push(Query.equal('banca', filters.banca))
  if (filters?.favorita) queries.push(Query.equal('favorita', true))

  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUESTOES, queries)
  return response.documents as unknown as Questao[]
}

export async function getQuestao(questaoId: string): Promise<Questao> {
  return await databases.getDocument(DATABASE_ID, COLLECTIONS.QUESTOES, questaoId) as unknown as Questao
}

export async function createQuestao(userId: string, data: Omit<Questao, keyof import('appwrite').Models.Document | 'user_id'>): Promise<Questao> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.QUESTOES, ID.unique(),
    { user_id: userId, ...data },
    userPermissions(userId)
  ) as unknown as Questao
}

export async function updateQuestao(questaoId: string, data: Partial<Omit<Questao, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Questao> {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.QUESTOES, questaoId, data) as unknown as Questao
}

export async function deleteQuestao(questaoId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.QUESTOES, questaoId)
}
