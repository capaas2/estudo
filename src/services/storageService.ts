import { storage } from '@/lib/appwrite/config'
import { STORAGE_BUCKET_ID } from '@/lib/appwrite/collections'
import { ID } from 'appwrite'

/**
 * Upload de arquivo para o Appwrite Storage.
 */
export async function uploadFile(file: File): Promise<string> {
  const result = await storage.createFile(
    STORAGE_BUCKET_ID,
    ID.unique(),
    file
  )
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
 * Remove um arquivo do storage.
 */
export async function deleteFile(fileId: string): Promise<void> {
  await storage.deleteFile(STORAGE_BUCKET_ID, fileId)
}

/**
 * Lista os arquivos do bucket.
 */
export async function listFiles() {
  return await storage.listFiles(STORAGE_BUCKET_ID)
}
