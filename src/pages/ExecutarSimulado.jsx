import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { corrigirDiscursiva, analisarDesempenho } from '../services/iaService'
import { Clock, ChevronLeft, ChevronRight, Send, EyeOff, Eye, AlertTriangle } from 'lucide-react'

export default function ExecutarSimulado() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [simulado, setSimulado] = useState(null)
  const [questoes, setQuestoes] = useState([])
  const [respostas, setRespostas] = useState([])
  const [atual, setAtual] = useState(0)
  const [tempoTotal, setTempoTotal] = useState(0)
  const [temposQuestao, setTemposQuestao] = useState({})
  const [cronVisivel, setCronVisivel] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)
  const questaoTimerRef = useRef(Date.now())
  const respostasRef = useRef({})

  useEffect(() => {
    carregar()
    return () => clearInterval(timerRef.current)
  }, [])

  async function carregar() {
    setLoading(true)
    const { data: sim } = await supabase.from('simulados').select('*').eq('id', id).single()
    if (!sim) { navigate('/simulados'); return }

    const { data: resp } = await supabase.from('respostas_simulado').select('*').eq('simulado_id', id).order('ordem')
    const qIds = sim.questao_ids || []
    const { data: qs } = await supabase.from('questoes').select('*').in('id', qIds)
    // Ordenar questões pela ordem do simulado
    const qOrdenadas = qIds.map(qid => qs.find(q => q.id === qid)).filter(Boolean)

    setSimulado(sim)
    setQuestoes(qOrdenadas)
    setRespostas(resp || [])
    setCronVisivel(sim.cronometro_visivel)
    setTempoTotal(sim.tempo_total || 0)

    // Inicializar respostas locais
    const rLocal = {}
    ;(resp || []).forEach(r => {
      rLocal[r.questao_id] = {
        objetiva: r.resposta_objetiva || '',
        discursivas: r.respostas_discursivas || []
      }
    })
    respostasRef.current = rLocal

    // Atualizar status
    if (sim.status === 'criado') {
      await supabase.from('simulados').update({ status: 'em_andamento', iniciado_em: new Date().toISOString() }).eq('id', id)
    }

    // Iniciar timer
    timerRef.current = setInterval(() => setTempoTotal(t => t + 1), 1000)
    questaoTimerRef.current = Date.now()
    setLoading(false)
  }

  function formatTempo(seg) {
    const h = Math.floor(seg / 3600)
    const m = Math.floor((seg % 3600) / 60)
    const s = seg % 60
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function salvarTempoQuestao() {
    const qid = questoes[atual]?.id
    if (qid) {
      const elapsed = Math.round((Date.now() - questaoTimerRef.current) / 1000)
      setTemposQuestao(prev => ({ ...prev, [qid]: (prev[qid] || 0) + elapsed }))
    }
    questaoTimerRef.current = Date.now()
  }

  function irPara(idx) {
    salvarTempoQuestao()
    setAtual(idx)
  }

  function setRespostaObjetiva(qid, letra) {
    respostasRef.current[qid] = { ...respostasRef.current[qid], objetiva: letra }
    setRespostas(r => [...r]) // force rerender
  }

  function setRespostaDiscursiva(qid, idx, texto) {
    const atual = respostasRef.current[qid]?.discursivas || []
    const novos = [...atual]
    novos[idx] = texto
    respostasRef.current[qid] = { ...respostasRef.current[qid], discursivas: novos }
    setRespostas(r => [...r])
  }

  async function enviarSimulado() {
    if (!confirm('Deseja finalizar e enviar o simulado?')) return
    salvarTempoQuestao()
    clearInterval(timerRef.current)
    setEnviando(true)
    toast('Corrigindo simulado... Isso pode levar alguns segundos.', 'info')

    try {
      let notaTotal = 0
      let notaMaxima = 0
      const materiaNome = (await supabase.from('materias').select('nome').eq('id', simulado.materia_id).single()).data?.nome || ''
      const dadosAnalise = []

      for (const q of questoes) {
        const resp = respostasRef.current[q.id] || {}
        const tempoQ = temposQuestao[q.id] || 0
        const pesoMax = (q.peso || 1) * 10
        notaMaxima += pesoMax
        let nota = 0, correta = false, correcaoIA = null, feedback = ''

        if (q.tipo === 'objetiva') {
          correta = resp.objetiva === q.gabarito
          nota = correta ? pesoMax : 0
          feedback = correta ? 'Resposta correta!' : `Incorreta. Gabarito: ${q.gabarito}. ${q.explicacao || ''}`
        } else {
          // Discursiva - correção por IA
          try {
            correcaoIA = await corrigirDiscursiva(q.enunciado, q.subitens || [], resp.discursivas || [])
            nota = (correcaoIA.nota_total || 0) / 10 * pesoMax
            feedback = correcaoIA.feedback_geral || ''
            correta = nota >= pesoMax * 0.6
          } catch {
            nota = 0
            feedback = 'Erro na correção automática.'
          }
        }

        notaTotal += nota
        let analiseTempo = 'normal'
        if (tempoQ < 15) analiseTempo = 'rapido_demais'
        else if (tempoQ > 180) analiseTempo = 'lento'

        const subtema = (await supabase.from('subtemas').select('nome').eq('id', q.subtema_id).single()).data?.nome || 'Geral'
        dadosAnalise.push({ tipo: q.tipo, correta, tempo: tempoQ, tema: subtema, tags: q.tags })

        await supabase.from('respostas_simulado').update({
          resposta_objetiva: resp.objetiva || '',
          respostas_discursivas: resp.discursivas || [],
          tempo_gasto: tempoQ,
          esta_correta: correta,
          nota, nota_maxima: pesoMax,
          correcao_ia: correcaoIA,
          feedback_ia: feedback,
          analise_tempo: analiseTempo
        }).eq('simulado_id', id).eq('questao_id', q.id)
      }

      await supabase.from('simulados').update({
        status: 'finalizado', finalizado_em: new Date().toISOString(),
        tempo_total: tempoTotal, nota: notaTotal, nota_maxima: notaMaxima
      }).eq('id', id)

      // Análise IA
      try {
        const analise = await analisarDesempenho({
          materia: materiaNome, nota: notaTotal, notaMaxima, tempoTotal, questoes: dadosAnalise
        })
        await supabase.from('analises_simulado').insert({
          simulado_id: id,
          user_id: user.id,
          pontos_fracos: analise.pontos_fracos || [],
          recomendacoes: analise.recomendacoes || [],
          analise_tempo_desempenho: analise.analise_tempo || '',
          tendencia: analise.tendencia || '',
          detalhes: analise
        })
      } catch { /* análise é opcional */ }

      toast('Simulado finalizado e corrigido!', 'success')
      navigate(`/simulados/${id}/resultado`)
    } catch (e) {
      toast('Erro: ' + e.message, 'error')
      setEnviando(false)
    }
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando simulado...</p></div>
  if (enviando) return <div className="loading-container"><div className="loading-spinner" /><p>Corrigindo com IA... Aguarde.</p></div>

  const q = questoes[atual]
  if (!q) return null
  const resp = respostasRef.current[q.id] || {}

  return (
    <div className="fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior */}
      <div style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex-row gap-16">
          <strong>{simulado.titulo}</strong>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Questão {atual + 1} de {questoes.length}</span>
        </div>
        <div className="flex-row gap-16">
          {cronVisivel ? (
            <div className="flex-row gap-8" style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              <Clock size={18} /> {formatTempo(tempoTotal)}
            </div>
          ) : null}
          <button className="btn btn-secondary btn-sm" onClick={() => setCronVisivel(!cronVisivel)}>
            {cronVisivel ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="btn btn-primary btn-sm" onClick={enviarSimulado}><Send size={14} /> Finalizar</button>
        </div>
      </div>

      {/* Progresso */}
      <div className="progress-bar" style={{ borderRadius: 0, height: 4 }}>
        <div className="progress-fill" style={{ width: `${((atual + 1) / questoes.length) * 100}%` }} />
      </div>

      {/* Navegação de questões */}
      <div style={{ padding: '8px 24px', background: 'var(--bg-tertiary)', display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'wrap' }}>
        {questoes.map((_, i) => {
          const qid = questoes[i].id
          const respondida = respostasRef.current[qid]?.objetiva || (respostasRef.current[qid]?.discursivas || []).some(d => d?.trim())
          return (
            <button key={i} onClick={() => irPara(i)} style={{
              width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
              background: i === atual ? 'var(--accent-cyan)' : respondida ? 'var(--success-dim)' : 'var(--bg-card)',
              color: i === atual ? 'white' : respondida ? 'var(--success)' : 'var(--text-secondary)',
              transition: 'var(--transition)'
            }}>{i + 1}</button>
          )
        })}
      </div>

      {/* Questão */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="flex-row gap-8" style={{ marginBottom: 16 }}>
            <span className={`badge ${q.tipo === 'objetiva' ? 'badge-cyan' : 'badge-violet'}`}>{q.tipo}</span>
            <span className={`badge ${q.dificuldade === 'facil' ? 'badge-success' : q.dificuldade === 'dificil' ? 'badge-error' : 'badge-warning'}`}>{q.dificuldade}</span>
            {q.peso > 1 && <span className="badge badge-warning">Peso {q.peso}</span>}
          </div>

          <div style={{ fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 28, whiteSpace: 'pre-wrap' }}>{q.enunciado}</div>

          {q.imagem_url && (
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <img src={q.imagem_url} alt="Imagem da questão" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 8, border: '1px solid var(--border-color)' }} />
            </div>
          )}

          {q.tipo === 'objetiva' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(q.alternativas || []).map(alt => (
                <div key={alt.letra} onClick={() => setRespostaObjetiva(q.id, alt.letra)} style={{
                  padding: '14px 18px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                  background: resp.objetiva === alt.letra ? 'var(--accent-cyan-dim)' : 'var(--bg-card)',
                  border: `2px solid ${resp.objetiva === alt.letra ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  transition: 'var(--transition)'
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: resp.objetiva === alt.letra ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                    color: resp.objetiva === alt.letra ? 'white' : 'var(--text-secondary)',
                    fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                  }}>{alt.letra}</div>
                  <span style={{ fontSize: '0.95rem' }}>{alt.texto}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(!q.subitens || q.subitens.length === 0) ? (
                <div style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 12 }}>Responda à questão:</p>
                  <textarea className="form-textarea" placeholder="Sua resposta..." value={(resp.discursivas || [])[0] || ''} onChange={e => setRespostaDiscursiva(q.id, 0, e.target.value)} rows={6} />
                </div>
              ) : (
                (q.subitens || []).map((sub, i) => (
                  <div key={i} style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 8, fontSize: '1rem' }}>{sub.letra})</div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{sub.texto}</p>
                    <textarea className="form-textarea" placeholder="Sua resposta..." value={(resp.discursivas || [])[i] || ''} onChange={e => setRespostaDiscursiva(q.id, i, e.target.value)} rows={4} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navegação inferior */}
      <div style={{ padding: '16px 32px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary" onClick={() => irPara(atual - 1)} disabled={atual === 0}><ChevronLeft size={18} /> Anterior</button>
        {atual === questoes.length - 1 ? (
          <button className="btn btn-primary" onClick={enviarSimulado}><Send size={18} /> Finalizar Simulado</button>
        ) : (
          <button className="btn btn-primary" onClick={() => irPara(atual + 1)}> Próxima <ChevronRight size={18} /></button>
        )}
      </div>
    </div>
  )
}
