import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { gerarSimuladoAutomatico } from '../services/iaService'
import { Plus, Zap, Filter, Check } from 'lucide-react'

export default function CriarSimulado() {
  const { materiaId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [materias, setMaterias] = useState([])
  const [subtemas, setSubtemas] = useState([])
  const [questoes, setQuestoes] = useState([])
  const [respondidasIds, setRespondidasIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)

  const [form, setForm] = useState({
    titulo: '', materia_id: materiaId || '', subtema_id: '', dificuldade: '', tipo_questao: '',
    tipo: 'manual', cronometro_visivel: true, excluir_feitas: false, selecionadas: []
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: m }, { data: s }, { data: q }, { data: r }] = await Promise.all([
      supabase.from('materias').select('*').order('nome'),
      supabase.from('subtemas').select('*'),
      supabase.from('questoes').select('*').order('criado_em', { ascending: false }),
      supabase.from('respostas_simulado').select('questao_id').eq('user_id', user.id)
    ])
    setMaterias(m || [])
    setSubtemas(s || [])
    setQuestoes(q || [])
    setRespondidasIds(new Set((r || []).map(x => x.questao_id)))
    setLoading(false)
  }

  const questoesFiltradas = questoes.filter(q => {
    if (!form.materia_id) return false
    if (q.materia_id !== form.materia_id) return false
    if (form.subtema_id && q.subtema_id !== form.subtema_id) return false
    if (form.dificuldade && q.dificuldade !== form.dificuldade) return false
    if (form.tipo_questao && q.tipo !== form.tipo_questao) return false
    if (form.excluir_feitas && respondidasIds.has(q.id)) return false
    return true
  })

  function toggleQuestao(id) {
    setForm(f => ({
      ...f,
      selecionadas: f.selecionadas.includes(id) ? f.selecionadas.filter(x => x !== id) : [...f.selecionadas, id]
    }))
  }

  function selecionarTodas() {
    setForm(f => ({ ...f, selecionadas: questoesFiltradas.map(q => q.id) }))
  }

  async function gerarAutomatico() {
    if (!form.materia_id) return toast('Selecione uma matéria', 'error')
    setCriando(true)
    try {
      const { data: respostas } = await supabase.from('respostas_simulado')
        .select('questao_id, esta_correta')
        .eq('user_id', user.id)
        .eq('esta_correta', false)
      
      const erros = {}
      ;(respostas || []).forEach(r => {
        const q = questoes.find(x => x.id === r.questao_id)
        if (q) {
          const tema = subtemas.find(s => s.id === q.subtema_id)?.nome || 'Geral'
          const key = tema
          if (!erros[key]) erros[key] = { tema, count: 0, tag: (q.tags || [])[0] || 'geral' }
          erros[key].count++
        }
      })
      const errosArr = Object.values(erros).sort((a, b) => b.count - a.count)
      const disponveis = questoesFiltradas.map(q => ({
        id: q.id, tema: subtemas.find(s => s.id === q.subtema_id)?.nome || 'Geral',
        dificuldade: q.dificuldade, tags: q.tags
      }))
      const resultado = await gerarSimuladoAutomatico(errosArr, disponveis)
      const ids = resultado.questao_ids?.filter(id => questoesFiltradas.some(q => q.id === id)) || []
      if (ids.length === 0) {
        setForm(f => ({ ...f, selecionadas: questoesFiltradas.slice(0, 10).map(q => q.id) }))
        toast('IA não encontrou padrões. Selecionadas 10 questões automaticamente.', 'info')
      } else {
        setForm(f => ({ ...f, selecionadas: ids }))
        toast(`IA selecionou ${ids.length} questões baseado nos seus erros!`, 'success')
      }
    } catch { toast('Erro ao gerar automaticamente', 'error') }
    setCriando(false)
  }

  async function criarSimulado() {
    if (!form.materia_id) return toast('Selecione uma matéria', 'error')
    if (form.selecionadas.length === 0) return toast('Selecione pelo menos uma questão', 'error')
    if (!form.titulo.trim()) return toast('Dê um título ao simulado', 'error')
    setCriando(true)
    try {
      const { data, error } = await supabase.from('simulados').insert({
        titulo: form.titulo, materia_id: form.materia_id,
        subtema_ids: form.subtema_id ? [form.subtema_id] : [],
        tipo: form.tipo, questao_ids: form.selecionadas,
        cronometro_visivel: form.cronometro_visivel,
        user_id: user.id,
        nota_maxima: form.selecionadas.reduce((acc, id) => {
          const q = questoes.find(x => x.id === id)
          return acc + (q?.peso || 1) * 10
        }, 0)
      }).select().single()
      if (error) throw error
      // Criar registros de resposta
      const respostas = form.selecionadas.map((qid, i) => ({
        simulado_id: data.id, questao_id: qid, ordem: i, user_id: user.id
      }))
      await supabase.from('respostas_simulado').insert(respostas)
      toast('Simulado criado!', 'success')
      navigate(`/simulados/${data.id}/executar`)
    } catch (e) { toast('Erro ao criar simulado: ' + e.message, 'error') }
    setCriando(false)
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h2>Criar Simulado</h2><p className="subtitle">Monte seu simulado de prática</p></div>
      </div>
      <div className="page-body">
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Configurações</h3>
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Simulado Imunologia #1" />
            </div>
            <div className="form-group">
              <label className="form-label">Matéria * (obrigatório)</label>
              <select className="form-select" value={form.materia_id} onChange={e => setForm({...form, materia_id: e.target.value, subtema_id: '', selecionadas: []})}>
                <option value="">Selecione...</option>
                {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subtema (filtro)</label>
              <select className="form-select" value={form.subtema_id} onChange={e => setForm({...form, subtema_id: e.target.value})}>
                <option value="">Todos</option>
                {subtemas.filter(s => s.materia_id === form.materia_id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="grid-2 gap-16">
              <div className="form-group">
                <label className="form-label">Dificuldade (filtro)</label>
                <select className="form-select" value={form.dificuldade} onChange={e => setForm({...form, dificuldade: e.target.value})}>
                  <option value="">Todas</option>
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de Questão (filtro)</label>
                <select className="form-select" value={form.tipo_questao} onChange={e => setForm({...form, tipo_questao: e.target.value})}>
                  <option value="">Ambas</option>
                  <option value="objetiva">Objetiva</option>
                  <option value="discursiva">Discursiva</option>
                </select>
              </div>
            </div>
            <div className="form-group flex-row gap-16">
              <label className="flex-row gap-8" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.cronometro_visivel} onChange={e => setForm({...form, cronometro_visivel: e.target.checked})} />
                <span className="form-label" style={{ margin: 0 }}>Exibir cronômetro</span>
              </label>
              <label className="flex-row gap-8" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.excluir_feitas} onChange={e => setForm({...form, excluir_feitas: e.target.checked, selecionadas: []})} />
                <span className="form-label" style={{ margin: 0 }}>Excluir já feitas</span>
              </label>
            </div>
            <div className="flex-row gap-8">
              <button className="btn btn-secondary" onClick={selecionarTodas} disabled={!form.materia_id}><Check size={16} /> Selecionar Todas</button>
              <button className="btn btn-primary" onClick={gerarAutomatico} disabled={!form.materia_id || criando}><Zap size={16} /> IA Automático</button>
            </div>
          </div>

          <div className="card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h3 className="card-title">Questões Disponíveis ({questoesFiltradas.length})</h3>
              <span className="badge badge-cyan">{form.selecionadas.length} selecionadas</span>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {!form.materia_id ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Selecione uma matéria para ver as questões</p>
              ) : questoesFiltradas.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Nenhuma questão nesta matéria</p>
              ) : questoesFiltradas.map(q => (
                <div key={q.id} onClick={() => toggleQuestao(q.id)} style={{
                  padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: form.selecionadas.includes(q.id) ? 'var(--accent-cyan-dim)' : 'var(--bg-tertiary)',
                  border: `1px solid ${form.selecionadas.includes(q.id) ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  transition: 'var(--transition)'
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: '2px solid', borderColor: form.selecionadas.includes(q.id) ? 'var(--accent-cyan)' : 'var(--text-muted)', background: form.selecionadas.includes(q.id) ? 'var(--accent-cyan)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {form.selecionadas.includes(q.id) && <Check size={12} color="white" />}
                  </div>
                  <div>
                    <div className="flex-row gap-8" style={{ marginBottom: 4 }}>
                      <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`} style={{ fontSize: '0.65rem' }}>{q.tipo}</span>
                      <span className={`badge ${q.dificuldade === 'facil' ? 'badge-success' : q.dificuldade === 'dificil' ? 'badge-error' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>{q.dificuldade}</span>
                      {respondidasIds.has(q.id) && <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Já feita</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {q.enunciado.length > 100 ? q.enunciado.slice(0, 100) + '...' : q.enunciado}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-lg" onClick={criarSimulado} disabled={criando || form.selecionadas.length === 0}>
            {criando ? 'Criando...' : `Criar Simulado (${form.selecionadas.length} questões)`}
          </button>
        </div>
      </div>
    </div>
  )
}
