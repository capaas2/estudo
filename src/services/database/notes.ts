import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Note } from '@/types/database'

export async function listNotes(userId: string, materiaId?: string): Promise<Note[]> {
  const queries = [Query.equal('user_id', userId), Query.orderDesc('$updatedAt')]
  if (materiaId) queries.push(Query.equal('materia_id', materiaId))
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTES, queries)
  return response.documents as unknown as Note[]
}

export async function getNote(noteId: string): Promise<Note> {
  return await databases.getDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId) as unknown as Note
}

export async function createNote(userId: string, data: {
  titulo: string
  materia_id?: string
  period_id?: string
  tipo?: Note['tipo']
  conteudo?: Record<string, unknown>
  tags?: string[]
}): Promise<Note> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.NOTES, ID.unique(),
    { user_id: userId, tipo: 'comum', ...data },
    userPermissions(userId)
  ) as unknown as Note
}

export async function updateNote(noteId: string, data: Partial<Omit<Note, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Note> {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId, data) as unknown as Note
}

export async function deleteNote(noteId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId)
}
