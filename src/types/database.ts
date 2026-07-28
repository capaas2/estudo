// ============================================================
// StudyPro v4 — Schema de Tipos (Appwrite)
// ============================================================
// Cada interface mapeia para uma coleção no banco Appwrite.
// Campos $id, $createdAt, $updatedAt são gerenciados pelo Appwrite.
// ============================================================

import type { Models } from 'appwrite'

/** Tipo base com campos automáticos do Appwrite */
export type AppwriteDocument = Models.Document

// ------------------------------------------------------------
// Períodos e Matérias
// ------------------------------------------------------------

export interface Period extends AppwriteDocument {
  user_id: string
  numero: number
  nome: string
  status: 'nao_iniciado' | 'em_andamento' | 'concluido'
  progresso: number
  capa_url?: string
  meta_horas_semana?: number
}

export interface Materia extends AppwriteDocument {
  user_id: string
  nome: string
  descricao?: string
  cor: string
  icone?: string
}

export interface SubjectWorkspace extends AppwriteDocument {
  user_id: string
  materia_id: string
  period_id: string
  status: 'cursando' | 'concluido' | 'trancado'
  progresso: number
  professor?: string
  carga_horaria?: number
  cor_override?: string
  capa_url?: string
  materia_nome?: string
}

export interface Subtema extends AppwriteDocument {
  materia_id: string
  nome: string
}

// ------------------------------------------------------------
// Questões e Simulados
// ------------------------------------------------------------

export interface Questao extends AppwriteDocument {
  user_id: string
  tipo: 'objetiva' | 'discursiva'
  materia_id: string
  subtema_id?: string
  enunciado: string
  alternativas?: { letra: string; texto: string }[]
  gabarito?: string
  explicacao?: string
  subitens?: { letra: string; texto: string; gabarito?: string; criterios?: string }[]
  dificuldade: 'facil' | 'medio' | 'dificil'
  peso?: number
  tags?: string[]
  imagem_url?: string
  // Novos campos v4
  banca?: string
  estado?: string
  ano?: number
  instituicao?: string
  favorita?: boolean
  is_publica?: boolean
}

export interface Simulado extends AppwriteDocument {
  user_id: string
  titulo: string
  materia_id: string
  subtema_ids?: string[]
  tipo: 'manual' | 'automatico'
  modo: 'tutor' | 'cronometrado'
  status: 'criado' | 'em_andamento' | 'finalizado'
  questao_ids?: string[]
  cronometro_visivel?: boolean
  iniciado_em?: string
  finalizado_em?: string
  tempo_total?: number
  nota?: number
  nota_maxima?: number
}

export interface RespostaSimulado extends AppwriteDocument {
  user_id: string
  simulado_id: string
  questao_id: string
  ordem: number
  resposta_objetiva?: string
  respostas_discursivas?: string[]
  tempo_gasto?: number
  iniciado_em?: string
  finalizado_em?: string
  esta_correta?: boolean
  nota?: number
  nota_maxima?: number
  correcao_ia?: Record<string, unknown>
  feedback_ia?: string
  analise_tempo?: string
}

export interface AnaliseSimulado extends AppwriteDocument {
  user_id: string
  simulado_id: string
  pontos_fracos?: string[]
  recomendacoes?: string[]
  analise_tempo_desempenho?: string
  tendencia?: string
  detalhes?: Record<string, unknown>
}

// ------------------------------------------------------------
// Notas (com backlinks e tipo tutoria)
// ------------------------------------------------------------

export interface Note extends AppwriteDocument {
  user_id: string
  materia_id?: string
  period_id?: string
  titulo: string
  conteudo?: Record<string, unknown>
  parent_id?: string
  icone?: string
  is_favorita?: boolean
  tags?: string[]
  // Novos campos v4
  tipo: 'comum' | 'resumo-ia' | 'tutoria'
  backlinks?: string[]        // IDs de outras notas que referenciam esta
  data_tutoria?: string       // Data da sessão de tutoria (quando tipo === 'tutoria')
}

// ------------------------------------------------------------
// Revisões (repetição espaçada)
// ------------------------------------------------------------

export interface Review extends AppwriteDocument {
  user_id: string
  materia_id?: string
  questao_id?: string
  titulo: string
  tipo: 'manual' | 'automatica' | 'erro_simulado'
  status: 'pendente' | 'concluida' | 'adiada'
  data_revisao: string
  proxima_revisao?: string
  intervalo_dias: number
  nivel_confianca: number
  origem?: string
}

// ------------------------------------------------------------
// Flashcards (FSRS no lugar do SM-2)
// ------------------------------------------------------------

export interface Flashcard extends AppwriteDocument {
  user_id: string
  materia_id?: string
  deck: string
  frente: string
  verso: string
  tags?: string[]
  // Campos FSRS
  stability: number           // Estabilidade da memória
  difficulty: number          // Dificuldade do card (0-10)
  state: 'new' | 'learning' | 'review' | 'relearning'
  reps: number                // Número de revisões
  lapses: number              // Número de esquecimentos
  last_review?: string        // Data da última revisão
  due?: string                // Data de vencimento (próxima revisão)
}

export interface FlashcardReview extends AppwriteDocument {
  user_id: string
  flashcard_id: string
  rating: 'again' | 'hard' | 'good' | 'easy'
  // Snapshot do estado pós-revisão
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  state: 'new' | 'learning' | 'review' | 'relearning'
  reviewed_at: string
}

// ------------------------------------------------------------
// Metas e Produtividade
// ------------------------------------------------------------

export interface Goal extends AppwriteDocument {
  user_id: string
  period_id?: string
  titulo: string
  tipo: 'diaria' | 'semanal' | 'mensal' | 'semestral'
  meta_valor: number
  valor_atual: number
  materia_id?: string
  prazo?: string
  completa: boolean
}

export interface ProductivityLog extends AppwriteDocument {
  user_id: string
  data: string
  minutos_estudados: number
  questoes_resolvidas: number
  simulados_feitos: number
  revisoes_feitas: number
  flashcards_revisados: number
  streak_dias: number
}

// ------------------------------------------------------------
// Embeddings (para IA Copilot RAG)
// ------------------------------------------------------------

export interface Embedding extends AppwriteDocument {
  user_id: string
  source_type: 'note' | 'arquivo'
  source_id: string           // ID da nota ou arquivo
  materia_id?: string
  content_preview: string     // Primeiros ~200 chars do conteúdo
  vector: number[]            // Array de embeddings gerado pela API do Gemini
}

// ------------------------------------------------------------
// Jobs (rastreamento de Functions assíncronas)
// ------------------------------------------------------------

export interface Job extends AppwriteDocument {
  user_id: string
  tipo: 'extrair-questoes-pdf' | 'analisar-clube-revista' | 'gerar-flashcards-lote'
    | 'corrigir-discursiva' | 'analisar-desempenho-simulado' | 'recalcular-revisoes'
    | 'gerar-plano-semanal' | 'gerar-embedding' | 'responder-copiloto'
  status: 'pendente' | 'processando' | 'concluido' | 'erro'
  progresso: number           // 0-100
  resultado?: Record<string, unknown>
  erro?: string
  iniciado_em?: string
  finalizado_em?: string
}

// ------------------------------------------------------------
// Preferências do Usuário
// ------------------------------------------------------------

export interface UserPreferences {
  tema: 'dark' | 'light'
  sidebar_colapsada: boolean
  preferencias?: Record<string, unknown>
}
