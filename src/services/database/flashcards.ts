import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Flashcard, FlashcardReview } from '@/types/database'

// ============================================================
// Flashcards
// ============================================================

export async function listFlashcards(userId: string, materiaId?: string): Promise<Flashcard[]> {
  const queries = [Query.equal('user_id', userId), Query.orderDesc('$updatedAt')]
  if (materiaId) queries.push(Query.equal('materia_id', materiaId))
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FLASHCARDS, queries)
  return response.documents as unknown as Flashcard[]
}

export async function listDueFlashcards(userId: string, materiaId?: string): Promise<Flashcard[]> {
  const now = new Date().toISOString()
  const queries = [
    Query.equal('user_id', userId),
    Query.lessThanEqual('due', now),
    Query.orderAsc('due'),
  ]
  if (materiaId) queries.push(Query.equal('materia_id', materiaId))
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.FLASHCARDS, queries)
  return response.documents as unknown as Flashcard[]
}

export async function createFlashcard(userId: string, data: {
  materia_id?: string
  deck: string
  frente: string
  verso: string
  tags?: string[]
}): Promise<Flashcard> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.FLASHCARDS, ID.unique(),
    {
      user_id: userId,
      stability: 0,
      difficulty: 5,
      state: 'new',
      reps: 0,
      lapses: 0,
      due: new Date().toISOString(),
      ...data,
    },
    userPermissions(userId)
  ) as unknown as Flashcard
}

export async function updateFlashcard(flashcardId: string, data: Partial<Omit<Flashcard, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Flashcard> {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.FLASHCARDS, flashcardId, data) as unknown as Flashcard
}

export async function deleteFlashcard(flashcardId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FLASHCARDS, flashcardId)
}

// ============================================================
// Flashcard Reviews (Histórico)
// ============================================================

export async function createFlashcardReview(userId: string, data: {
  flashcard_id: string
  rating: FlashcardReview['rating']
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  state: Flashcard['state']
}): Promise<FlashcardReview> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.FLASHCARD_REVIEWS, ID.unique(),
    { user_id: userId, reviewed_at: new Date().toISOString(), ...data },
    userPermissions(userId)
  ) as unknown as FlashcardReview
}
