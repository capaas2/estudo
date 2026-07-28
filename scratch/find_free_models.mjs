import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const match = envContent.match(/OPENROUTER_API_KEY=(.*)/)
const key = match ? match[1].trim() : ''

const res = await fetch('https://openrouter.ai/api/v1/models', {
  headers: { 'Authorization': `Bearer ${key}` },
})

const data = await res.json()
const freeModels = data.data.filter(m => m.id.endsWith(':free') || m.pricing?.prompt === '0')
console.log('Modelos Gratuitos Disponíveis no OpenRouter Agora:')
freeModels.forEach(m => console.log(`- ${m.id} (${m.name})`))
