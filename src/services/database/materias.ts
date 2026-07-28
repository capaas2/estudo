import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Materia, SubjectWorkspace } from '@/types/database'

const LOCAL_STORAGE_KEY_MATERIAS = 'studypro_v4_materias'
const LOCAL_STORAGE_KEY_WORKSPACES = 'studypro_v4_workspaces'

export function getLocalMaterias(userId: string): Materia[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_MATERIAS}_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function setLocalMaterias(userId: string, materias: Materia[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_MATERIAS}_${userId}`, JSON.stringify(materias))
  } catch {}
}

export function getLocalWorkspaces(userId: string, periodId?: string): SubjectWorkspace[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_WORKSPACES}_${userId}`)
    const all: SubjectWorkspace[] = raw ? JSON.parse(raw) : []
    return periodId ? all.filter(w => w.period_id === periodId) : all
  } catch { return [] }
}

export function setLocalWorkspaces(userId: string, workspaces: SubjectWorkspace[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_WORKSPACES}_${userId}`, JSON.stringify(workspaces))
  } catch {}
}

// ============================================================
// Matérias
// ============================================================

export async function listMaterias(userId: string): Promise<Materia[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.MATERIAS,
      [
        Query.equal('user_id', userId),
        Query.orderAsc('nome'),
      ]
    )
    const docs = response.documents as unknown as Materia[]
    if (docs.length > 0) {
      setLocalMaterias(userId, docs)
      return docs
    }
  } catch (err) {
    console.warn('Appwrite listMaterias fallback to local storage:', err)
  }
  return getLocalMaterias(userId)
}

export async function createMateria(userId: string, data: {
  nome: string
  cor: string
  descricao?: string
  icone?: string
}): Promise<Materia> {
  const localMat = {
    $id: `materia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: DATABASE_ID,
    $collectionId: COLLECTIONS.MATERIAS,
    $sequence: 0,
    user_id: userId,
    nome: data.nome,
    cor: data.cor,
    descricao: data.descricao || '',
    icone: data.icone || '',
  } as unknown as Materia

  try {
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
    const result = doc as unknown as Materia
    const current = getLocalMaterias(userId)
    setLocalMaterias(userId, [...current.filter(m => m.$id !== result.$id), result])
    return result
  } catch (err) {
    console.warn('Criando matéria localmente (fallback):', err)
    const current = getLocalMaterias(userId)
    setLocalMaterias(userId, [...current, localMat])
    return localMat
  }
}

export async function updateMateria(materiaId: string, data: Partial<Omit<Materia, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Materia> {
  try {
    const doc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.MATERIAS,
      materiaId,
      data
    )
    return doc as unknown as Materia
  } catch (err) {
    return { $id: materiaId } as Materia
  }
}

export async function deleteMateria(materiaId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.MATERIAS,
      materiaId
    )
  } catch (err) {}
}

// ============================================================
// Subject Workspace (Matéria vinculada a um período)
// ============================================================

export async function listSubjectWorkspaces(userId: string, periodId?: string): Promise<SubjectWorkspace[]> {
  try {
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
    const docs = response.documents as unknown as SubjectWorkspace[]
    if (docs.length > 0) {
      const currentAll = getLocalWorkspaces(userId)
      const otherPeriods = currentAll.filter(w => w.period_id !== periodId)
      setLocalWorkspaces(userId, [...otherPeriods, ...docs])
      return docs
    }
  } catch (err) {
    console.warn('Fallback listSubjectWorkspaces:', err)
  }
  return getLocalWorkspaces(userId, periodId)
}

export async function createSubjectWorkspace(userId: string, data: {
  materia_id: string
  period_id: string
  status?: SubjectWorkspace['status']
  professor?: string
  carga_horaria?: number
  cor_override?: string
  materia_nome?: string
}): Promise<SubjectWorkspace> {
  const localWs = {
    $id: `sw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    $permissions: [],
    $databaseId: DATABASE_ID,
    $collectionId: COLLECTIONS.SUBJECTS_WORKSPACE,
    $sequence: 0,
    user_id: userId,
    materia_id: data.materia_id,
    period_id: data.period_id,
    status: data.status || 'cursando',
    progresso: 0,
    professor: data.professor || '',
    carga_horaria: data.carga_horaria || 0,
    cor_override: data.cor_override || '',
    materia_nome: data.materia_nome || '',
  } as unknown as SubjectWorkspace

  try {
    const doc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SUBJECTS_WORKSPACE,
      ID.unique(),
      {
        user_id: userId,
        materia_id: data.materia_id,
        period_id: data.period_id,
        status: data.status || 'cursando',
        progresso: 0,
        professor: data.professor || '',
        carga_horaria: data.carga_horaria || 0,
        cor_override: data.cor_override || '',
      },
      userPermissions(userId)
    )
    const result = doc as unknown as SubjectWorkspace
    const merged = { ...result, materia_nome: data.materia_nome || result.materia_nome }
    const current = getLocalWorkspaces(userId)
    setLocalWorkspaces(userId, [...current.filter(w => w.$id !== result.$id), merged])
    return merged
  } catch (err) {
    console.warn('Criando subject workspace localmente (fallback):', err)
    const current = getLocalWorkspaces(userId)
    setLocalWorkspaces(userId, [...current, localWs])
    return localWs
  }
}

export async function updateSubjectWorkspace(swId: string, data: Partial<Omit<SubjectWorkspace, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<SubjectWorkspace> {
  try {
    const doc = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBJECTS_WORKSPACE,
      swId,
      data
    )
    const result = doc as unknown as SubjectWorkspace
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_KEY_WORKSPACES))
      for (const k of keys) {
        const list: SubjectWorkspace[] = JSON.parse(localStorage.getItem(k) || '[]')
        const updated = list.map(w => w.$id === swId ? { ...w, ...data } : w)
        localStorage.setItem(k, JSON.stringify(updated))
      }
    }
    return result
  } catch (err) {
    console.warn('Atualizando workspace localmente:', err)
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_KEY_WORKSPACES))
      for (const k of keys) {
        const list: SubjectWorkspace[] = JSON.parse(localStorage.getItem(k) || '[]')
        const updated = list.map(w => w.$id === swId ? { ...w, ...data } : w)
        localStorage.setItem(k, JSON.stringify(updated))
      }
    }
    return { $id: swId, ...data } as SubjectWorkspace
  }
}

export async function deleteSubjectWorkspace(swId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.SUBJECTS_WORKSPACE,
      swId
    )
  } catch (err) {}
}
