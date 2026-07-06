/**
 * IDs do banco de dados e coleções do Appwrite.
 * Use IDs legíveis para facilitar debug no painel.
 *
 * Quando criar o projeto no Appwrite, use exatamente esses IDs
 * como Custom ID ao criar cada coleção.
 */

export const DATABASE_ID = 'studypro'

export const COLLECTIONS = {
  PERIODS: 'periods',
  MATERIAS: 'materias',
  SUBJECTS_WORKSPACE: 'subjects_workspace',
  SUBTEMAS: 'subtemas',
  QUESTOES: 'questoes',
  SIMULADOS: 'simulados',
  RESPOSTAS_SIMULADO: 'respostas_simulado',
  ANALISES_SIMULADO: 'analises_simulado',
  NOTES: 'notes',
  REVIEWS: 'reviews',
  FLASHCARDS: 'flashcards',
  FLASHCARD_REVIEWS: 'flashcard_reviews',
  GOALS: 'goals',
  PRODUCTIVITY_LOGS: 'productivity_logs',
  EMBEDDINGS: 'embeddings',
  JOBS: 'jobs',
} as const

export type CollectionId = typeof COLLECTIONS[keyof typeof COLLECTIONS]

/** ID do bucket de storage para arquivos do usuário */
export const STORAGE_BUCKET_ID = 'user-files'
