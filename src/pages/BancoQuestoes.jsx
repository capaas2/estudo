import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Plus, Edit3, Trash2, Search, X, ChevronDown, Filter, Lightbulb, Database, Upload, FileText, Sparkles, Brain } from 'lucide-react'
import { sugerirMelhoriaQuestao, extrairQuestoesDePDF, gerarGabaritoIA } from '../services/iaService'
import { extrairTextoPDF } from '../services/pdfService'

export default function BancoQuestoes() {
  const toast = useToast()
  const [questoes, setQuestoes] = useState([])
  const [materias, setMaterias] = useState([])
  const [subtemas, setSubtemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filtros, setFiltros] = useState({ materia: '', subtema: '', tipo: '', dificuldade: '', busca: '' })
  const [sugestaoIA, setSugestaoIA] = useState({ loading: false, texto: '', questaoId: null })
  const [importando, setImportando] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [gerandoGab, setGerandoGab] = useState(false)

  // Form state
  const [form, setForm] = useState({
    tipo: 'objetiva', materia_id: '', subtema_id: '', enunciado: '', dificuldade: 'medio', peso: 1,
    tags: [], alternativas: [
      { letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }
    ],
    gabarito: '', explicacao: '',
    subitens: [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: q }, { data: m }, { data: s }] = await Promise.all([
      supabase.from('questoes').select('*').order('criado_em', { ascending: false }),
      supabase.from('materias').select('*').order('nome'),
      supabase.from('subtemas').select('*').order('nome')
    ])
    setQuestoes(q || [])
    setMaterias(m || [])
    setSubtemas(s || [])
    setLoading(false)
  }

  const questoesFiltradas = questoes.filter(q => {
    if (filtros.materia && q.materia_id !== filtros.materia) return false
    if (filtros.subtema && q.subtema_id !== filtros.subtema) return false
    if (filtros.tipo && q.tipo !== filtros.tipo) return false
    if (filtros.dificuldade && q.dificuldade !== filtros.dificuldade) return false
    if (filtros.busca && !q.enunciado.toLowerCase().includes(filtros.busca.toLowerCase())) return false
    return true
  })

  function abrirNova() {
    setForm({
      tipo: 'objetiva', materia_id: materias[0]?.id || '', subtema_id: '', enunciado: '', dificuldade: 'medio', peso: 1,
      tags: [], alternativas: [
        { letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }
      ],
      gabarito: '', explicacao: '',
      subitens: [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
    })
    setModal('nova')
  }

  function abrirEditar(q) {
    setForm({
      id: q.id, tipo: q.tipo, materia_id: q.materia_id, subtema_id: q.subtema_id || '',
      enunciado: q.enunciado, dificuldade: q.dificuldade, peso: q.peso || 1,
      tags: q.tags || [],
      alternativas: q.alternativas || [{ letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }],
      gabarito: q.gabarito || '', explicacao: q.explicacao || '',
      subitens: q.subitens || [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
    })
    setModal('editar')
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.enunciado.trim() || !form.materia_id) return toast('Preencha enunciado e matéria', 'error')

    const dados = {
      tipo: form.tipo, materia_id: form.materia_id, subtema_id: form.subtema_id || null,
      enunciado: form.enunciado, dificuldade: form.dificuldade, peso: form.peso, tags: form.tags,
      alternativas: form.tipo === 'objetiva' ? form.alternativas : [],
      gabarito: form.tipo === 'objetiva' ? form.gabarito : '',
      explicacao: form.explicacao,
      subitens: form.tipo === 'discursiva' ? form.subitens : []
    }

    if (form.id) {
      await supabase.from('questoes').update(dados).eq('id', form.id)
      toast('Questão atualizada!', 'success')
    } else {
      await supabase.from('questoes').insert(dados)
      toast('Questão criada!', 'success')
    }
    setModal(null)
    carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir esta questão?')) return
    await supabase.from('questoes').delete().eq('id', id)
    toast('Questão excluída', 'info')
    carregar()
  }

  function adicionarSubitem() {
    const letra = String.fromCharCode(97 + form.subitens.length)
    setForm({ ...form, subitens: [...form.subitens, { letra, texto: '', gabarito: '', criterios: '' }] })
  }

  function removerSubitem(idx) {
    const novos = form.subitens.filter((_, i) => i !== idx).map((s, i) => ({ ...s, letra: String.fromCharCode(97 + i) }))
    setForm({ ...form, subitens: novos })
  }

  function toggleTag(tag) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  async function pedirSugestaoIA(q) {
    setSugestaoIA({ loading: true, texto: '', questaoId: q.id })
    try {
      const texto = await sugerirMelhoriaQuestao(q)
      setSugestaoIA({ loading: false, texto, questaoId: q.id })
    } catch {
      setSugestaoIA({ loading: false, texto: 'Erro ao obter sugestão.', questaoId: q.id })
    }
  }

  async function importarPDF(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setImportResult(null)
    try {
      toast('Extraindo texto do PDF...', 'info')
      const texto = await extrairTextoPDF(file)
      if (!texto.trim()) { toast('PDF sem texto legível', 'error'); setImportando(false); return }
      toast('Analisando questões com IA... Aguarde.', 'info')
      const result = await extrairQuestoesDePDF(texto)
      setImportResult(result)
      setModalImport(true)
    } catch { toast('Erro ao processar PDF', 'error') }
    setImportando(false)
  }

  async function salvarQuestoesImportadas(materiaId) {
    if (!materiaId || !importResult?.questoes?.length) return
    let count = 0
    for (const q of importResult.questoes) {
      const dados = {
        tipo: q.tipo, materia_id: materiaId, enunciado: q.enunciado,
        dificuldade: q.dificuldade || 'medio', peso: 1, tags: q.tags || [],
        alternativas: q.alternativas || [], gabarito: q.gabarito || '',
        explicacao: q.explicacao || '', subitens: q.subitens || []
      }
      const { error } = await supabase.from('questoes').insert(dados)
      if (!error) count++
    }
    toast(`${count} questões importadas!`, 'success')
    setModalImport(false)
    setImportResult(null)
    carregar()
  }

  async function gerarGabarito() {
    if (!form.enunciado.trim()) return toast('Preencha o enunciado primeiro', 'error')
    setGerandoGab(true)
    try {
      const result = await gerarGabaritoIA(form)
      if (form.tipo === 'objetiva') {
        setForm(f => ({ ...f, gabarito: result.gabarito || f.gabarito, explicacao: result.explicacao || f.explicacao }))
      } else {
        const novos = form.subitens.map((s, i) => {
          const r = result.subitens?.find(x => x.letra === s.letra) || result.subitens?.[i]
          return r ? { ...s, gabarito: r.gabarito || s.gabarito, criterios: r.criterios || s.criterios } : s
        })
        setForm(f => ({ ...f, subitens: novos, explicacao: result.explicacao || f.explicacao }))
      }
      toast('Gabarito gerado pela IA!', 'success')
    } catch { toast('Erro ao gerar gabarito', 'error') }
    setGerandoGab(false)
  }

  const nomeMateria = (id) => materias.find(m => m.id === id)?.nome || '—'
  const nomeSubtema = (id) => subtemas.find(s => s.id === id)?.nome || ''
  const subtemasMateria = subtemas.filter(s => s.materia_id === (form.materia_id || filtros.materia))

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Banco de Questões</h2>
          <p className="subtitle">{questoes.length} questões cadastradas</p>
        </div>
        <div className="flex-row gap-8">
          <label className="btn btn-secondary" style={{ cursor: importando ? 'wait' : 'pointer' }}>
            <Upload size={16} /> {importando ? 'Processando...' : 'Importar PDF'}
            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={importarPDF} disabled={importando} />
          </label>
          <button className="btn btn-primary" onClick={abrirNova}><Plus size={18} /> Nova Questão</button>
        </div>
      </div>

      <div className="page-body">
        {/* Filtros */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex-row flex-wrap gap-16">
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="flex-row" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                <input className="form-input" placeholder="Buscar no enunciado..." value={filtros.busca} onChange={e => setFiltros({...filtros, busca: e.target.value})} style={{ paddingLeft: 36 }} />
              </div>
            </div>
            <select className="form-select" value={filtros.materia} onChange={e => setFiltros({...filtros, materia: e.target.value, subtema: ''})} style={{ width: 180 }}>
              <option value="">Todas matérias</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <select className="form-select" value={filtros.tipo} onChange={e => setFiltros({...filtros, tipo: e.target.value})} style={{ width: 140 }}>
              <option value="">Todos tipos</option>
              <option value="objetiva">Objetiva</option>
              <option value="discursiva">Discursiva</option>
            </select>
            <select className="form-select" value={filtros.dificuldade} onChange={e => setFiltros({...filtros, dificuldade: e.target.value})} style={{ width: 140 }}>
              <option value="">Dificuldade</option>
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>
        </div>

        {questoesFiltradas.length === 0 ? (
          <div className="empty-state">
            <Database size={48} />
            <h3>Nenhuma questão encontrada</h3>
            <p>Crie questões para montar seus simulados.</p>
            <button className="btn btn-primary" onClick={abrirNova}><Plus size={18} /> Criar Questão</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questoesFiltradas.map(q => (
              <div key={q.id} className="card">
                <div className="flex-between">
                  <div style={{ flex: 1 }}>
                    <div className="flex-row gap-8" style={{ marginBottom: 8 }}>
                      <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`}>{q.tipo}</span>
                      <span className={`badge ${q.dificuldade === 'facil' ? 'badge-success' : q.dificuldade === 'dificil' ? 'badge-error' : 'badge-warning'}`}>{q.dificuldade}</span>
                      <span className="badge badge-cyan">{nomeMateria(q.materia_id)}</span>
                      {nomeSubtema(q.subtema_id) && <span className="badge badge-violet">{nomeSubtema(q.subtema_id)}</span>}
                      {(q.tags || []).map(t => <span key={t} className="badge badge-warning">{t}</span>)}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {q.enunciado.length > 200 ? q.enunciado.slice(0, 200) + '...' : q.enunciado}
                    </p>
                  </div>
                  <div className="flex-row gap-8" style={{ marginLeft: 16 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => pedirSugestaoIA(q)} title="Sugestão IA"><Lightbulb size={14} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(q)}><Edit3 size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => excluir(q.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
                {sugestaoIA.questaoId === q.id && (
                  <div style={{ marginTop: 12, padding: 16, background: 'var(--accent-violet-dim)', borderRadius: 8, fontSize: '0.85rem' }} className="slide-up">
                    <div className="flex-between" style={{ marginBottom: 8 }}>
                      <strong style={{ color: 'var(--accent-violet)' }}>💡 Sugestão da IA</strong>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => setSugestaoIA({ loading: false, texto: '', questaoId: null })}><X size={12} /></button>
                    </div>
                    {sugestaoIA.loading ? <div className="loading-spinner" /> : <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{sugestaoIA.texto}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>{modal === 'editar' ? 'Editar Questão' : 'Nova Questão'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={salvar}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    <option value="objetiva">Objetiva</option>
                    <option value="discursiva">Discursiva</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dificuldade</label>
                  <select className="form-select" value={form.dificuldade} onChange={e => setForm({...form, dificuldade: e.target.value})}>
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Matéria *</label>
                  <select className="form-select" value={form.materia_id} onChange={e => setForm({...form, materia_id: e.target.value, subtema_id: ''})}>
                    <option value="">Selecione...</option>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subtema</label>
                  <select className="form-select" value={form.subtema_id} onChange={e => setForm({...form, subtema_id: e.target.value})}>
                    <option value="">Nenhum</option>
                    {subtemas.filter(s => s.materia_id === form.materia_id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Peso</label>
                <input type="number" className="form-input" value={form.peso} onChange={e => setForm({...form, peso: Number(e.target.value)})} min={0.5} max={10} step={0.5} style={{ width: 100 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Tags</label>
                <div className="flex-row gap-8">
                  {['conceitual','interpretação','memorização'].map(tag => (
                    <div key={tag} className={`chip ${form.tags.includes(tag) ? 'selected' : ''}`} onClick={() => toggleTag(tag)}>{tag}</div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Enunciado *</label>
                <textarea className="form-textarea" value={form.enunciado} onChange={e => setForm({...form, enunciado: e.target.value})} rows={4} placeholder="Digite o enunciado da questão..." />
              </div>

              {form.tipo === 'objetiva' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Alternativas</label>
                    {form.alternativas.map((alt, i) => (
                      <div key={i} className="flex-row" style={{ marginBottom: 8 }}>
                        <div onClick={() => setForm({...form, gabarito: alt.letra})} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: form.gabarito === alt.letra ? 'var(--success)' : 'var(--bg-tertiary)', color: form.gabarito === alt.letra ? 'white' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                          {alt.letra}
                        </div>
                        <input className="form-input" value={alt.texto} onChange={e => { const a = [...form.alternativas]; a[i] = {...a[i], texto: e.target.value}; setForm({...form, alternativas: a}) }} placeholder={`Alternativa ${alt.letra}`} style={{ flex: 1 }} />
                      </div>
                    ))}
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Clique na letra para marcar o gabarito (verde = correto)</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Explicação</label>
                    <textarea className="form-textarea" value={form.explicacao} onChange={e => setForm({...form, explicacao: e.target.value})} rows={3} placeholder="Opcional — pode ser gerada pela IA" />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">Subitens</label>
                  {form.subitens.map((sub, i) => (
                    <div key={i} style={{ padding: 16, background: 'var(--bg-tertiary)', borderRadius: 10, marginBottom: 12, border: '1px solid var(--border-color)' }}>
                      <div className="flex-between" style={{ marginBottom: 10 }}>
                        <strong style={{ color: 'var(--accent-cyan)' }}>{sub.letra})</strong>
                        {form.subitens.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => removerSubitem(i)}><Trash2 size={12} /></button>}
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <input className="form-input" value={sub.texto} onChange={e => { const s = [...form.subitens]; s[i] = {...s[i], texto: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Texto do subitem..." />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <textarea className="form-textarea" value={sub.gabarito} onChange={e => { const s = [...form.subitens]; s[i] = {...s[i], gabarito: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Gabarito esperado..." rows={2} />
                      </div>
                      <input className="form-input" value={sub.criterios} onChange={e => { const s = [...form.subitens]; s[i] = {...s[i], criterios: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Critérios de correção..." />
                    </div>
                  ))}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarSubitem}><Plus size={14} /> Adicionar Subitem</button>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="button" className="btn btn-secondary" onClick={gerarGabarito} disabled={gerandoGab} style={{ borderColor: 'var(--accent-violet)' }}>
                  <Brain size={16} /> {gerandoGab ? 'Gerando...' : 'Gerar Gabarito com IA'}
                </button>
                <button type="submit" className="btn btn-primary">{modal === 'editar' ? 'Salvar' : 'Criar Questão'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar PDF */}
      {modalImport && importResult && (
        <div className="modal-overlay" onClick={() => setModalImport(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>📄 Questões Encontradas no PDF</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setModalImport(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: 20 }}>
              <div className="flex-row gap-8" style={{ marginBottom: 16 }}>
                <span className="badge badge-cyan">{importResult.total_encontradas} questões</span>
                {importResult.observacoes && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{importResult.observacoes}</span>}
              </div>
              {importResult.questoes?.length > 0 ? (
                <>
                  <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
                    {importResult.questoes.map((q, i) => (
                      <div key={i} className="card" style={{ marginBottom: 8 }}>
                        <div className="flex-row gap-8" style={{ marginBottom: 6 }}>
                          <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`}>{q.tipo}</span>
                          <span className="badge badge-warning">{q.dificuldade}</span>
                          {q.gabarito && <span className="badge badge-success">Gabarito: {q.gabarito}</span>}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{q.enunciado?.slice(0, 150)}...</p>
                      </div>
                    ))}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Salvar na matéria:</label>
                    <select className="form-select" id="import-materia" defaultValue="">
                      <option value="" disabled>Selecione...</option>
                      {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModalImport(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => salvarQuestoesImportadas(document.getElementById('import-materia').value)}>
                      <FileText size={16} /> Importar {importResult.questoes.length} Questões
                    </button>
                  </div>
                </>
              ) : <p style={{ color: 'var(--text-muted)' }}>Nenhuma questão identificada.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
