import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const match = envContent.match(/OPENROUTER_API_KEY=(.*)/)
const key = match ? match[1].trim() : ''

const res = await fetch('https://openrouter.ai/api/v1/models', {
  headers: { 'Authorization': `Bearer ${key}` },
})

const data = await res.json()
const qwenModels = data.data.filter(m => m.id.includes('qwen'))

console.log('Modelos Qwen disponíveis no OpenRouter:')
qwenModels.forEach(m => {
  const prompt = (parseFloat(m.pricing?.prompt || '0') * 1000000).toFixed(3)
  const completion = (parseFloat(m.pricing?.completion || '0') * 1000000).toFixed(3)
  console.log(`ID: ${m.id} | Input: $${prompt}/1M | Output: $${completion}/1M | Nome: ${m.name}`)
})
