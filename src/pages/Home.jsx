import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { gerarInsightsDashboard } from '../services/iaService'
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Clock, Award, Target, Brain, Zap, AlertTriangle, BookOpen, RefreshCw } from 'lucide-react'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [simulados, setSimulados] = useState([])
  const [materias, setMaterias] = useState([])
  const [respostas, setRespostas] = useState([])
  const [questoes, setQuestoes] = useState([])
  const [subtemas, setSubtemas] = useState([])
  const [insights, setInsights] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: s }, { data: m }, { data: r }, { data: q }, { data: st }] = await Promise.all([
      supabase.from('simulados').select('*').eq('status', 'finalizado').order('criado_em'),
      supabase.from('materias').select('*'),
      supabase.from('respostas_simulado').select('*'),
      supabase.from('questoes').select('*'),
      supabase.from('subtemas').select('*')
    ])
    setSimulados(s || [])
    setMaterias(m || [])
    setRespostas(r || [])
    setQuestoes(q || [])
    setSubtemas(st || [])
    setLoading(false)
  }

  async function gerarInsights() {
    if (simulados.length === 0) return
    setLoadingIA(true)
    try {
      const erros = {}
      respostas.filter(r => !r.esta_correta).forEach(r => {
        const q = questoes.find(x => x.id === r.questao_id)
        if (q) {
          const sub = subtemas.find(s => s.id === q.subtema_id)?.nome || q.materia_id
          const mat = materias.find(m => m.id === q.materia_id)?.nome || ''
          const key = `${mat} - ${sub}`
          erros[key] = (erros[key] || 0) + 1
        }
      })
      const errosFreq = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)

      const dados = {
        totalSimulados: simulados.length,
        mediaGeral: simulados.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / simulados.length,
        materias: [...new Set(simulados.map(s => materias.find(m => m.id === s.materia_id)?.nome).filter(Boolean))],
        ultimosResultados: simulados.slice(-5).map(s => ({
          materia: materias.find(m => m.id === s.materia_id)?.nome || '',
          nota: s.nota_maxima > 0 ? (s.nota / s.nota_maxima * 100) : 0
        })),
        errosFrequentes: errosFreq
      }
      const result = await gerarInsightsDashboard(dados)
      setInsights(result)
    } catch { setInsights({ pontos_fracos: ['Erro ao gerar insights'], tendencia: '', prioridades: [], dica_do_dia: '' }) }
    setLoadingIA(false)
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando dashboard...</p></div>

  const totalSims = simulados.length
  const mediaGeral = totalSims > 0 ? simulados.reduce((a, s) => a + (s.nota_maxima > 0 ? s.nota / s.nota_maxima * 100 : 0), 0) / totalSims : 0
  const tempoTotal = simulados.reduce((a, s) => a + (s.tempo_total || 0), 0)
  const totalQuestoes = questoes.length

  const dadosEvolucao = simulados.map((s, i) => ({
    nome: `#${i + 1}`, nota: s.nota_maxima > 0 ? +(s.nota / s.nota_maxima * 100).toFixed(1) : 0
  }))
  const dadosTempo = simulados.map((s, i) => ({
    nome: `#${i + 1}`, tempo: Math.round((s.tempo_total || 0) / 60)
  }))
  const dadosDispersao = simulados.map(s => ({
    tempo: Math.round((s.tempo_total || 0) / 60),
    nota: s.nota_maxima > 0 ? +(s.nota / s.nota_maxima * 100).toFixed(1) : 0
  }))

  // Conteúdos com mais erros
  const errosPorTema = {}
  respostas.filter(r => !r.esta_correta).forEach(r => {
    const q = questoes.find(x => x.id === r.questao_id)
    if (q) {
      const matNome = materias.find(m => m.id === q.materia_id)?.nome || '?'
      const subNome = subtemas.find(s => s.id === q.subtema_id)?.nome || 'Geral'
      const key = `${matNome} > ${subNome}`
      errosPorTema[key] = (errosPorTema[key] || 0) + 1
    }
  })
  const topErros = Object.entries(errosPorTema).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="subtitle">Visão geral do seu desempenho</p>
        </div>
        <button className="btn btn-primary" onClick={gerarInsights} disabled={loadingIA || totalSims === 0}>
          <Brain size={16} /> {loadingIA ? 'Analisando...' : 'Insights IA'}
        </button>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-cyan-dim)' }}><Award size={22} color="var(--accent-cyan)" /></div>
            <div className="stat-value">{totalSims}</div>
            <div className="stat-label">Simulados Realizados</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: mediaGeral >= 60 ? 'var(--success-dim)' : 'var(--error-dim)' }}>
              <Target size={22} color={mediaGeral >= 60 ? 'var(--success)' : 'var(--error)'} />
            </div>
            <div className="stat-value" style={{ color: mediaGeral >= 60 ? 'var(--success)' : 'var(--error)' }}>{mediaGeral.toFixed(1)}%</div>
            <div className="stat-label">Média Geral</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-violet-dim)' }}><Clock size={22} color="var(--accent-violet)" /></div>
            <div className="stat-value">{Math.round(tempoTotal / 3600)}h</div>
            <div className="stat-label">Tempo Total de Estudo</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--warning-dim)' }}><BookOpen size={22} color="var(--warning)" /></div>
            <div className="stat-value">{totalQuestoes}</div>
            <div className="stat-label">Questões no Banco</div>
          </div>
        </div>

        {totalSims > 0 && (
          <>
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>📈 Evolução de Notas</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dadosEvolucao}>
                    <CartesianGrid stroke="var(--border-color)" />
                    <XAxis dataKey="nome" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="nota" stroke="var(--accent-cyan)" strokeWidth={2} dot={{ fill: 'var(--accent-cyan)', r: 4 }} name="Nota (%)" />
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
                    <Bar dataKey="tempo" fill="var(--accent-violet)" radius={[4, 4, 0, 0]} name="Tempo (min)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>🎯 Tempo vs Desempenho</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart>
                    <CartesianGrid stroke="var(--border-color)" />
                    <XAxis dataKey="tempo" name="Tempo (min)" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis dataKey="nota" name="Nota (%)" stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                    <Scatter data={dadosDispersao} fill="var(--accent-cyan)" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>🔴 Conteúdos com Mais Erros</h3>
                {topErros.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {topErros.map(([tema, count], i) => (
                      <div key={i} className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.85rem' }}>{tema}</span>
                        <span className="badge badge-error">{count} erros</span>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color: 'var(--text-muted)' }}>Nenhum erro registrado ainda.</p>}
              </div>
            </div>
          </>
        )}

        {/* Insights IA */}
        {insights && (
          <div className="card slide-up" style={{ borderLeft: '4px solid var(--accent-violet)' }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>🧠 Insights da IA</h3>
            <div className="grid-2">
              <div>
                {insights.pontos_fracos?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: 'var(--error)', fontSize: '0.9rem' }}>⚠️ Pontos Fracos</strong>
                    <ul style={{ paddingLeft: 16, marginTop: 6 }}>{insights.pontos_fracos.map((p, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{p}</li>)}</ul>
                  </div>
                )}
                {insights.tendencia && (
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>📊 Tendência</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{insights.tendencia}</p>
                  </div>
                )}
              </div>
              <div>
                {insights.prioridades?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>🎯 Prioridades de Estudo</strong>
                    <ul style={{ paddingLeft: 16, marginTop: 6 }}>{insights.prioridades.map((p, i) => <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{p}</li>)}</ul>
                  </div>
                )}
                {insights.velocidade_vs_precisao && (
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: 'var(--accent-violet)', fontSize: '0.9rem' }}>⚡ Velocidade vs Precisão</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>{insights.velocidade_vs_precisao}</p>
                  </div>
                )}
              </div>
            </div>
            {insights.dica_do_dia && (
              <div style={{ padding: 16, background: 'var(--success-dim)', borderRadius: 8, marginTop: 8 }}>
                <strong style={{ color: 'var(--success)' }}>💡 Dica do Dia: </strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{insights.dica_do_dia}</span>
              </div>
            )}
          </div>
        )}

        {totalSims === 0 && (
          <div className="empty-state">
            <TrendingUp size={48} />
            <h3>Comece a estudar!</h3>
            <p>Crie matérias, adicione questões e faça simulados para ver seu progresso aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}
