import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Award, Clock, CheckCircle, XCircle, AlertTriangle, Zap, ArrowLeft, Brain } from 'lucide-react'

export default function ResultadoSimulado() {
  const { id } = useParams()
  const [simulado, setSimulado] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [questoes, setQuestoes] = useState([])
  const [analise, setAnalise] = useState(null)
  const [materia, setMateria] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: sim } = await supabase.from('simulados').select('*').eq('id', id).single()
    const { data: resp } = await supabase.from('respostas_simulado').select('*').eq('simulado_id', id).order('ordem')
    const qIds = sim?.questao_ids || []
    const { data: qs } = await supabase.from('questoes').select('*').in('id', qIds)
    const { data: an } = await supabase.from('analises_simulado').select('*').eq('simulado_id', id).order('criado_em', { ascending: false }).limit(1)
    const { data: mat } = await supabase.from('materias').select('*').eq('id', sim?.materia_id).single()

    const qOrdenadas = qIds.map(qid => qs?.find(q => q.id === qid)).filter(Boolean)
    setSimulado(sim)
    setRespostas(resp || [])
    setQuestoes(qOrdenadas)
    setAnalise(an?.[0] || null)
    setMateria(mat)
    setLoading(false)
  }

  function formatTempo(seg) {
    if (!seg) return '—'
    const m = Math.floor(seg / 60), s = seg % 60
    return `${m}min ${s}s`
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando resultado...</p></div>
  if (!simulado) return null

  const percentual = simulado.nota_maxima > 0 ? (simulado.nota / simulado.nota_maxima * 100) : 0
  const acertos = respostas.filter(r => r.esta_correta).length
  const tempoMedio = respostas.length > 0 ? Math.round(respostas.reduce((a, r) => a + (r.tempo_gasto || 0), 0) / respostas.length) : 0

  const dadosGrafico = respostas.map((r, i) => ({
    name: `Q${i + 1}`,
    tempo: r.tempo_gasto || 0,
    correta: r.esta_correta
  }))

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="flex-row gap-16">
          <Link to="/simulados" className="btn btn-secondary btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h2>Resultado: {simulado.titulo}</h2>
            <p className="subtitle">{materia?.nome} • {new Date(simulado.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Cards de resumo */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: percentual >= 60 ? 'var(--success-dim)' : 'var(--error-dim)' }}>
              <Award size={22} color={percentual >= 60 ? 'var(--success)' : 'var(--error)'} />
            </div>
            <div className="stat-value" style={{ color: percentual >= 60 ? 'var(--success)' : 'var(--error)' }}>{percentual.toFixed(1)}%</div>
            <div className="stat-label">Nota: {simulado.nota?.toFixed(1)}/{simulado.nota_maxima?.toFixed(1)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-cyan-dim)' }}><CheckCircle size={22} color="var(--accent-cyan)" /></div>
            <div className="stat-value">{acertos}/{respostas.length}</div>
            <div className="stat-label">Acertos</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--accent-violet-dim)' }}><Clock size={22} color="var(--accent-violet)" /></div>
            <div className="stat-value">{formatTempo(simulado.tempo_total)}</div>
            <div className="stat-label">Tempo Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--warning-dim)' }}><Zap size={22} color="var(--warning)" /></div>
            <div className="stat-value">{tempoMedio}s</div>
            <div className="stat-label">Tempo Médio/Questão</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Gráfico de tempo */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>⏱️ Tempo por Questão</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dadosGrafico}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8 }} />
                <Bar dataKey="tempo" radius={[4, 4, 0, 0]}>
                  {dadosGrafico.map((d, i) => (
                    <Cell key={i} fill={d.correta ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Análise IA */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>🧠 Análise da IA</h3>
            {analise ? (
              <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
                {(analise.pontos_fracos || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ color: 'var(--error)' }}>Pontos Fracos:</strong>
                    <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                      {analise.pontos_fracos.map((p, i) => <li key={i} style={{ color: 'var(--text-secondary)' }}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {(analise.recomendacoes || []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <strong style={{ color: 'var(--success)' }}>Recomendações:</strong>
                    <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                      {analise.recomendacoes.map((r, i) => <li key={i} style={{ color: 'var(--text-secondary)' }}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {analise.analise_tempo_desempenho && (
                  <div><strong style={{ color: 'var(--accent-cyan)' }}>Tempo vs Desempenho:</strong> <span style={{ color: 'var(--text-secondary)' }}>{analise.analise_tempo_desempenho}</span></div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Análise não disponível.</p>
            )}
          </div>
        </div>

        {/* Correção detalhada */}
        <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>📋 Correção Detalhada</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questoes.map((q, i) => {
            const r = respostas.find(r => r.questao_id === q.id)
            if (!r) return null
            return (
              <div key={q.id} className="card" style={{ borderLeft: `4px solid ${r.esta_correta ? 'var(--success)' : 'var(--error)'}` }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div className="flex-row gap-8">
                    <span style={{ fontWeight: 700 }}>Questão {i + 1}</span>
                    {r.esta_correta ? <CheckCircle size={18} color="var(--success)" /> : <XCircle size={18} color="var(--error)" />}
                    <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`}>{q.tipo}</span>
                    {r.analise_tempo === 'rapido_demais' && <span className="badge badge-warning">⚡ Rápido demais</span>}
                    {r.analise_tempo === 'lento' && <span className="badge badge-error">🐌 Lento</span>}
                  </div>
                  <div className="flex-row gap-8" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Nota: {r.nota?.toFixed(1)}/{r.nota_maxima?.toFixed(1)}</span>
                    <span>• {r.tempo_gasto || 0}s</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {q.enunciado.length > 200 ? q.enunciado.slice(0, 200) + '...' : q.enunciado}
                </p>

                {q.imagem_url && (
                  <div style={{ marginBottom: 16 }}>
                    <img src={q.imagem_url} alt="Imagem da questão" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                  </div>
                )}

                {q.tipo === 'objetiva' ? (
                  <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.85rem' }}>
                    <div className="flex-row gap-8">
                      <span>Sua resposta: <strong style={{ color: r.esta_correta ? 'var(--success)' : 'var(--error)' }}>{r.resposta_objetiva || '—'}</strong></span>
                      {!r.esta_correta && <span>• Gabarito: <strong style={{ color: 'var(--success)' }}>{q.gabarito}</strong></span>}
                    </div>
                    {r.feedback_ia && <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{r.feedback_ia}</p>}
                  </div>
                ) : r.correcao_ia ? (
                  <div>
                    {(!r.correcao_ia.subitens || r.correcao_ia.subitens.length === 0) ? (
                      <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 8, fontSize: '0.85rem' }}>
                         <p style={{ color: 'var(--text-secondary)' }}>{r.correcao_ia.feedback_geral || 'Nenhum feedback detalhado retornado pela IA.'}</p>
                      </div>
                    ) : (
                      (r.correcao_ia.subitens || []).map((sub, j) => (
                        <div key={j} style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 8, fontSize: '0.85rem' }}>
                          <div className="flex-between" style={{ marginBottom: 4 }}>
                            <strong style={{ color: 'var(--accent-cyan)' }}>{sub.letra})</strong>
                            <span style={{ fontWeight: 700, color: sub.nota >= 6 ? 'var(--success)' : 'var(--error)' }}>{sub.nota}/10</span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)' }}>{sub.feedback}</p>
                          <div className="flex-row gap-8" style={{ marginTop: 6 }}>
                            {sub.correcao_conceitual && <span className="badge badge-success">✓ Conceito</span>}
                            {sub.clareza && <span className="badge badge-success">✓ Clareza</span>}
                            {sub.completude && <span className="badge badge-success">✓ Completude</span>}
                            {!sub.correcao_conceitual && <span className="badge badge-error">✗ Conceito</span>}
                            {!sub.clareza && <span className="badge badge-error">✗ Clareza</span>}
                            {!sub.completude && <span className="badge badge-error">✗ Completude</span>}
                          </div>
                        </div>
                      ))
                    )}
                    {r.correcao_ia.feedback_geral && r.correcao_ia.subitens?.length > 0 && (
                      <div style={{ padding: 12, background: 'var(--accent-violet-dim)', borderRadius: 8, fontSize: '0.85rem', marginTop: 8 }}>
                        <strong style={{ color: 'var(--accent-violet)' }}>Feedback Geral: </strong>
                        <span style={{ color: 'var(--text-secondary)' }}>{r.correcao_ia.feedback_geral}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.feedback_ia || 'Sem feedback disponível.'}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
