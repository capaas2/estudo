#!/usr/bin/env node

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY

if (!ENDPOINT || !PROJECT || !API_KEY) {
  console.error('❌ Variáveis de ambiente faltando')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': API_KEY,
}

async function run() {
  console.log('📦 Configurando Storage Bucket "user-files"...')
  try {
    const res = await fetch(`${ENDPOINT}/storage/buckets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        bucketId: 'user-files',
        name: 'User Files',
        permissions: [
          'create("users")',
          'read("any")',
          'update("users")',
          'delete("users")'
        ],
        fileSecurity: true,
        enabled: true
      })
    })
    const text = await res.text()
    if (res.ok) {
      console.log('  ✅ Bucket "user-files" criado com sucesso!')
    } else if (text.includes('already exists')) {
      console.log('  ⏭️  Bucket "user-files" já existe')
    } else {
      console.error('  ❌ Falha ao criar bucket:', res.status, text)
    }
  } catch (e) {
    console.error('  ❌ Erro fatal:', e.message)
  }
}

run()
