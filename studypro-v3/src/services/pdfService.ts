'use client'

import * as pdfjsLib from 'pdfjs-dist'

// Configurar worker via CDN
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'
}

export async function extrairTextoPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    }).promise

    let textoCompleto = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const texto = content.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
      textoCompleto += texto + '\n\n'
    }

    return textoCompleto.trim()
  } catch (err) {
    console.error('Erro ao extrair texto do PDF:', err)
    throw new Error('Não foi possível ler o PDF.')
  }
}
