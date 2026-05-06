import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Plus, Edit3, Trash2, Search, X, ChevronDown, Filter, Lightbulb, Database, Upload, FileText, Sparkles, Brain, BookOpen, Layers } from 'lucide-react'
import { sugerirMelhoriaQuestao, extrairQuestoesDePDF, gerarGabaritoIA } from '../services/iaService'
import { extrairTextoPDF } from '../services/pdfService'
import { uploadImagemQuestao } from '../services/storageService'

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
    gabarito: '', explicacao: '', imagem_url: '', imagemFile: null,
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
      gabarito: '', explicacao: '', imagem_url: '', imagemFile: null,
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
      gabarito: q.gabarito || '', explicacao: q.explicacao || '', imagem_url: q.imagem_url || '', imagemFile: null,
      subitens: q.subitens || [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
    })
    setModal('editar')
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.enunciado.trim() || !form.materia_id) return toast('Preencha enunciado e matéria', 'error')

    let urlImagem = form.imagem_url;
    if (form.imagemFile) {
      try {
        toast('Fazendo upload da imagem...', 'info')
        urlImagem = await uploadImagemQuestao(form.imagemFile)
      } catch (e) {
        return toast('Erro ao fazer upload da imagem', 'error')
      }
    }

    const dados = {
      tipo: form.tipo, materia_id: form.materia_id, subtema_id: form.subtema_id || null,
      enunciado: form.enunciado, dificuldade: form.dificuldade, peso: form.peso, tags: form.tags,
      alternativas: form.tipo === 'objetiva' ? form.alternativas : [],
      gabarito: form.tipo === 'objetiva' ? form.gabarito : '',
      explicacao: form.explicacao,
      imagem_url: urlImagem,
      subitens: form.tipo === 'discursiva' ? form.subitens : []
    }

    if (form.id) {
      const { error } = await supabase.from('questoes').update(dados).eq('id', form.id)
      if (error?.code === '23505') return toast('Já existe outra questão com este enunciado!', 'error')
      toast('Questão atualizada!', 'success')
    } else {
      const { error } = await supabase.from('questoes').insert(dados)
      if (error?.code === '23505') return toast('Esta questão já existe no banco de dados!', 'error')
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
    let duplicados = 0
    
    const { data: subsExistentes } = await supabase.from('subtemas').select('id, nome').eq('materia_id', materiaId)
    const mapaSubtemas = new Map((subsExistentes || []).map(s => [s.nome.toLowerCase(), s.id]))

    for (const q of importResult.questoes) {
      let subtemaId = null
      const nomeSub = q.subtema || q.tags?.[0] || 'Geral'
      
      const nomeNormalizado = nomeSub.trim().toLowerCase()
      if (mapaSubtemas.has(nomeNormalizado)) {
        subtemaId = mapaSubtemas.get(nomeNormalizado)
      } else {
        const { data: novoSub, error: errSub } = await supabase
          .from('subtemas')
          .insert({ materia_id: materiaId, nome: nomeSub.trim() })
          .select()
          .single()
        
        if (!errSub && novoSub) {
          subtemaId = novoSub.id
          mapaSubtemas.set(nomeNormalizado, subtemaId)
        }
      }

      const dados = {
        tipo: q.tipo, 
        materia_id: materiaId, 
        subtema_id: subtemaId,
        enunciado: q.enunciado,
        dificuldade: q.dificuldade || 'medio', 
        peso: 1, 
        tags: q.tags || [],
        alternativas: q.alternativas || [], 
        gabarito: q.gabarito || '',
        explicacao: q.explicacao || '', 
        subitens: q.subitens || []
      }

      const { error } = await supabase.from('questoes').insert(dados)
      if (!error) {
        count++
      } else if (error.code === '23505') {
        duplicados++
      }
    }

    if (duplicados > 0) {
      toast(`${count} novas questões importadas em seus respectivos subtemas. ${duplicados} duplicatas ignoradas.`, 'info')
    } else {
      toast(`${count} questões importadas e organizadas por subtema!`, 'success')
    }

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

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando banco de dados...</p></div>

  return (
    <div className="fade-in">
      <div className="page-header" style={{ background: 'linear-gradient(to bottom, rgba(17, 24, 39, 0.8), rgba(17, 24, 39, 0.4))' }}>
        <div className="container-center flex-between" style={{ width: '100%' }}>
          <div>
            <div className="flex-row gap-8">
              <Database className="text-cyan" size={24} />
              <h2 style={{ margin: 0 }}>Banco de Questões</h2>
            </div>
            <p className="subtitle">{questoes.length} questões disponíveis para estudo</p>
          </div>
          <div className="flex-row gap-12">
            <label className="btn btn-secondary" style={{ cursor: importando ? 'wait' : 'pointer', borderStyle: 'dashed' }}>
              <Upload size={16} /> {importando ? 'Processando...' : 'Importar PDF'}
              <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={importarPDF} disabled={importando} />
            </label>
            <button className="btn btn-primary" onClick={abrirNova} style={{ boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)' }}>
              <Plus size={18} /> Nova Questão
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="container-center">
          {/* Toolbar de Filtros */}
          <div className="glass-toolbar">
            <div className="flex-row flex-wrap gap-16">
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className="flex-row" style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)' }} />
                  <input 
                    className="form-input" 
                    placeholder="Pesquisar termos no enunciado..." 
                    value={filtros.busca} 
                    onChange={e => setFiltros({...filtros, busca: e.target.value})} 
                    style={{ paddingLeft: 42, background: 'var(--bg-primary)', height: 46 }} 
                  />
                </div>
              </div>
              
              <div className="flex-row gap-8">
                <Filter size={16} className="text-muted" />
                <select className="form-select" value={filtros.materia} onChange={e => setFiltros({...filtros, materia: e.target.value, subtema: ''})} style={{ width: 180, height: 46 }}>
                  <option value="">Todas Matérias</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                
                <select className="form-select" value={filtros.tipo} onChange={e => setFiltros({...filtros, tipo: e.target.value})} style={{ width: 150, height: 46 }}>
                  <option value="">Tipo: Todos</option>
                  <option value="objetiva">Objetiva</option>
                  <option value="discursiva">Discursiva</option>
                </select>

                <select className="form-select" value={filtros.dificuldade} onChange={e => setFiltros({...filtros, dificuldade: e.target.value})} style={{ width: 140, height: 46 }}>
                  <option value="">Dificuldade</option>
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
            </div>
          </div>

          {questoesFiltradas.length === 0 ? (
            <div className="empty-state card slide-up" style={{ padding: 80 }}>
              <div style={{ background: 'var(--bg-tertiary)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Search size={40} className="text-muted" />
              </div>
              <h3>Nenhuma questão encontrada</h3>
              <p>Tente ajustar seus filtros ou crie uma nova questão para começar.</p>
              <button className="btn btn-primary btn-lg mt-24" onClick={abrirNova}>
                <Plus size={20} /> Criar Minha Primeira Questão
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="fade-in">
              {questoesFiltradas.map((q, idx) => (
                <div key={q.id} className="question-card slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ flex: 1 }}>
                      <div className="flex-row flex-wrap gap-8" style={{ marginBottom: 12 }}>
                        <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`}>
                          {q.tipo === 'objetiva' ? <Layers size={10} style={{marginRight:4}} /> : <Edit3 size={10} style={{marginRight:4}} />}
                          {q.tipo}
                        </span>
                        <span className={`badge ${q.dificuldade === 'facil' ? 'badge-success' : q.dificuldade === 'dificil' ? 'badge-error' : 'badge-warning'}`}>
                          {q.dificuldade}
                        </span>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                          <BookOpen size={10} style={{marginRight:4}} />
                          {nomeMateria(q.materia_id)}
                        </span>
                        {nomeSubtema(q.subtema_id) && (
                          <span className="badge badge-violet" style={{ opacity: 0.8 }}>
                            {nomeSubtema(q.subtema_id)}
                          </span>
                        )}
                        {(q.tags || []).map(t => <span key={t} className="badge badge-warning" style={{ opacity: 0.7 }}>#{t}</span>)}
                      </div>
                      
                      <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 400 }}>
                        {q.enunciado.length > 300 ? q.enunciado.slice(0, 300) + '...' : q.enunciado}
                      </p>
                    </div>

                    <div className="flex-row gap-8" style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-icon" onClick={() => pedirSugestaoIA(q)} title="Pedir Insight da IA" style={{ borderRadius: '50%' }}>
                        <Sparkles size={16} className="text-violet" />
                      </button>
                      <button className="btn btn-secondary btn-icon" onClick={() => abrirEditar(q)} style={{ borderRadius: '50%' }}>
                        <Edit3 size={16} />
                      </button>
                      <button className="btn btn-danger btn-icon" onClick={() => excluir(q.id)} style={{ borderRadius: '50%', background: 'transparent' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {sugestaoIA.questaoId === q.id && (
                    <div style={{ 
                      marginTop: 20, 
                      padding: 20, 
                      background: 'rgba(139, 92, 246, 0.08)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      fontSize: '0.95rem' 
                    }} className="slide-up">
                      <div className="flex-between" style={{ marginBottom: 12 }}>
                        <div className="flex-row gap-8">
                          <Brain size={18} className="text-violet" />
                          <strong style={{ color: 'var(--accent-violet)' }}>Insight da Inteligência Artificial</strong>
                        </div>
                        <button className="btn btn-icon btn-sm btn-secondary" onClick={() => setSugestaoIA({ loading: false, texto: '', questaoId: null })} style={{ background: 'transparent', border: 'none' }}>
                          <X size={16} />
                        </button>
                      </div>
                      {sugestaoIA.loading ? (
                        <div className="flex-row gap-12" style={{ padding: '10px 0' }}>
                          <div className="loading-spinner" style={{ margin: 0, width: 20, height: 20 }} />
                          <span className="text-muted">Analisando pedagogicamente a questão...</span>
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {sugestaoIA.texto}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', border: '1px solid var(--accent-cyan)' }}>
            <div className="modal-header">
              <div className="flex-row gap-12">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-cyan-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {modal === 'editar' ? <Edit3 size={20} className="text-cyan" /> : <Plus size={20} className="text-cyan" />}
                </div>
                <h3>{modal === 'editar' ? 'Editar Questão' : 'Criar Nova Questão'}</h3>
              </div>
              <button className="btn btn-icon btn-secondary" onClick={() => setModal(null)} style={{ borderRadius: '50%' }}><X size={18} /></button>
            </div>
            
            <form onSubmit={salvar}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Tipo de Questão</label>
                  <select className="form-select" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    <option value="objetiva">Objetiva (Múltipla Escolha)</option>
                    <option value="discursiva">Discursiva (Resposta Aberta)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Nível de Dificuldade</label>
                  <select className="form-select" value={form.dificuldade} onChange={e => setForm({...form, dificuldade: e.target.value})}>
                    <option value="facil">🟢 Fácil</option>
                    <option value="medio">🟡 Médio</option>
                    <option value="dificil">🔴 Difícil</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Matéria Base *</label>
                  <select className="form-select" value={form.materia_id} onChange={e => setForm({...form, materia_id: e.target.value, subtema_id: ''})}>
                    <option value="">Selecione a disciplina...</option>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subtema Específico</label>
                  <select className="form-select" value={form.subtema_id} onChange={e => setForm({...form, subtema_id: e.target.value})}>
                    <option value="">Nenhum (Geral)</option>
                    {subtemas.filter(s => s.materia_id === form.materia_id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Peso Pedagógico</label>
                  <input type="number" className="form-input" value={form.peso} onChange={e => setForm({...form, peso: Number(e.target.value)})} min={0.5} max={10} step={0.5} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags Rápidas</label>
                  <div className="flex-row gap-8" style={{ marginTop: 4 }}>
                    {['conceitual','interpretação','memorização'].map(tag => (
                      <div key={tag} className={`chip ${form.tags.includes(tag) ? 'selected' : ''}`} onClick={() => toggleTag(tag)}>{tag}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Enunciado Completo *</label>
                <textarea 
                  className="form-textarea" 
                  value={form.enunciado} 
                  onChange={e => setForm({...form, enunciado: e.target.value})} 
                  rows={6} 
                  placeholder="Descreva a pergunta de forma clara e objetiva..." 
                  style={{ fontSize: '1rem' }}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Suporte Visual (Opcional)</label>
                <div style={{ 
                  position: 'relative',
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: 20, 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  minHeight: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {(form.imagem_url || form.imagemFile) ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={form.imagemFile ? URL.createObjectURL(form.imagemFile) : form.imagem_url} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 8, boxShadow: 'var(--shadow-md)' }} 
                      />
                      <button type="button" className="btn btn-danger btn-icon" style={{ position: 'absolute', top: -12, right: -12, borderRadius: '50%', padding: 0, zIndex: 10 }} onClick={() => setForm({...form, imagem_url: '', imagemFile: null})}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-column gap-12" style={{ cursor: 'pointer' }}>
                      <Upload size={24} className="text-muted" />
                      <span className="text-muted" style={{ fontSize: '0.9rem' }}>Arraste uma imagem ou clique para selecionar</span>
                      <input 
                        type="file" 
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%', 
                          opacity: 0, 
                          cursor: 'pointer' 
                        }} 
                        accept="image/*" 
                        onChange={e => setForm({...form, imagemFile: e.target.files[0]})} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-color)', margin: '32px 0' }} />

              {form.tipo === 'objetiva' ? (
                <div className="slide-up">
                  <h4 style={{ marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers size={18} className="text-cyan" /> Alternativas e Gabarito
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.alternativas.map((alt, i) => (
                      <div key={i} className="flex-row" style={{ 
                        background: form.gabarito === alt.letra ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        padding: 8,
                        borderRadius: 12,
                        border: '1px solid',
                        borderColor: form.gabarito === alt.letra ? 'var(--success)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}>
                        <div 
                          onClick={() => setForm({...form, gabarito: alt.letra})} 
                          style={{ 
                            width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            background: form.gabarito === alt.letra ? 'var(--success)' : 'var(--bg-tertiary)', 
                            color: form.gabarito === alt.letra ? 'white' : 'var(--text-secondary)', 
                            fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                            boxShadow: form.gabarito === alt.letra ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          {alt.letra}
                        </div>
                        <input 
                          className="form-input" 
                          value={alt.texto} 
                          onChange={e => { const a = [...form.alternativas]; a[i] = {...a[i], texto: e.target.value}; setForm({...form, alternativas: a}) }} 
                          placeholder={`Descreva a alternativa ${alt.letra}...`} 
                          style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: 0 }} 
                        />
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                    Clique na letra para definir qual é a alternativa correta.
                  </p>
                  
                  <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label">Resolução Comentada</label>
                    <textarea className="form-textarea" value={form.explicacao} onChange={e => setForm({...form, explicacao: e.target.value})} rows={4} placeholder="Explique o porquê desta ser a alternativa correta..." />
                  </div>
                </div>
              ) : (
                <div className="slide-up">
                  <h4 style={{ marginBottom: 20, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Edit3 size={18} className="text-violet" /> Configuração de Subitens
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {form.subitens.map((sub, i) => (
                      <div key={i} className="card" style={{ background: 'rgba(255,255,255,0.02)', borderStyle: 'dashed' }}>
                        <div className="flex-between" style={{ marginBottom: 16 }}>
                          <div className="flex-row gap-8">
                            <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-violet)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                              {sub.letra}
                            </span>
                            <span style={{ fontWeight: 600 }}>Item {sub.letra.toUpperCase()}</span>
                          </div>
                          {form.subitens.length > 1 && (
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removerSubitem(i)}>
                              <Trash2 size={14} /> Excluir Item
                            </button>
                          )}
                        </div>
                        <div className="form-group">
                          <label className="form-label">Pergunta do Item</label>
                          <input className="form-input" value={sub.texto} onChange={e => { const s = [...form.subitens]; s[i] = {...s[i], texto: e.target.value}; setForm({...form, subitens: s}) }} placeholder="O que está sendo perguntado neste item?" />
                        </div>
                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label">Resposta Padrão</label>
                            <textarea className="form-textarea" value={sub.gabarito} onChange={e => { const s = [...form.subitens]; s[i] = {...s[i], gabarito: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Qual a resposta correta?" rows={3} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Critérios de Avaliação</label>
                            <textarea className="form-textarea" value={sub.criterios} onChange={e => { const s = [...form.subitens]; s[i] = {...s[i], criterios: e.target.value}; setForm({...form, subitens: s}) }} placeholder="O que o aluno deve citar para ganhar a pontuação?" rows={3} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn btn-secondary mt-16" onClick={adicionarSubitem}>
                    <Plus size={16} /> Adicionar Novo Item (b, c, d...)
                  </button>
                </div>
              )}

              <div className="modal-footer" style={{ background: 'rgba(17, 24, 39, 0.9)', margin: '24px -32px -32px', padding: '20px 32px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Descartar</button>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn btn-secondary" onClick={gerarGabarito} disabled={gerandoGab} style={{ border: '1px solid var(--accent-violet)', color: 'var(--accent-violet)' }}>
                  {gerandoGab ? <div className="loading-spinner" style={{width:16, height:16, margin:0}} /> : <Brain size={18} />}
                  {gerandoGab ? 'Consultando IA...' : 'Gerar com IA'}
                </button>
                <button type="submit" className="btn btn-primary btn-lg">
                  {modal === 'editar' ? 'Salvar Alterações' : 'Finalizar e Salvar'}
                </button>
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
              <div className="flex-row gap-12">
                <FileText className="text-cyan" size={24} />
                <h3>Questões Detectadas pelo Analisador</h3>
              </div>
              <button className="btn btn-icon btn-secondary" onClick={() => setModalImport(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: '0 8px 24px' }}>
              <div className="glass-toolbar" style={{ marginBottom: 20, padding: 16 }}>
                <div className="flex-row flex-wrap gap-16">
                  <div className="badge badge-cyan" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
                    {importResult.total_encontradas} questões identificadas
                  </div>
                  {importResult.observacoes && (
                    <div className="flex-row gap-8 text-muted" style={{ fontSize: '0.85rem' }}>
                      <Sparkles size={14} className="text-warning" />
                      {importResult.observacoes}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ maxHeight: 450, overflow: 'auto', marginBottom: 24, padding: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {importResult.questoes?.map((q, i) => (
                  <div key={i} className="card" style={{ background: 'rgba(255,255,255,0.02)', padding: 16 }}>
                    <div className="flex-row gap-8" style={{ marginBottom: 10 }}>
                      <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`}>{q.tipo}</span>
                      <span className="badge badge-warning">{q.dificuldade}</span>
                      {q.gabarito && <span className="badge badge-success">Gabarito: {q.gabarito}</span>}
                      {q.subtema && <span className="badge badge-violet" style={{opacity:0.7}}>{q.subtema}</span>}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {q.enunciado?.slice(0, 180)}...
                    </p>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Destinar estas questões para a matéria:</label>
                <select className="form-select" id="import-materia" defaultValue="" style={{ height: 50, fontSize: '1rem' }}>
                  <option value="" disabled>Selecione uma disciplina da sua grade...</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              <div className="modal-footer" style={{ border: 'none', padding: 0, marginTop: 32 }}>
                <button className="btn btn-secondary" onClick={() => setModalImport(false)}>Cancelar Importação</button>
                <button className="btn btn-primary btn-lg" onClick={() => salvarQuestoesImportadas(document.getElementById('import-materia').value)}>
                  <Plus size={18} /> Confirmar e Salvar no Banco
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
