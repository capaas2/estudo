import { useState } from 'react'
import { useToast } from '../components/Toast'
import { analisarPDFs } from '../services/iaService'
import { extrairTextoPDF } from '../services/pdfService'
import { Upload, FileText, X, Sparkles, Download, Trophy, AlertTriangle, BookOpen, Star } from 'lucide-react'

function mdToHtml(text) {
  if (!text) return ''
  return text
    .replace(/\\n/g, '\n')
    .replace(/^### (.+)$/gm, '<h4 style="color:#3a7bc8;margin:18px 0 8px;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="color:#2d5f8a;margin:22px 0 10px;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="color:#1e3a5f;margin:26px 0 12px;">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li style="margin-bottom:4px;">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="padding-left:20px;margin:8px 0;">${m}</ul>`)
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

export default function Tutoria() {
  const toast = useToast()
  const [arquivos, setArquivos] = useState([])
  const [conteudos, setConteudos] = useState('')
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState('')

  function handleFiles(e) {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf').slice(0, 11)
    if (files.length + arquivos.length > 11) { toast('Máximo de 11 PDFs', 'error'); return }
    setArquivos(prev => [...prev, ...files])
  }

  function removerArquivo(idx) { setArquivos(prev => prev.filter((_, i) => i !== idx)) }

  async function analisar() {
    if (arquivos.length === 0) return toast('Envie pelo menos um PDF', 'error')
    if (!conteudos.trim()) return toast('Informe os conteúdos esperados', 'error')
    setLoading(true)
    setResultado(null)
    try {
      // Extrair texto de cada PDF
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
    } catch { toast('Erro na análise', 'error') }
    setLoading(false)
    setProgresso('')
  }

  function gerarPDFConsolidado() {
    if (!resultado) return
    const r = resultado
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Material Consolidado - StudyPro</title>
<style>
body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;color:#1a1a1a;line-height:1.7}
h1{color:#1e3a5f;border-bottom:3px solid #1e3a5f;padding-bottom:10px;font-size:28px}
h2{color:#2d5f8a;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:6px}
h3{color:#3a7bc8;margin-top:20px}
.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;margin:2px}
.badge-gold{background:#fef3c7;color:#92400e}.badge-blue{background:#dbeafe;color:#1e40af}
.badge-red{background:#fee2e2;color:#991b1b}.badge-green{background:#d1fae5;color:#065f46}
.section{background:#f8fafc;padding:20px;border-radius:8px;border-left:4px solid #3a7bc8;margin:16px 0}
.destaque{background:#fffbeb;padding:16px;border-radius:8px;border:1px solid #fbbf24;margin:16px 0}
.lacuna{background:#fef2f2;padding:16px;border-radius:8px;border:1px solid #ef4444;margin:16px 0}
ul{padding-left:20px}li{margin-bottom:6px}
.footer{text-align:center;color:#94a3b8;font-size:12px;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px}
@media print{body{margin:20px}h1{font-size:24px}}
</style></head><body>
<h1>📚 Material de Estudo Consolidado</h1>
<p><em>Gerado por StudyPro em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</em></p>

${r.documento_mais_completo ? `<div class="destaque"><strong>🏆 Documento mais completo:</strong> ${r.documento_mais_completo.nome}<br><em>${r.documento_mais_completo.justificativa}</em></div>` : ''}

${r.ranking_documentos?.length ? `<h2>📊 Ranking dos Documentos</h2><ol>${r.ranking_documentos.map(d => `<li><strong>${d.nome}</strong> <span class="badge badge-gold">Nota: ${d.nota}/10</span><br><em>${d.motivo}</em></li>`).join('')}</ol>` : ''}

<h2>✅ Conteúdos Identificados</h2>
<ul>${(r.conteudos_identificados || []).map(c => `<li>${c}</li>`).join('')}</ul>

${r.lacunas?.length ? `<div class="lacuna"><h3>⚠️ Lacunas — Conteúdos NÃO encontrados</h3><ul>${r.lacunas.map(c => `<li>${c}</li>`).join('')}</ul></div>` : ''}

${r.redundancias?.length ? `<h2>🔁 Redundâncias entre Documentos</h2><ul>${r.redundancias.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}

${r.conteudo_consolidado ? `<h1>📖 Conteúdo Consolidado</h1><div class="section">${mdToHtml(r.conteudo_consolidado)}</div>` : ''}

${r.conteudo_complementar ? `<h1>📝 Conteúdo Complementar (o que faltou)</h1><div class="lacuna">${mdToHtml(r.conteudo_complementar)}</div>` : ''}

${r.recomendacoes?.length ? `<h2>💡 Recomendações</h2><ul>${r.recomendacoes.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}

${r.questoes_consolidadas?.length ? `<h2>❓ Questões Práticas Extraídas</h2><div class="section">${r.questoes_consolidadas.map((q, i) => `<div style="margin-bottom: 20px;"><strong>Questão ${i + 1}:</strong> ${q.enunciado}<br>${q.alternativas?.length ? `<ul style="list-style-type: none; padding-left: 0;">${q.alternativas.map(alt => `<li>${alt}</li>`).join('')}</ul>` : ''}<em><strong>Gabarito / Comentário:</strong> ${q.gabarito}</em></div>`).join('<hr style="border:0;border-top:1px dashed #ccc;margin:16px 0;">')}</div>` : ''}

<div class="footer">Gerado automaticamente por StudyPro com IA</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onload = () => { win.document.title = 'Material Consolidado - StudyPro' }
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf').slice(0, 11 - arquivos.length)
    setArquivos(prev => [...prev, ...files])
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h2>Tutoria IA</h2><p className="subtitle">Análise inteligente de materiais de estudo</p></div>
        {resultado && (
          <button className="btn btn-primary" onClick={gerarPDFConsolidado}>
            <Download size={16} /> Abrir Material Consolidado
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>📄 Upload de PDFs</h3>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById('pdf-input').click()} style={{
              border: '2px dashed var(--border-color)', borderRadius: 12, padding: 40,
              textAlign: 'center', cursor: 'pointer', marginBottom: 16
            }}>
              <Upload size={32} color="var(--text-muted)" />
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Arraste PDFs aqui ou clique para selecionar</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Até 11 arquivos PDF — o conteúdo será lido pela IA</p>
            </div>
            <input id="pdf-input" type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={handleFiles} />
            {arquivos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {arquivos.map((f, i) => (
                  <div key={i} className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                    <div className="flex-row gap-8"><FileText size={16} color="var(--accent-cyan)" /><span style={{ fontSize: '0.85rem' }}>{f.name}</span></div>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removerArquivo(i)}><X size={12} /></button>
                  </div>
                ))}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{arquivos.length}/11 arquivos</p>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>📋 Conteúdos Esperados</h3>
            <textarea className="form-textarea" value={conteudos} onChange={e => setConteudos(e.target.value)} rows={10}
              placeholder={"Liste os conteúdos que você espera encontrar:\n- Imunologia básica\n- Hipersensibilidade tipos I-IV\n- Autoimunidade\n- Imunodeficiências"} />
            <button className="btn btn-primary btn-lg" onClick={analisar} disabled={loading} style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
              {loading ? <><div className="loading-spinner" style={{ width: 20, height: 20 }} /> {progresso}</> : <><Sparkles size={18} /> Analisar com IA</>}
            </button>
          </div>
        </div>

        {resultado && (
          <div className="slide-up">
            {/* Documento mais completo */}
            {resultado.documento_mais_completo && (
              <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--warning)', background: 'linear-gradient(135deg, var(--bg-secondary), rgba(251,191,36,0.05))' }}>
                <div className="flex-row gap-8" style={{ marginBottom: 8 }}><Trophy size={22} color="var(--warning)" /><h3 style={{ color: 'var(--warning)' }}>Documento Mais Completo</h3></div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{resultado.documento_mais_completo.nome}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 4 }}>{resultado.documento_mais_completo.justificativa}</p>
              </div>
            )}

            {/* Ranking */}
            {resultado.ranking_documentos?.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 className="card-title" style={{ marginBottom: 12 }}>📊 Ranking dos Documentos</h3>
                {resultado.ranking_documentos.map((d, i) => (
                  <div key={i} className="flex-between" style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 6 }}>
                    <div className="flex-row gap-8">
                      <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'var(--warning)' : 'var(--bg-primary)', color: i === 0 ? '#000' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>{i + 1}</span>
                      <div><p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.nome}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.motivo}</p></div>
                    </div>
                    <span className="badge badge-cyan" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.nota}/10</span>
                  </div>
                ))}
              </div>
            )}

            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ color: 'var(--accent-cyan)', marginBottom: 12 }}>Análise Geral</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{resultado.analise_geral}</p>
            </div>

            <div className="grid-2" style={{ marginBottom: 16 }}>
              {resultado.conteudos_identificados?.length > 0 && (
                <div className="card">
                  <h4 style={{ color: 'var(--success)', marginBottom: 12 }}>✅ Conteúdos Identificados</h4>
                  <ul style={{ paddingLeft: 16 }}>{resultado.conteudos_identificados.map((c, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{c}</li>)}</ul>
                </div>
              )}
              {resultado.lacunas?.length > 0 && (
                <div className="card" style={{ borderLeft: '3px solid var(--error)' }}>
                  <h4 style={{ color: 'var(--error)', marginBottom: 12 }}><AlertTriangle size={16} style={{ verticalAlign: 'middle' }} /> Lacunas (não encontrado)</h4>
                  <ul style={{ paddingLeft: 16 }}>{resultado.lacunas.map((c, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{c}</li>)}</ul>
                </div>
              )}
            </div>

            {/* Conteúdo Consolidado */}
            {resultado.conteudo_consolidado && (
              <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--accent-cyan)' }}>
                <h3 style={{ color: 'var(--accent-cyan)', marginBottom: 12 }}>📖 Conteúdo Consolidado</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>As melhores partes de todos os documentos, unificadas:</p>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 400, overflow: 'auto', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}
                  dangerouslySetInnerHTML={{ __html: mdToHtml(resultado.conteudo_consolidado) }} />
              </div>
            )}

            {/* Conteúdo Complementar */}
            {resultado.conteudo_complementar && (
              <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--error)' }}>
                <h3 style={{ color: 'var(--error)', marginBottom: 12 }}>📝 Conteúdo que Faltou</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Gerado pela IA para complementar as lacunas:</p>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 400, overflow: 'auto', padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8 }}
                  dangerouslySetInnerHTML={{ __html: mdToHtml(resultado.conteudo_complementar) }} />
              </div>
            )}

            {resultado.recomendacoes?.length > 0 && (
              <div className="card" style={{ borderLeft: '4px solid var(--accent-violet)', marginBottom: 16 }}>
                <h4 style={{ color: 'var(--accent-violet)', marginBottom: 12 }}>💡 Recomendações</h4>
                <ul style={{ paddingLeft: 16 }}>{resultado.recomendacoes.map((c, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{c}</li>)}</ul>
              </div>
            )}

            {resultado.questoes_consolidadas?.length > 0 && (
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <h3 style={{ color: 'var(--primary)', marginBottom: 12 }}>❓ Questões Práticas Extraídas</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Questões encontradas nos documentos sem repetições:</p>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 16 }}>
                  {resultado.questoes_consolidadas.map((q, i) => (
                    <div key={i} style={{ marginBottom: i !== resultado.questoes_consolidadas.length - 1 ? 20 : 0, paddingBottom: i !== resultado.questoes_consolidadas.length - 1 ? 20 : 0, borderBottom: i !== resultado.questoes_consolidadas.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 8 }}>Questão {i + 1}: <span style={{ fontWeight: 400 }}>{q.enunciado}</span></p>
                      {q.alternativas?.length > 0 && (
                        <ul style={{ listStyleType: 'none', paddingLeft: 0, marginBottom: 12 }}>
                          {q.alternativas.map((alt, j) => (
                            <li key={j} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4, padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 4 }}>{alt}</li>
                          ))}
                        </ul>
                      )}
                      <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, borderLeft: '3px solid var(--success)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--success)' }}>Gabarito / Comentário:</span>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{q.gabarito}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className="btn btn-primary btn-lg" onClick={gerarPDFConsolidado}>
                <Download size={18} /> Abrir Material Consolidado para Impressão
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
