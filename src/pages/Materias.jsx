import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BookOpen, ClipboardList, BarChart3 } from 'lucide-react'

export default function Materias() {
  const [materias, setMaterias] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: m }, { data: q }, { data: s }] = await Promise.all([
      supabase.from('materias').select('*').order('nome'),
      supabase.from('questoes').select('id, materia_id'),
      supabase.from('simulados').select('id, materia_id, nota, nota_maxima, status, criado_em').eq('status', 'finalizado')
    ])
    setMaterias(m || [])
    const st = {}
    ;(m || []).forEach(mat => {
      const qs = (q || []).filter(x => x.materia_id === mat.id)
      const sims = (s || []).filter(x => x.materia_id === mat.id)
      const media = sims.length > 0 ? sims.reduce((a, x) => a + (x.nota_maxima > 0 ? x.nota / x.nota_maxima * 100 : 0), 0) / sims.length : 0
      const ultimo = sims.length > 0 ? sims.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0] : null
      st[mat.id] = { questoes: qs.length, simulados: sims.length, media, ultimo }
    })
    setStats(st)
    setLoading(false)
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h2>Matérias</h2><p className="subtitle">Análise por área de estudo</p></div>
      </div>
      <div className="page-body">
        {materias.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <h3>Nenhuma matéria cadastrada</h3>
            <p>Vá em "Gerenciar Matérias" para criar suas matérias.</p>
            <Link to="/materias/gerenciar" className="btn btn-primary">Gerenciar Matérias</Link>
          </div>
        ) : (
          <div className="grid-auto">
            {materias.map(m => {
              const s = stats[m.id] || {}
              return (
                <Link key={m.id} to={`/materias/${m.id}`} className="card" style={{ textDecoration: 'none', borderTop: `4px solid ${m.cor}` }}>
                  <div className="flex-row gap-8" style={{ marginBottom: 16 }}>
                    <div className="color-dot" style={{ background: m.cor, width: 16, height: 16 }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{m.nome}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div className="flex-row gap-8"><BookOpen size={14} /> {s.questoes} questões</div>
                    <div className="flex-row gap-8"><ClipboardList size={14} /> {s.simulados} simulados</div>
                  </div>
                  {s.simulados > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div className="flex-between" style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Média</span>
                        <span style={{ fontWeight: 700, color: s.media >= 60 ? 'var(--success)' : 'var(--error)' }}>{s.media.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${s.media}%`, background: s.media >= 60 ? 'var(--success)' : 'var(--error)' }} /></div>
                    </div>
                  )}
                  {s.ultimo && <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Último: {new Date(s.ultimo.criado_em).toLocaleDateString('pt-BR')}</div>}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
