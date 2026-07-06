import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Review } from '@/types/database'

export async function listReviews(userId: string, materiaId?: string): Promise<Review[]> {
  const queries = [Query.equal('user_id', userId), Query.orderAsc('data_revisao')]
  if (materiaId) queries.push(Query.equal('materia_id', materiaId))
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REVIEWS, queries)
  return response.documents as unknown as Review[]
}

export async function listPendingReviews(userId: string, materiaId?: string): Promise<Review[]> {
  const queries = [
    Query.equal('user_id', userId),
    Query.equal('status', 'pendente'),
    Query.lessThanEqual('data_revisao', new Date().toISOString().split('T')[0]),
    Query.orderAsc('data_revisao'),
  ]
  if (materiaId) queries.push(Query.equal('materia_id', materiaId))
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.REVIEWS, queries)
  return response.documents as unknown as Review[]
}

export async function createReview(userId: string, data: {
  titulo: string
  materia_id?: string
  questao_id?: string
  tipo?: Review['tipo']
  data_revisao: string
  intervalo_dias?: number
  nivel_confianca?: number
  origem?: string
}): Promise<Review> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.REVIEWS, ID.unique(),
    {
      user_id: userId,
      status: 'pendente',
      tipo: 'manual',
      intervalo_dias: 1,
      nivel_confianca: 0,
      ...data,
    },
    userPermissions(userId)
  ) as unknown as Review
}

export async function updateReview(reviewId: string, data: Partial<Omit<Review, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Review> {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.REVIEWS, reviewId, data) as unknown as Review
}

export async function deleteReview(reviewId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REVIEWS, reviewId)
}
