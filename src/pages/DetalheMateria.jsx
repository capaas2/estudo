import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ArrowLeft, Plus, Zap, RotateCcw, Award, Clock, Target } from 'lucide-react'

export default function DetalheMateria() {
  const { id } = useParams()
  const [materia, setMateria] = useState(null)
  const [subtemas, setSubtemas] = useState([])
  const [simulados, setSimulados] = useState([])
  const [respostas, setRespostas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: mat } = await supabase.from('materias').select('*').eq('id', id).single()
    const { data: sub } = await supabase.from('subtemas').select('*').eq('materia_id', id)
    const { data: sim } = await supabase.from('simulados').select('*').eq('materia_id', id).eq('status', 'finalizado').order('criado_em')
    const simIds = (sim || []).map(s => s.id)
    let resp = []
    if (simIds.length > 0) {
      const { data: r } = await supabase.from('respostas_simulado').select('*').in('simulado_id', simIds)
      resp = r || []
    }
    setMateria(mat)
    setSubtemas(sub || [])
    setSimulados(sim || [])
    setRespostas(resp)
    setLoading(false)
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>
  if (!materia) return null

  const dadosEvolucao = simulados.map((s, i) => ({
    nome: `#${i + 1}`,
    nota: s.nota_maxima > 0 ? (s.nota / s.nota_maxima * 100) : 0,
    data: new Date(s.criado_em).toLocaleDateString('pt-BR')
  }))

  const dadosTempo = simulados.map((s, i) => ({
    nome: `#${i + 1}`,
    tempo: Math.round((s.tempo_total || 0) / 60)
  }))

  const mediaGeral = simulados.length > 0 ? simulados.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / simulados.length : 0
  const tempoMedio = simulados.length > 0 ? Math.round(simulados.reduce((a, s) => a + (s.tempo_total || 0), 0) / simulados.length / 60) : 0
  const totalErros = respostas.filter(r => !r.esta_correta).length

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="flex-row gap-16">
          <Link to="/materias" className="btn btn-secondary btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <div className="flex-row gap-8">
              <div className="color-dot" style={{ background: materia.cor, width: 14, height: 14 }} />
              <h2>{materia.nome}</h2>
            </div>
            <p className="subtitle">{materia.descricao || 'Análise detalhada'}</p>
          </div>
        </div>
        <div className="flex-row gap-8">
          <Link to={`/simulados/criar/${id}`} className="btn btn-primary"><Plus size={16} /> Novo Simulado</Link>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success-dim)' }}><Target size={22} color="var(--success)" /></div>
            <div className="stat-value" style={{ color: mediaGeral >= 60 ? 'var(--success)' : 'var(--error)' }}>{mediaGeral.toFixed(1)}%</div>
            <div className="stat-label">Média de Acertos</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-cyan-dim)' }}><Award size={22} color="var(--accent-cyan)" /></div>
            <div className="stat-value">{simulados.length}</div>
            <div className="stat-label">Simulados Realizados</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-violet-dim)' }}><Clock size={22} color="var(--accent-violet)" /></div>
            <div className="stat-value">{tempoMedio}min</div>
            <div className="stat-label">Tempo Médio</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--error-dim)' }}><RotateCcw size={22} color="var(--error)" /></div>
            <div className="stat-value">{totalErros}</div>
            <div className="stat-label">Total de Erros</div>
          </div>
        </div>

        {simulados.length > 0 && (
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>📈 Evolução de Desempenho</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosEvolucao}>
                  <CartesianGrid stroke="var(--border-color)" />
                  <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="nota" stroke="var(--accent-cyan)" strokeWidth={2} dot={{ fill: 'var(--accent-cyan)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>⏱️ Tempo por Simulado (min)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosTempo}>
                  <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                  <Bar dataKey="tempo" fill="var(--accent-violet)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Histórico */}
        <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>📋 Histórico de Simulados</h3>
        {simulados.length === 0 ? (
          <div className="empty-state"><p>Nenhum simulado finalizado nesta matéria.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Simulado</th><th>Nota</th><th>%</th><th>Tempo</th><th>Data</th><th>Ação</th></tr></thead>
              <tbody>
                {[...simulados].reverse().map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.titulo}</td>
                    <td>{s.nota?.toFixed(1)}/{s.nota_maxima?.toFixed(1)}</td>
                    <td><span style={{ fontWeight: 700, color: (s.nota / s.nota_maxima * 100) >= 60 ? 'var(--success)' : 'var(--error)' }}>{(s.nota / s.nota_maxima * 100).toFixed(1)}%</span></td>
                    <td>{Math.round((s.tempo_total || 0) / 60)}min</td>
                    <td>{new Date(s.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td><Link to={`/simulados/${s.id}/resultado`} className="btn btn-secondary btn-sm">Ver</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
