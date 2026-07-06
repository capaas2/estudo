#!/usr/bin/env node

/**
 * StudyPro v4 — Script de Migração Supabase → Appwrite
 * 
 * Este script migra dados do Supabase para o Appwrite.
 * 
 * IMPORTANTE: O Appwrite tem uma ferramenta oficial de migração
 * (Settings → Migrations → Import Data → Supabase) que deve ser usada
 * PRIMEIRO para migrar auth, storage e dados básicos.
 * 
 * Este script é complementar — faz a migração dos dados que precisam
 * de transformação de schema (v3 → v4).
 * 
 * Uso:
 *   node scripts/migrate-supabase.mjs
 * 
 * Variáveis de ambiente necessárias:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================
// Config
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY

const DATABASE_ID = 'studypro'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env')
  process.exit(1)
}

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT || !APPWRITE_API_KEY) {
  console.error('❌ Defina APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY no .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================
// Appwrite REST helper (sem depender do SDK no script)
// ============================================================

async function appwriteCreate(collectionId, data, documentId) {
  const id = documentId || generateId()
  const url = `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
    body: JSON.stringify({
      documentId: id,
      data,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Appwrite error (${collectionId}): ${err}`)
  }

  return await response.json()
}

function generateId() {
  return 'unique()'
}

// ============================================================
// Migration functions
// ============================================================

async function migratePeriods(userId) {
  console.log('\n📚 Migrando períodos...')
  const { data: periods, error } = await supabase
    .from('periods')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('  ❌ Erro:', error.message); return [] }
  console.log(`  Encontrados: ${periods.length}`)

  const idMap = {}
  for (const p of periods) {
    try {
      const doc = await appwriteCreate('periods', {
        user_id: userId,
        numero: p.numero || p.period_number || 1,
        nome: p.nome || p.name || `${p.period_number || 1}º Período`,
        status: p.status === 'completed' ? 'concluido' : p.status === 'active' ? 'em_andamento' : 'nao_iniciado',
        data_inicio: p.start_date || p.created_at,
        data_fim: p.end_date || null,
        progresso: p.progress || 0,
        meta_horas_semana: p.weekly_goal_hours || 0,
      })
      idMap[p.id] = doc.$id
      console.log(`  ✅ ${p.nome || p.name || p.id}`)
    } catch (err) {
      console.error(`  ❌ ${p.id}: ${err.message}`)
    }
  }
  return idMap
}

async function migrateMaterias(userId) {
  console.log('\n📖 Migrando matérias...')
  const { data: materias, error } = await supabase
    .from('materias')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('  ❌ Erro:', error.message); return [] }
  console.log(`  Encontrados: ${materias.length}`)

  const idMap = {}
  for (const m of materias) {
    try {
      const doc = await appwriteCreate('materias', {
        user_id: userId,
        nome: m.nome || m.name,
        codigo: m.codigo || m.code || null,
        cor: m.cor || m.color || '#06b6d4',
        icone: m.icone || m.icon || 'BookOpen',
      })
      idMap[m.id] = doc.$id
      console.log(`  ✅ ${m.nome || m.name}`)
    } catch (err) {
      console.error(`  ❌ ${m.id}: ${err.message}`)
    }
  }
  return idMap
}

async function migrateNotes(userId, materiaIdMap) {
  console.log('\n📝 Migrando notas...')
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('  ❌ Erro:', error.message); return }
  console.log(`  Encontradas: ${notes.length}`)

  for (const n of notes) {
    try {
      await appwriteCreate('notes', {
        user_id: userId,
        titulo: n.titulo || n.title || 'Sem título',
        conteudo: n.conteudo || n.content || null,
        materia_id: materiaIdMap[n.materia_id] || materiaIdMap[n.subject_id] || null,
        tipo: n.tipo || 'comum',
        tags: n.tags || [],
        is_favorita: n.is_favorite || n.is_favorita || false,
      })
      console.log(`  ✅ ${n.titulo || n.title || n.id}`)
    } catch (err) {
      console.error(`  ❌ ${n.id}: ${err.message}`)
    }
  }
}

async function migrateFlashcards(userId, materiaIdMap) {
  console.log('\n🃏 Migrando flashcards...')
  const { data: cards, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('  ❌ Erro:', error.message); return }
  console.log(`  Encontrados: ${cards.length}`)

  for (const c of cards) {
    try {
      await appwriteCreate('flashcards', {
        user_id: userId,
        materia_id: materiaIdMap[c.materia_id] || materiaIdMap[c.subject_id] || null,
        deck: c.deck || 'Geral',
        frente: c.frente || c.front || c.question || '',
        verso: c.verso || c.back || c.answer || '',
        state: c.state || 'new',
        stability: c.stability || 0,
        difficulty: c.difficulty || 5,
        reps: c.reps || c.repetitions || 0,
        lapses: c.lapses || 0,
        due: c.due || c.next_review || new Date().toISOString(),
        last_review: c.last_review || null,
        tags: c.tags || [],
      })
      console.log(`  ✅ ${(c.frente || c.front || '').slice(0, 40)}...`)
    } catch (err) {
      console.error(`  ❌ ${c.id}: ${err.message}`)
    }
  }
}

async function migrateQuestoes(userId, materiaIdMap) {
  console.log('\n❓ Migrando questões...')
  const { data: questoes, error } = await supabase
    .from('questoes')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('  ❌ Erro:', error.message); return }
  console.log(`  Encontradas: ${questoes.length}`)

  for (const q of questoes) {
    try {
      await appwriteCreate('questoes', {
        user_id: userId,
        materia_id: materiaIdMap[q.materia_id] || materiaIdMap[q.subject_id] || null,
        tipo: q.tipo || q.type || 'objetiva',
        enunciado: q.enunciado || q.statement || '',
        alternativas: q.alternativas || q.alternatives || null,
        gabarito: q.gabarito || q.answer || null,
        explicacao: q.explicacao || q.explanation || null,
        dificuldade: q.dificuldade || q.difficulty || 'medio',
        banca: q.banca || null,
        ano: q.ano || q.year || null,
        favorita: q.favorita || q.is_favorite || false,
      })
      console.log(`  ✅ ${(q.enunciado || q.statement || '').slice(0, 40)}...`)
    } catch (err) {
      console.error(`  ❌ ${q.id}: ${err.message}`)
    }
  }
}

async function migrateReviews(userId, materiaIdMap) {
  console.log('\n🔄 Migrando revisões...')
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)

  if (error) { console.error('  ❌ Erro:', error.message); return }
  console.log(`  Encontradas: ${reviews.length}`)

  for (const r of reviews) {
    try {
      await appwriteCreate('reviews', {
        user_id: userId,
        titulo: r.titulo || r.title || 'Revisão',
        materia_id: materiaIdMap[r.materia_id] || materiaIdMap[r.subject_id] || null,
        status: r.status === 'completed' ? 'concluida' : r.status === 'postponed' ? 'adiada' : 'pendente',
        data_revisao: r.data_revisao || r.review_date || r.due_date || new Date().toISOString().split('T')[0],
        tipo: r.tipo || r.type || 'manual',
        origem: r.origem || r.source || null,
      })
      console.log(`  ✅ ${r.titulo || r.title || r.id}`)
    } catch (err) {
      console.error(`  ❌ ${r.id}: ${err.message}`)
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  StudyPro v4 — Migração Supabase → Appwrite')
  console.log('═══════════════════════════════════════════')
  console.log(`  Supabase: ${SUPABASE_URL}`)
  console.log(`  Appwrite: ${APPWRITE_ENDPOINT}`)
  console.log('')

  // Pega o user_id do primeiro usuário (assumindo single-user)
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError || !users?.users?.length) {
    console.error('❌ Não foi possível listar usuários do Supabase')
    process.exit(1)
  }

  const userId = users.users[0].id
  console.log(`👤 Usuário: ${users.users[0].email} (${userId})`)

  // Migrate in order (respecting dependencies)
  const periodIdMap = await migratePeriods(userId)
  const materiaIdMap = await migrateMaterias(userId)
  await migrateNotes(userId, materiaIdMap)
  await migrateFlashcards(userId, materiaIdMap)
  await migrateQuestoes(userId, materiaIdMap)
  await migrateReviews(userId, materiaIdMap)

  console.log('\n═══════════════════════════════════════════')
  console.log('  ✅ Migração concluída!')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('  Próximos passos:')
  console.log('  1. Verificar dados no painel do Appwrite')
  console.log('  2. Testar login e funcionalidades')
  console.log('  3. Repetir no projeto de produção')
  console.log('')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
