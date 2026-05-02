import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, BookOpen, X } from 'lucide-react'

const CORES = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#14b8a6','#f97316','#6366f1']

export default function GerenciarMaterias() {
  const toast = useToast()
  const [materias, setMaterias] = useState([])
  const [subtemas, setSubtemas] = useState({})
  const [expandida, setExpandida] = useState(null)
  const [modal, setModal] = useState(null) // { tipo: 'materia'|'subtema', dados?, materiaId? }
  const [form, setForm] = useState({ nome: '', descricao: '', cor: '#06b6d4' })
  const [subForm, setSubForm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: m } = await supabase.from('materias').select('*').order('nome')
    setMaterias(m || [])
    const { data: s } = await supabase.from('subtemas').select('*').order('nome')
    const agrupados = {}
    ;(s || []).forEach(sub => {
      if (!agrupados[sub.materia_id]) agrupados[sub.materia_id] = []
      agrupados[sub.materia_id].push(sub)
    })
    setSubtemas(agrupados)
    setLoading(false)
  }

  async function salvarMateria(e) {
    e.preventDefault()
    if (!form.nome.trim()) return toast('Preencha o nome da matéria', 'error')
    if (modal.dados) {
      await supabase.from('materias').update({ nome: form.nome, descricao: form.descricao, cor: form.cor }).eq('id', modal.dados.id)
      toast('Matéria atualizada!', 'success')
    } else {
      await supabase.from('materias').insert({ nome: form.nome, descricao: form.descricao, cor: form.cor })
      toast('Matéria criada!', 'success')
    }
    setModal(null)
    carregar()
  }

  async function excluirMateria(id) {
    if (!confirm('Excluir esta matéria e todos seus dados?')) return
    await supabase.from('materias').delete().eq('id', id)
    toast('Matéria excluída', 'info')
    carregar()
  }

  async function adicionarSubtema(materiaId) {
    if (!subForm.trim()) return
    await supabase.from('subtemas').insert({ materia_id: materiaId, nome: subForm.trim() })
    setSubForm('')
    toast('Subtema adicionado!', 'success')
    carregar()
  }

  async function excluirSubtema(id) {
    await supabase.from('subtemas').delete().eq('id', id)
    toast('Subtema excluído', 'info')
    carregar()
  }

  function abrirEditar(materia) {
    setForm({ nome: materia.nome, descricao: materia.descricao || '', cor: materia.cor || '#06b6d4' })
    setModal({ tipo: 'materia', dados: materia })
  }

  function abrirNova() {
    setForm({ nome: '', descricao: '', cor: '#06b6d4' })
    setModal({ tipo: 'materia' })
  }

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Gerenciar Matérias</h2>
          <p className="subtitle">Organize suas matérias e subtemas</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNova}><Plus size={18} /> Nova Matéria</button>
      </div>

      <div className="page-body">
        {materias.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <h3>Nenhuma matéria cadastrada</h3>
            <p>Crie sua primeira matéria para começar a organizar seus estudos.</p>
            <button className="btn btn-primary" onClick={abrirNova}><Plus size={18} /> Criar Matéria</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {materias.map(m => (
              <div key={m.id} className="card" style={{ borderLeft: `4px solid ${m.cor}` }}>
                <div className="flex-between">
                  <div className="flex-row" style={{ cursor: 'pointer' }} onClick={() => setExpandida(expandida === m.id ? null : m.id)}>
                    {expandida === m.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <div className="color-dot" style={{ background: m.cor }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{m.nome}</div>
                      {m.descricao && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.descricao}</div>}
                    </div>
                    <span className="badge badge-cyan" style={{ marginLeft: 12 }}>
                      {(subtemas[m.id] || []).length} subtemas
                    </span>
                  </div>
                  <div className="flex-row gap-8">
                    <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(m)}><Edit3 size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => excluirMateria(m.id)}><Trash2 size={14} /></button>
                  </div>
                </div>

                {expandida === m.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }} className="slide-up">
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>SUBTEMAS</div>
                    {(subtemas[m.id] || []).map(s => (
                      <div key={s.id} className="flex-between" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: '0.9rem' }}>{s.nome}</span>
                        <button className="btn btn-danger btn-sm" onClick={() => excluirSubtema(s.id)}><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <div className="flex-row" style={{ marginTop: 8 }}>
                      <input className="form-input" placeholder="Nome do subtema..." value={subForm} onChange={e => setSubForm(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarSubtema(m.id)} style={{ flex: 1 }} />
                      <button className="btn btn-success btn-sm" onClick={() => adicionarSubtema(m.id)}><Plus size={14} /> Adicionar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal.dados ? 'Editar Matéria' : 'Nova Matéria'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={salvarMateria}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input className="form-input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Ex: Imunologia" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição (opcional)</label>
                <textarea className="form-textarea" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Breve descrição da matéria..." rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Cor</label>
                <div className="flex-row flex-wrap gap-8">
                  {CORES.map(c => (
                    <div key={c} onClick={() => setForm({...form, cor: c})} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer', border: form.cor === c ? '3px solid white' : '3px solid transparent', transition: 'var(--transition)' }} />
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{modal.dados ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
