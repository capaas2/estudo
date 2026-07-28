import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Period } from '@/types/database'

export async function listPeriods(userId: string): Promise<Period[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PERIODS,
    [
      Query.equal('user_id', userId),
      Query.orderAsc('numero'),
    ]
  )
  return response.documents as unknown as Period[]
}

export async function getPeriod(periodId: string): Promise<Period> {
  const doc = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.PERIODS,
    periodId
  )
  return doc as unknown as Period
}

export async function createPeriod(userId: string, data: {
  numero: number
  nome: string
  status?: Period['status']
  progresso?: number
  meta_horas_semana?: number
}): Promise<Period> {
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
  return doc as unknown as Period
}

export async function updatePeriod(periodId: string, data: Partial<Omit<Period, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Period> {
  const doc = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.PERIODS,
    periodId,
    data
  )
  return doc as unknown as Period
}

export async function deletePeriod(periodId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.PERIODS,
    periodId
  )
}
