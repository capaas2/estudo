import { databases } from '@/lib/appwrite/config'
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite/collections'
import { userPermissions } from '@/lib/appwrite/permissions'
import { ID, Query } from 'appwrite'
import type { Simulado, RespostaSimulado, AnaliseSimulado } from '@/types/database'

// ============================================================
// Simulados
// ============================================================

export async function listSimulados(userId: string, materiaId?: string): Promise<Simulado[]> {
  const queries = [Query.equal('user_id', userId), Query.orderDesc('$createdAt')]
  if (materiaId) queries.push(Query.equal('materia_id', materiaId))
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SIMULADOS, queries)
  return response.documents as unknown as Simulado[]
}

export async function getSimulado(simuladoId: string): Promise<Simulado> {
  return await databases.getDocument(DATABASE_ID, COLLECTIONS.SIMULADOS, simuladoId) as unknown as Simulado
}

export async function createSimulado(userId: string, data: {
  titulo: string
  materia_id: string
  tipo: Simulado['tipo']
  modo: Simulado['modo']
  questao_ids: string[]
  cronometro_visivel?: boolean
}): Promise<Simulado> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.SIMULADOS, ID.unique(),
    {
      user_id: userId,
      status: 'criado',
      nota: 0,
      nota_maxima: data.questao_ids.length,
      ...data,
    },
    userPermissions(userId)
  ) as unknown as Simulado
}

export async function updateSimulado(simuladoId: string, data: Partial<Omit<Simulado, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<Simulado> {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.SIMULADOS, simuladoId, data) as unknown as Simulado
}

export async function deleteSimulado(simuladoId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SIMULADOS, simuladoId)
}

// ============================================================
// Respostas
// ============================================================

export async function listRespostas(userId: string, simuladoId: string): Promise<RespostaSimulado[]> {
  const queries = [
    Query.equal('user_id', userId),
    Query.equal('simulado_id', simuladoId),
    Query.orderAsc('ordem'),
  ]
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.RESPOSTAS_SIMULADO, queries)
  return response.documents as unknown as RespostaSimulado[]
}

export async function createResposta(userId: string, data: {
  simulado_id: string
  questao_id: string
  ordem: number
  resposta_objetiva?: string
  respostas_discursivas?: string[]
  tempo_gasto?: number
  esta_correta?: boolean
  nota?: number
  nota_maxima?: number
}): Promise<RespostaSimulado> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.RESPOSTAS_SIMULADO, ID.unique(),
    { user_id: userId, iniciado_em: new Date().toISOString(), ...data },
    userPermissions(userId)
  ) as unknown as RespostaSimulado
}

export async function updateResposta(respostaId: string, data: Partial<Omit<RespostaSimulado, '$id' | '$createdAt' | '$updatedAt' | 'user_id'>>): Promise<RespostaSimulado> {
  return await databases.updateDocument(DATABASE_ID, COLLECTIONS.RESPOSTAS_SIMULADO, respostaId, data) as unknown as RespostaSimulado
}

// ============================================================
// Análises
// ============================================================

export async function getAnalise(simuladoId: string, userId: string): Promise<AnaliseSimulado | null> {
  const queries = [
    Query.equal('user_id', userId),
    Query.equal('simulado_id', simuladoId),
    Query.limit(1),
  ]
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ANALISES_SIMULADO, queries)
  return response.documents.length > 0 ? response.documents[0] as unknown as AnaliseSimulado : null
}

export async function createAnalise(userId: string, data: {
  simulado_id: string
  pontos_fracos?: string[]
  recomendacoes?: string[]
  analise_tempo_desempenho?: string
  tendencia?: string
}): Promise<AnaliseSimulado> {
  return await databases.createDocument(
    DATABASE_ID, COLLECTIONS.ANALISES_SIMULADO, ID.unique(),
    { user_id: userId, ...data },
    userPermissions(userId)
  ) as unknown as AnaliseSimulado
}
