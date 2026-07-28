import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const match = envContent.match(/OPENROUTER_API_KEY=(.*)/)
const key = match ? match[1].trim() : ''

const res = await fetch('https://openrouter.ai/api/v1/models', {
  headers: { 'Authorization': `Bearer ${key}` },
})

const data = await res.json()
const models = data.data

// Filtrar modelos populares e baratos
const targets = [
  'deepseek/deepseek-chat',
  'deepseek/deepseek-r1',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.0-flash-lite-001',
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen-2.5-72b-instruct',
  'mistralai/mistral-small-24b-instruct-2501',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
]

console.log('=== TABELA DE PREÇOS EXATOS DO OPENROUTER (Por 1 Milhão de Tokens) ===\n')

models
  .filter(m => targets.includes(m.id) || m.id.startsWith('deepseek/') || m.id.startsWith('google/gemini-2.0'))
  .forEach(m => {
    const promptCost = (parseFloat(m.pricing?.prompt || '0') * 1000000).toFixed(4)
    const completionCost = (parseFloat(m.pricing?.completion || '0') * 1000000).toFixed(4)
    console.log(`Modelo: ${m.id}`)
    console.log(`- Nome: ${m.name}`)
    console.log(`- Preço Entrada (Pergunta): $${promptCost} / 1M tokens`)
    console.log(`- Preço Saída (Resposta): $${completionCost} / 1M tokens`)
    console.log(`- Contexto Máximo: ${m.context_length} tokens`)
    console.log('--------------------------------------------------')
  })
