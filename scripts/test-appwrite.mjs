const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY

console.log('Testing Appwrite Connection (no dotenv)...')
console.log('Endpoint:', ENDPOINT)
console.log('Project ID:', PROJECT)
console.log('API Key length:', API_KEY ? API_KEY.length : 0)

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': API_KEY,
}

async function run() {
  try {
    const res = await fetch(`${ENDPOINT}/databases`, { headers })
    const text = await res.text()
    console.log('Status code:', res.status)
    console.log('Response body:', text)
  } catch (e) {
    console.error('Error:', e)
  }
}

run()
