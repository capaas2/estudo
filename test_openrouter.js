const OPENROUTER_API_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function test() {
  const body = {
    model: 'nvidia/nemotron-3-super-120b-a12b-20230311:free',
    messages: [
      { role: 'system', content: 'Responda apenas com o JSON { "teste": "ok" }' },
      { role: 'user', content: 'Oi' }
    ],
    temperature: 0.3,
    max_tokens: 256000,
    response_format: { type: 'json_object' }
  };

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });
  
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', text);
}
test();
