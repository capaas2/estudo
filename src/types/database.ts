export interface Materia {
  id: string
  user_id?: string
  nome: string
  descricao?: string
  cor?: string
  icone?: string
  criado_em?: string
  atualizado_em?: string
}

export interface SubjectWorkspace {
  id: string
  user_id: string
  materia_id: string
  period_id: string
  status: 'cursando' | 'concluido' | 'trancado'
  progresso: number
  professor?: string
  carga_horaria?: number
  cor_override?: string
  capa_url?: string
  criado_em?: string
}

export interface Subtema {
  id: string
  materia_id: string
  nome: string
  criado_em?: string
}

export interface Questao {
  id: string
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
  criado_em?: string
  atualizado_em?: string
}

export interface Simulado {
  id: string
  titulo: string
  materia_id: string
  subtema_ids?: string[]
  tipo: 'manual' | 'automatico'
  status: 'criado' | 'em_andamento' | 'finalizado'
  questao_ids?: string[]
  cronometro_visivel?: boolean
  iniciado_em?: string
  finalizado_em?: string
  tempo_total?: number
  nota?: number
  nota_maxima?: number
  criado_em?: string
  user_id?: string
}

export interface RespostaSimulado {
  id: string
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
  criado_em?: string
  user_id?: string
}

export interface AnaliseSimulado {
  id: string
  simulado_id: string
  pontos_fracos?: string[]
  recomendacoes?: string[]
  analise_tempo_desempenho?: string
  tendencia?: string
  detalhes?: Record<string, unknown>
  criado_em?: string
  user_id?: string
}

export interface Period {
  id: string
  user_id: string
  numero: number
  nome: string
  status: 'nao_iniciado' | 'em_andamento' | 'concluido'
  progresso: number
  capa_url?: string
  meta_horas_semana?: number
  criado_em?: string
}

export interface Note {
  id: string
  user_id: string
  materia_id?: string
  period_id?: string
  titulo: string
  conteudo?: Record<string, unknown>
  parent_id?: string
  icone?: string
  is_favorita?: boolean
  tags?: string[]
  criado_em?: string
  atualizado_em?: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  titulo: string
  descricao?: string
  tipo: 'evento' | 'prova' | 'tutoria' | 'revisao' | 'tarefa' | 'aula'
  materia_id?: string
  data_inicio: string
  data_fim?: string
  cor?: string
  recorrente?: boolean
  google_event_id?: string
  completo?: boolean
  criado_em?: string
}

export interface StudySession {
  id: string
  user_id: string
  materia_id?: string
  tipo: 'livre' | 'pomodoro' | 'foco'
  duracao_minutos: number
  inicio: string
  fim?: string
  notas?: string
}

export interface Review {
  id: string
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
  criado_em?: string
}

export interface Flashcard {
  id: string
  user_id: string
  materia_id?: string
  deck: string
  frente: string
  verso: string
  tags?: string[]
  criado_em?: string
}

export interface FlashcardReview {
  id: string
  user_id: string
  flashcard_id: string
  qualidade: number
  intervalo_dias: number
  fator_facilidade: number
  proxima_revisao?: string
  revisado_em?: string
}

export interface Goal {
  id: string
  user_id: string
  period_id?: string
  titulo: string
  tipo: 'diaria' | 'semanal' | 'mensal' | 'semestral'
  meta_valor: number
  valor_atual: number
  materia_id?: string
  prazo?: string
  completa: boolean
  criado_em?: string
}

export interface TutoringGroup {
  id: string
  user_id: string
  nome: string
  periodo_id?: string
  ordem: number
  criado_em?: string
}

export interface TutoringSection {
  id: string
  grupo_id: string
  user_id: string
  tipo: 'tutoria' | 'conferencia'
  note_id?: string
  criado_em?: string
}

export interface UserPreferences {
  id: string
  user_id: string
  tema: string
  sidebar_colapsada: boolean
  google_token?: Record<string, unknown>
  preferencias?: Record<string, unknown>
  atualizado_em?: string
}

export interface ProductivityLog {
  id: string
  user_id: string
  data: string
  minutos_estudados: number
  questoes_resolvidas: number
  simulados_feitos: number
  revisoes_feitas: number
  flashcards_revisados: number
  streak_dias: number
  criado_em?: string
}
