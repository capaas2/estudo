import { storage } from '@/lib/appwrite/config'
import { STORAGE_BUCKET_ID } from '@/lib/appwrite/collections'
import { ID } from 'appwrite'

export interface MateriaFileRecord {
  $id: string
  materiaId: string
  userId: string
  name: string
  sizeOriginal: number
  isPublic?: boolean
  $createdAt: string
}

const LOCAL_STORAGE_KEY_FILES = 'studypro_v4_materia_files'

export function getMateriaFilesRegistry(userId?: string): MateriaFileRecord[] {
  if (typeof window === 'undefined') return []
  try {
    if (userId) {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_FILES}_${userId}`)
      if (raw) return JSON.parse(raw)
    }
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(LOCAL_STORAGE_KEY_FILES))
    const list: MateriaFileRecord[] = []
    for (const key of allKeys) {
      const parsed: MateriaFileRecord[] = JSON.parse(localStorage.getItem(key) || '[]')
      list.push(...parsed)
    }
    return list
  } catch { return [] }
}

export function setMateriaFilesRegistry(userId: string, records: MateriaFileRecord[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_FILES}_${userId}`, JSON.stringify(records))
  } catch {}
}

/**
 * Upload de arquivo vinculado a uma matéria específica.
 */
export async function uploadFile(
  file: File,
  materiaId: string = 'geral',
  userId: string = 'default_user',
  isPublic: boolean = false
): Promise<string> {
  const result = await storage.createFile(
    STORAGE_BUCKET_ID,
    ID.unique(),
    file
  )

  const record: MateriaFileRecord = {
    $id: result.$id,
    materiaId,
    userId,
    name: file.name,
    sizeOriginal: file.size,
    isPublic,
    $createdAt: new Date().toISOString(),
  }

  const current = getMateriaFilesRegistry(userId)
  setMateriaFilesRegistry(userId, [...current.filter(f => f.$id !== result.$id), record])

  return result.$id
}

/**
 * Retorna a URL de preview/download de um arquivo.
 */
export function getFileUrl(fileId: string): string {
  return storage.getFileView(STORAGE_BUCKET_ID, fileId).toString()
}

/**
 * Retorna a URL de download de um arquivo.
 */
export function getFileDownloadUrl(fileId: string): string {
  return storage.getFileDownload(STORAGE_BUCKET_ID, fileId).toString()
}

/**
 * Remove um arquivo do storage e do registro da matéria.
 */
export async function deleteFile(fileId: string, userId?: string): Promise<void> {
  try {
    await storage.deleteFile(STORAGE_BUCKET_ID, fileId)
  } catch (err) {
    console.warn('Erro ao deletar arquivo no Appwrite Storage:', err)
  }
  if (userId) {
    const current = getMateriaFilesRegistry(userId)
    setMateriaFilesRegistry(userId, current.filter(f => f.$id !== fileId))
  }
}

/**
 * Lista os arquivos do bucket. Se materiaId for fornecido, filtra exclusivamente por aquela matéria!
 */
export async function listFiles(materiaId?: string, userId?: string) {
  let bucketFiles: any[] = []
  try {
    const res = await storage.listFiles(STORAGE_BUCKET_ID)
    bucketFiles = res.files || []
  } catch (err) {
    console.warn('Fallback listFiles storage list:', err)
  }

  const registry = getMateriaFilesRegistry(userId)
  const materiaRegistryMap = new Map(registry.map(r => [r.$id, r]))

  // Se materiaId não foi fornecido, retorna todos os arquivos
  if (!materiaId || materiaId === 'all') {
    const resultMap = new Map<string, any>()
    registry.forEach(reg => {
      resultMap.set(reg.$id, {
        $id: reg.$id,
        name: reg.name,
        sizeOriginal: reg.sizeOriginal,
        $createdAt: reg.$createdAt,
        materiaId: reg.materiaId,
        isPublic: reg.isPublic,
      })
    })
    bucketFiles.forEach(bf => {
      const reg = materiaRegistryMap.get(bf.$id)
      resultMap.set(bf.$id, {
        $id: bf.$id,
        name: bf.name,
        sizeOriginal: bf.sizeOriginal || 0,
        $createdAt: bf.$createdAt,
        materiaId: reg?.materiaId || 'geral',
        isPublic: reg?.isPublic || false,
      })
    })
    return { files: Array.from(resultMap.values()) }
  }

  // Se materiaId foi fornecido, filtra estritamente pela matéria
  const filtered = bucketFiles.filter(bf => {
    const reg = materiaRegistryMap.get(bf.$id)
    return reg ? reg.materiaId === materiaId : false
  })

  const filteredRegistry = registry.filter(r => r.materiaId === materiaId)
  const resultMap = new Map<string, any>()

  filteredRegistry.forEach(reg => {
    resultMap.set(reg.$id, {
      $id: reg.$id,
      name: reg.name,
      sizeOriginal: reg.sizeOriginal,
      $createdAt: reg.$createdAt,
      materiaId: reg.materiaId,
      isPublic: reg.isPublic,
    })
  })

  filtered.forEach(bf => {
    const reg = materiaRegistryMap.get(bf.$id)
    resultMap.set(bf.$id, {
      $id: bf.$id,
      name: bf.name,
      sizeOriginal: bf.sizeOriginal || 0,
      $createdAt: bf.$createdAt,
      materiaId: reg?.materiaId || materiaId,
      isPublic: reg?.isPublic || false,
    })
  })

  return { files: Array.from(resultMap.values()) }
}
