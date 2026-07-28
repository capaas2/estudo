import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const match = envContent.match(/OPENROUTER_API_KEY=(.*)/)
const key = match ? match[1].trim() : ''

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'HTTP-Referer': 'https://studypro.app',
    'X-Title': 'StudyPro v4',
  },
  body: JSON.stringify({
    model: 'openrouter/free',
    messages: [{ role: 'user', content: 'Responda em uma frase curta: O que é Anatomia Humana?' }],
  }),
})

console.log('Status HTTP:', res.status)
const text = await res.text()
console.log('Resposta OpenRouter:', text)
