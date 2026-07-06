#!/usr/bin/env node

/**
 * StudyPro v4 — Setup Appwrite Collections
 * 
 * Cria todas as coleções e atributos no banco de dados do Appwrite.
 * Rode este script uma vez para cada projeto (staging e prod).
 * 
 * Uso:
 *   node scripts/setup-appwrite.mjs [--reset]
 * 
 * Variáveis de ambiente necessárias:
 *   NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = 'studypro'
const RESET = process.argv.includes('--reset')

if (!ENDPOINT || !PROJECT || !API_KEY) {
  console.error('❌ Defina NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID e APPWRITE_API_KEY')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': API_KEY,
}

async function api(method, path, body) {
  const url = `${ENDPOINT}${path}`
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok && !text.includes('already exists')) {
    throw new Error(`${method} ${path}: ${res.status} ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function prepareDatabase() {
  console.log('🗄️  Verificando/Criando banco de dados...')
  try {
    await api('POST', '/databases', { databaseId: DATABASE_ID, name: 'StudyPro' })
    console.log('  ✅ Banco criado')
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('401') || e.message.includes('403')) {
      console.log('  ⏭️  Banco já existente ou permissão restrita no nível global (prosseguindo)')
    } else {
      throw e
    }
  }
}

async function awaitAttributesAvailable(collectionId) {
  console.log(`  ⏳ Aguardando atributos de "${collectionId}" ficarem disponíveis...`)
  while (true) {
    try {
      const res = await api('GET', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes`)
      const attrs = res.attributes || []
      const processing = attrs.filter(a => a.status === 'processing')
      if (processing.length === 0) {
        const failed = attrs.filter(a => a.status === 'failed')
        if (failed.length > 0) {
          console.warn(`  ⚠️  Alguns atributos falharam no processamento: ${failed.map(f => f.key).join(', ')}`)
        }
        break
      }
    } catch (e) {
      console.error(`  ❌ Erro ao checar atributos: ${e.message}`)
    }
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
}

async function createCollection(id, name, attrs = [], indexes = []) {
  if (RESET) {
    console.log(`🗑️  Deletando coleção antiga para reset: ${name} (${id})`)
    try {
      await api('DELETE', `/databases/${DATABASE_ID}/collections/${id}`)
      console.log('  ✅ Coleção antiga deletada')
      // Pequena pausa para garantir a deleção
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (e) {
      console.log(`  ⏭️  Coleção não existia ou erro ao deletar: ${e.message}`)
    }
  }

  console.log(`\n📦 Coleção: ${name} (${id})`)
  try {
    await api('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: id,
      name,
      documentSecurity: true,
      permissions: ['create("users")'],
    })
    console.log('  ✅ Criada')
  } catch (e) {
    if (e.message?.includes('already exists')) console.log('  ⏭️  Já existe')
    else { console.error(`  ❌ ${e.message}`); return }
  }

  // Create attributes
  for (const attr of attrs) {
    const { type, ...rest } = attr
    const endpoint = `/databases/${DATABASE_ID}/collections/${id}/attributes/${type}`
    try {
      await api('POST', endpoint, rest)
      console.log(`  + attr: ${rest.key} (${type})`)
    } catch (e) {
      if (e.message?.includes('already exists')) console.log(`  ⏭️  attr: ${rest.key}`)
      else console.error(`  ❌ attr ${rest.key}: ${e.message}`)
    }
  }

  // Aguardar atributos estarem disponíveis no banco (evita race condition de index)
  await awaitAttributesAvailable(id)

  // Create indexes
  for (const idx of indexes) {
    try {
      await api('POST', `/databases/${DATABASE_ID}/collections/${id}/indexes`, idx)
      console.log(`  + index: ${idx.key}`)
    } catch (e) {
      if (e.message?.includes('already exists')) console.log(`  ⏭️  index: ${idx.key}`)
      else console.error(`  ❌ index ${idx.key}: ${e.message}`)
    }
  }
}

// ============================================================
// Schema definitions
// ============================================================

const str = (key, size = 255, required = false) => ({ type: 'string', key, size, required, default: null })
const int = (key, required = false, def = null) => ({ type: 'integer', key, required, default: def, min: -999999, max: 999999 })
const float = (key, required = false, def = null) => ({ type: 'float', key, required, default: def, min: -999999, max: 999999 })
const bool = (key, required = false, def = false) => ({ type: 'boolean', key, required, default: def })
const enm = (key, elements, required = false) => ({ type: 'enum', key, elements, required, default: null })
const dt = (key, required = false) => ({ type: 'datetime', key, required, default: null })
const idx = (key, type, attributes) => ({ key, type, attributes, orders: attributes.map(() => 'ASC') })

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  StudyPro v4 — Setup Appwrite')
  console.log('═══════════════════════════════════════════')
  console.log(`  Endpoint: ${ENDPOINT}`)
  console.log(`  Project:  ${PROJECT}`)
  if (RESET) console.log('  ⚠️  MODO RESET ATIVADO: As coleções existentes serão recriadas do zero!')
  console.log('')

  await prepareDatabase()

  // Periods
  await createCollection('periods', 'Períodos', [
    str('user_id', 36, true),
    int('numero', true),
    str('nome', 100, true),
    enm('status', ['nao_iniciado', 'em_andamento', 'concluido']),
    dt('data_inicio'),
    dt('data_fim'),
    int('progresso', false, 0),
    int('meta_horas_semana', false, 0),
  ], [
    idx('idx_user', 'key', ['user_id']),
  ])

  // Materias
  await createCollection('materias', 'Matérias', [
    str('user_id', 36, true),
    str('nome', 200, true),
    str('codigo', 20),
    str('cor', 20),
    str('icone', 50),
  ], [
    idx('idx_user', 'key', ['user_id']),
  ])

  // Subject Workspaces
  await createCollection('subjects_workspace', 'Subject Workspaces', [
    str('user_id', 36, true),
    str('period_id', 36, true),
    str('materia_id', 36, true),
    str('professor', 200),
    int('carga_horaria'),
    enm('status', ['cursando', 'concluido', 'trancado']),
    int('progresso', false, 0),
    str('cor_override', 20),
  ], [
    idx('idx_user_period', 'key', ['user_id', 'period_id']),
  ])

  // Notes
  await createCollection('notes', 'Notas', [
    str('user_id', 36, true),
    str('titulo', 500, true),
    str('materia_id', 36),
    enm('tipo', ['comum', 'resumo-ia', 'tutoria']),
    bool('is_favorita'),
    str('backlinks', 5000),
  ], [
    idx('idx_user', 'key', ['user_id']),
    idx('idx_user_materia', 'key', ['user_id', 'materia_id']),
  ])

  // Reviews
  await createCollection('reviews', 'Revisões', [
    str('user_id', 36, true),
    str('titulo', 500, true),
    str('materia_id', 36),
    str('questao_id', 36),
    enm('status', ['pendente', 'concluida', 'adiada']),
    str('data_revisao', 20, true),
    str('proxima_revisao', 20),
    str('tipo', 50),
    str('origem', 200),
    int('intervalo_dias'),
    int('repeticao'),
  ], [
    idx('idx_user', 'key', ['user_id']),
    idx('idx_user_status', 'key', ['user_id', 'status']),
  ])

  // Flashcards
  await createCollection('flashcards', 'Flashcards', [
    str('user_id', 36, true),
    str('materia_id', 36),
    str('deck', 200),
    str('frente', 5000, true),
    str('verso', 5000, true),
    enm('state', ['new', 'learning', 'review', 'relearning']),
    float('stability'),
    float('difficulty'),
    int('reps'),
    int('lapses'),
    dt('due'),
    dt('last_review'),
  ], [
    idx('idx_user', 'key', ['user_id']),
    idx('idx_user_due', 'key', ['user_id', 'due']),
  ])

  // Flashcard Reviews
  await createCollection('flashcard_reviews', 'Flashcard Reviews', [
    str('user_id', 36, true),
    str('flashcard_id', 36, true),
    enm('rating', ['again', 'hard', 'good', 'easy']),
    float('stability'),
    float('difficulty'),
    float('elapsed_days'),
    float('scheduled_days'),
    str('state', 20),
    dt('reviewed_at'),
  ], [
    idx('idx_flashcard', 'key', ['flashcard_id']),
  ])

  // Questoes (Corrigido os tamanhos máximos de enunciado, gabarito e explicação para caber no limite físico)
  await createCollection('questoes', 'Questões', [
    str('user_id', 36, true),
    str('materia_id', 36),
    str('subtema_id', 36),
    enm('tipo', ['objetiva', 'discursiva']),
    str('enunciado', 4000, true),
    str('gabarito', 1000),
    str('explicacao', 4000),
    enm('dificuldade', ['facil', 'medio', 'dificil']),
    str('banca', 200),
    int('ano'),
    bool('favorita'),
  ], [
    idx('idx_user', 'key', ['user_id']),
    idx('idx_user_materia', 'key', ['user_id', 'materia_id']),
  ])

  // Simulados
  await createCollection('simulados', 'Simulados', [
    str('user_id', 36, true),
    str('titulo', 500, true),
    str('materia_id', 36),
    enm('tipo', ['manual', 'automatico']),
    enm('modo', ['cronometrado', 'tutor']),
    enm('status', ['criado', 'em_andamento', 'finalizado']),
    int('nota'),
    int('nota_maxima'),
    int('tempo_total'),
    bool('cronometro_visivel', false, true),
    dt('finalizado_em'),
  ], [
    idx('idx_user', 'key', ['user_id']),
  ])

  // Respostas Simulado
  await createCollection('respostas_simulado', 'Respostas Simulado', [
    str('user_id', 36, true),
    str('simulado_id', 36, true),
    str('questao_id', 36, true),
    int('ordem'),
    str('resposta_objetiva', 10),
    bool('esta_correta'),
    int('nota'),
    int('nota_maxima'),
    int('tempo_gasto'),
    dt('iniciado_em'),
  ], [
    idx('idx_simulado', 'key', ['user_id', 'simulado_id']),
  ])

  // Analises Simulado
  await createCollection('analises_simulado', 'Análises Simulado', [
    str('user_id', 36, true),
    str('simulado_id', 36, true),
    str('analise_tempo_desempenho', 5000),
    str('tendencia', 1000),
  ], [
    idx('idx_simulado', 'key', ['user_id', 'simulado_id']),
  ])

  // Goals
  await createCollection('goals', 'Metas', [
    str('user_id', 36, true),
    str('titulo', 500, true),
    str('tipo', 50),
    int('meta_valor'),
    int('valor_atual'),
    enm('status', ['ativa', 'concluida', 'cancelada']),
    dt('data_inicio'),
    dt('data_fim'),
  ], [
    idx('idx_user', 'key', ['user_id']),
  ])

  // Productivity Logs
  await createCollection('productivity_logs', 'Productivity Logs', [
    str('user_id', 36, true),
    str('data', 20, true),
    int('minutos_estudo'),
    int('questoes_feitas'),
    int('flashcards_revisados'),
    int('revisoes_concluidas'),
  ], [
    idx('idx_user_data', 'key', ['user_id', 'data']),
  ])

  // Embeddings
  await createCollection('embeddings', 'Embeddings', [
    str('user_id', 36, true),
    str('source_type', 50, true),
    str('source_id', 36, true),
    str('chunk_index', 10),
    str('text_preview', 500),
  ], [
    idx('idx_user_source', 'key', ['user_id', 'source_type', 'source_id']),
  ])

  // Jobs
  await createCollection('jobs', 'Jobs', [
    str('user_id', 36, true),
    str('tipo', 100, true),
    enm('status', ['pendente', 'processando', 'concluido', 'erro']),
    str('resultado', 5000),
    str('erro', 2000),
    int('progresso'),
  ], [
    idx('idx_user', 'key', ['user_id']),
  ])

  console.log('\n═══════════════════════════════════════════')
  console.log('  ✅ Setup concluído!')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('  Próximos passos:')
  console.log('  1. Criar bucket "user-files" no Storage')
  console.log('  2. Configurar permissões do bucket')
  console.log('  3. Rodar o app: npm run dev')
  console.log('')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
