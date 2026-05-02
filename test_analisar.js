import { analisarPDFs } from './src/services/iaService.js';

async function test() {
  const result = await analisarPDFs([
    { nome: 'doc1.pdf', texto: 'Este é um teste sobre imunologia básica.' }
  ], 'Imunologia');
  console.log('RESULTADO FINAL:', result);
}
test();
