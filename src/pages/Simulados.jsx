import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ClipboardList, Plus, Eye, Trash2, Clock, Award } from 'lucide-react'

export default function Simulados() {
  const [simulados, setSimulados] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroMateria, setFiltroMateria] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from('simulados').select('*').order('criado_em', { ascending: false }),
      supabase.from('materias').select('*')
    ])
    setSimulados(s || [])
    setMaterias(m || [])
    setLoading(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir este simulado?')) return
    await supabase.from('respostas_simulado').delete().eq('simulado_id', id)
    await supabase.from('analises_simulado').delete().eq('simulado_id', id)
    await supabase.from('simulados').delete().eq('id', id)
    carregar()
  }

  const nomeMateria = (id) => materias.find(m => m.id === id)?.nome || '—'
  const corMateria = (id) => materias.find(m => m.id === id)?.cor || '#06b6d4'
  const filtrados = filtroMateria ? simulados.filter(s => s.materia_id === filtroMateria) : simulados

  function formatTempo(seg) {
    if (!seg) return '—'
    const m = Math.floor(seg / 60), s = seg % 60
    return `${m}min ${s}s`
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Simulados</h2>
          <p className="subtitle">{simulados.length} simulados realizados</p>
        </div>
        <Link to="/simulados/criar" className="btn btn-primary"><Plus size={18} /> Novo Simulado</Link>
      </div>
      <div className="page-body">
        <div style={{ marginBottom: 20 }}>
          <select className="form-select" value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} style={{ width: 200 }}>
            <option value="">Todas matérias</option>
            {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
        {filtrados.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} />
            <h3>Nenhum simulado ainda</h3>
            <p>Crie seu primeiro simulado para praticar.</p>
            <Link to="/simulados/criar" className="btn btn-primary"><Plus size={18} /> Criar Simulado</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrados.map(s => (
              <div key={s.id} className="card" style={{ borderLeft: `4px solid ${corMateria(s.materia_id)}` }}>
                <div className="flex-between">
                  <div>
                    <div className="flex-row gap-8" style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{s.titulo}</span>
                      <span className={`badge ${s.status === 'finalizado' ? 'badge-success' : s.status === 'em_andamento' ? 'badge-warning' : 'badge-cyan'}`}>{s.status === 'finalizado' ? 'Finalizado' : s.status === 'em_andamento' ? 'Em andamento' : 'Criado'}</span>
                    </div>
                    <div className="flex-row gap-16" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span className="flex-row gap-8"><span className="color-dot" style={{ background: corMateria(s.materia_id) }} />{nomeMateria(s.materia_id)}</span>
                      <span className="flex-row gap-8"><Clock size={14} />{formatTempo(s.tempo_total)}</span>
                      {s.status === 'finalizado' && <span className="flex-row gap-8"><Award size={14} />{s.nota?.toFixed(1)}/{s.nota_maxima?.toFixed(1)}</span>}
                      <span>{new Date(s.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex-row gap-8">
                    {s.status === 'criado' && <Link to={`/simulados/${s.id}/executar`} className="btn btn-primary btn-sm">Iniciar</Link>}
                    {s.status === 'em_andamento' && <Link to={`/simulados/${s.id}/executar`} className="btn btn-warning btn-sm" style={{ background: 'var(--warning-dim)', color: 'var(--warning)' }}>Continuar</Link>}
                    {s.status === 'finalizado' && <Link to={`/simulados/${s.id}/resultado`} className="btn btn-success btn-sm"><Eye size={14} /> Ver Resultado</Link>}
                    <button className="btn btn-danger btn-sm" onClick={() => excluir(s.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
