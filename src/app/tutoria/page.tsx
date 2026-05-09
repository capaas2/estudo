'use client'

import { useState } from 'react'
import { useToast } from '@/components/shared/Toast'
import { analisarPDFs } from '@/services/iaService'
import { extrairTextoPDF } from '@/services/pdfService'
import AppShell from '@/components/layout/AppShell'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Sparkles, Download, Trophy, AlertTriangle } from 'lucide-react'

function mdToHtml(text: string) {
  if (!text) return ''
  return text
    .replace(/\\n/g, '\n')
    .replace(/^### (.+)$/gm, '<h4 class="text-cyan-400 font-bold mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-cyan-500 font-bold mt-5 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-slate-200 font-extrabold mt-6 mb-3">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-400">$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li class="mb-1">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="list-disc pl-5 my-2 text-slate-300">${m}</ul>`)
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

export default function TutoriaPage() {
  const toast = useToast()
  const [arquivos, setArquivos] = useState<File[]>([])
  const [conteudos, setConteudos] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState('')

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf').slice(0, 11)
    if (files.length + arquivos.length > 11) { toast('Máximo de 11 PDFs', 'error'); return }
    setArquivos(prev => [...prev, ...files])
  }

  function removerArquivo(idx: number) {
    setArquivos(prev => prev.filter((_, i) => i !== idx))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf').slice(0, 11 - arquivos.length)
    setArquivos(prev => [...prev, ...files])
  }

  async function analisar() {
    if (arquivos.length === 0) return toast('Envie pelo menos um PDF', 'error')
    if (!conteudos.trim()) return toast('Informe os conteúdos esperados', 'error')
    setLoading(true)
    setResultado(null)
    try {
      const documentos = []
      for (let i = 0; i < arquivos.length; i++) {
        setProgresso(`Extraindo texto: ${arquivos[i].name} (${i + 1}/${arquivos.length})...`)
        const texto = await extrairTextoPDF(arquivos[i])
        documentos.push({ nome: arquivos[i].name, texto })
      }
      setProgresso('Analisando com IA... Isso pode levar até 1 minuto.')
      const result = await analisarPDFs(documentos, conteudos)
      setResultado(result)
      toast('Análise concluída!', 'success')
    } catch {
      toast('Erro na análise. Verifique o console.', 'error')
    }
    setLoading(false)
    setProgresso('')
  }

  function gerarPDFConsolidado() {
    if (!resultado) return
    const r = resultado
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Material Consolidado - StudyPro</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#1a1a1a;line-height:1.7}
h1{color:#0f172a;border-bottom:3px solid #0f172a;padding-bottom:10px;font-size:28px}
h2{color:#1e293b;margin-top:32px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
h3{color:#334155;margin-top:20px}
.badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;margin:2px;font-weight:bold}
.badge-gold{background:#fef3c7;color:#b45309}
.section{background:#f8fafc;padding:20px;border-radius:12px;border-left:4px solid #0ea5e9;margin:16px 0}
.destaque{background:#fffbeb;padding:20px;border-radius:12px;border:1px solid #fcd34d;margin:16px 0}
.lacuna{background:#fef2f2;padding:20px;border-radius:12px;border:1px solid #fca5a5;margin:16px 0}
ul{padding-left:20px}li{margin-bottom:6px}
.footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px}
</style></head><body>
<h1>📚 Material de Estudo Consolidado</h1>
<p><em>Gerado por StudyPro em ${new Date().toLocaleDateString('pt-BR')}</em></p>

${r.documento_mais_completo ? `<div class="destaque"><strong>🏆 Documento mais completo:</strong> ${r.documento_mais_completo.nome}<br><em>${r.documento_mais_completo.justificativa}</em></div>` : ''}

${r.ranking_documentos?.length ? `<h2>📊 Ranking dos Documentos</h2><ol>${r.ranking_documentos.map((d: any) => `<li><strong>${d.nome}</strong> <span class="badge badge-gold">Nota: ${d.nota}/10</span><br><em>${d.motivo}</em></li>`).join('')}</ol>` : ''}

<h2>✅ Conteúdos Identificados</h2>
<ul>${(r.conteudos_identificados || []).map((c: string) => `<li>${c}</li>`).join('')}</ul>

${r.lacunas?.length ? `<div class="lacuna"><h3>⚠️ Lacunas — Conteúdos NÃO encontrados</h3><ul>${r.lacunas.map((c: string) => `<li>${c}</li>`).join('')}</ul></div>` : ''}

${r.conteudo_consolidado ? `<h1>📖 Conteúdo Consolidado</h1><div class="section">${mdToHtml(r.conteudo_consolidado)}</div>` : ''}
${r.conteudo_complementar ? `<h1>📝 Conteúdo Complementar (Faltante)</h1><div class="lacuna">${mdToHtml(r.conteudo_complementar)}</div>` : ''}

${r.questoes_consolidadas?.length ? `<h2>❓ Questões Práticas Extraídas</h2><div class="section">${r.questoes_consolidadas.map((q: any, i: number) => `<div style="margin-bottom: 20px;"><strong>Questão ${i + 1}:</strong> ${q.enunciado}<br>${q.alternativas?.length ? `<ul>${q.alternativas.map((alt: string) => `<li>${alt}</li>`).join('')}</ul>` : ''}<em><strong>Gabarito:</strong> ${q.gabarito}</em></div>`).join('<hr style="border-top:1px dashed #cbd5e1;margin:16px 0;">')}</div>` : ''}

<div class="footer">Gerado automaticamente por StudyPro IA</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) win.onload = () => { win.document.title = 'Material Consolidado - StudyPro' }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tutoria IA</h2>
          <p className="text-slate-500 text-sm mt-0.5">Análise inteligente e consolidação de materiais</p>
        </div>
        {resultado && (
          <button onClick={gerarPDFConsolidado} className="btn-premium"><Download size={16} /> Exportar HTML/PDF</button>
        )}
      </div>

      <div className="page-body space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText size={18} className="text-cyan-400" /> Upload de PDFs</h3>
            <div 
              onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('pdf-input')?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-white/[0.02] transition-colors mb-4"
            >
              <Upload size={32} className="mx-auto text-slate-500 mb-3" />
              <p className="text-sm text-slate-300 font-medium">Arraste PDFs ou clique aqui</p>
              <p className="text-xs text-slate-500 mt-1">Até 11 arquivos (A IA fará a leitura de todos)</p>
            </div>
            <input id="pdf-input" type="file" accept=".pdf" multiple className="hidden" onChange={handleFiles} />
            
            {arquivos.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {arquivos.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={16} className="text-cyan-400 shrink-0" />
                      <span className="text-sm text-slate-300 truncate">{f.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removerArquivo(i); }} className="text-slate-500 hover:text-red-400 p-1"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles size={18} className="text-violet-400" /> Conteúdos Esperados</h3>
            <textarea 
              className="input-dark w-full h-[180px] resize-none" 
              value={conteudos} onChange={e => setConteudos(e.target.value)}
              placeholder="Liste os conteúdos que espera encontrar (ex: Imunologia, Hipersensibilidade, etc)..."
            />
            <button onClick={analisar} disabled={loading} className="btn-premium w-full justify-center mt-4 h-12 disabled:opacity-50">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">{progresso}</span>
                </div>
              ) : (
                <><Sparkles size={18} /> Iniciar Análise Profunda</>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {resultado && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Documento mais completo */}
              {resultado.documento_mais_completo && (
                <div className="glass-card p-6 border-l-4 border-l-amber-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={64} /></div>
                  <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-2"><Trophy size={18} /> Documento Mais Completo</h3>
                  <p className="text-lg font-extrabold text-slate-200">{resultado.documento_mais_completo.nome}</p>
                  <p className="text-sm text-slate-400 mt-1">{resultado.documento_mais_completo.justificativa}</p>
                </div>
              )}

              {/* Ranking */}
              {resultado.ranking_documentos?.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold mb-4">📊 Ranking de Qualidade</h3>
                  <div className="space-y-3">
                    {resultado.ranking_documentos.map((d: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-bold text-slate-200 truncate pr-4">{d.nome}</p>
                            <span className="badge-sm bg-cyan-500/10 text-cyan-400 shrink-0">Nota {d.nota}</span>
                          </div>
                          <p className="text-xs text-slate-500">{d.motivo}</p>
                          {d.faltou && <p className="text-xs text-red-400/80 mt-1"><strong>Faltou:</strong> {d.faltou}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Análise Geral */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">Análise Sintética</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{resultado.analise_geral}</p>
              </div>

              {/* Lacunas e Identificados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                  <h3 className="text-emerald-400 font-bold mb-3">✅ Conteúdos Encontrados</h3>
                  <ul className="space-y-1">
                    {resultado.conteudos_identificados?.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-slate-300">• {c}</li>
                    ))}
                  </ul>
                </div>
                {resultado.lacunas?.length > 0 && (
                  <div className="glass-card p-6 border-l-4 border-l-red-500">
                    <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Lacunas (Faltou)</h3>
                    <ul className="space-y-1">
                      {resultado.lacunas.map((c: string, i: number) => (
                        <li key={i} className="text-sm text-slate-300">• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Conteúdos */}
              {resultado.conteudo_consolidado && (
                <div className="glass-card p-6">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4">📖 Resumo Consolidado</h3>
                  <div 
                    className="text-sm text-slate-300 leading-relaxed max-h-[500px] overflow-y-auto pr-4 custom-scrollbar"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(resultado.conteudo_consolidado) }} 
                  />
                </div>
              )}
              {resultado.conteudo_complementar && (
                <div className="glass-card p-6 border-l-4 border-l-violet-500">
                  <h3 className="text-violet-400 font-bold mb-4">📝 Complemento da IA</h3>
                  <div 
                    className="text-sm text-slate-300 leading-relaxed max-h-[500px] overflow-y-auto pr-4 custom-scrollbar"
                    dangerouslySetInnerHTML={{ __html: mdToHtml(resultado.conteudo_complementar) }} 
                  />
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  )
}
