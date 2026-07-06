import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Materia, SubjectWorkspace } from '@/types/database'

// ============================================================
// Matérias
// ============================================================

export async function listMaterias(userId: string): Promise<Materia[]> {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.MATERIAS,
    [
      Query.equal('user_id', userId),
      Query.orderAsc('nome'),
    ]
  )
  return response.documents as unknown as Materia[]
}

export async function createMateria(userId: string, data: {
  nome: string
  cor: string
  descricao?: string
  icone?: string
}): Promise<Materia> {
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.MATERIAS,
    ID.unique(),
    {
      user_id: userId,
      nome: data.nome,
      cor: data.cor,
      descricao: data.descricao || '',
      icone: data.icone || '',
    },
    userPermissions(userId)
  )
  return doc as unknown as Materia
}

export async function updateMateria(materiaId: string, data: Partial<Omit<Materia, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Materia> {
  const doc = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.MATERIAS,
    materiaId,
    data
  )
  return doc as unknown as Materia
}

export async function deleteMateria(materiaId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.MATERIAS,
    materiaId
  )
}

// ============================================================
// Subject Workspace (Matéria vinculada a um período)
// ============================================================

export async function listSubjectWorkspaces(userId: string, periodId?: string): Promise<SubjectWorkspace[]> {
  const queries = [Query.equal('user_id', userId)]
  if (periodId) {
    queries.push(Query.equal('period_id', periodId))
  }
  queries.push(Query.orderAsc('$createdAt'))

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBJECTS_WORKSPACE,
    queries
  )
  return response.documents as unknown as SubjectWorkspace[]
}

export async function createSubjectWorkspace(userId: string, data: {
  materia_id: string
  period_id: string
  professor?: string
  carga_horaria?: number
  cor_override?: string
}): Promise<SubjectWorkspace> {
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SUBJECTS_WORKSPACE,
    ID.unique(),
    {
      user_id: userId,
      materia_id: data.materia_id,
      period_id: data.period_id,
      status: 'cursando',
      progresso: 0,
      professor: data.professor || '',
      carga_horaria: data.carga_horaria || 0,
      cor_override: data.cor_override || '',
    },
    userPermissions(userId)
  )
  return doc as unknown as SubjectWorkspace
}

export async function updateSubjectWorkspace(swId: string, data: Partial<Omit<SubjectWorkspace, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<SubjectWorkspace> {
  const doc = await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBJECTS_WORKSPACE,
    swId,
    data
  )
  return doc as unknown as SubjectWorkspace
}

export async function deleteSubjectWorkspace(swId: string): Promise<void> {
  await databases.deleteDocument(
    DATABASE_ID,
    COLLECTIONS.SUBJECTS_WORKSPACE,
    swId
  )
}
