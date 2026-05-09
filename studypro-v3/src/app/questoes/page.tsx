'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Filter, Plus, ChevronDown, Edit3, Trash2, Eye, Search, X, Upload, FileText, Sparkles, Brain, BookOpen, Layers } from 'lucide-react'
import { sugerirMelhoriaQuestao, extrairQuestoesDePDF, gerarGabaritoIA } from '@/services/iaService'
import { extrairTextoPDF } from '@/services/pdfService'
import { uploadImagemQuestao } from '@/services/storageService'

interface QuestaoData {
  id: string; 
  tipo: 'objetiva' | 'discursiva'; 
  enunciado: string; 
  materia_id: string; 
  subtema_id?: string;
  dificuldade: 'facil' | 'medio' | 'dificil'; 
  alternativas?: { letra: string; texto: string }[]; 
  gabarito?: string;
  peso?: number; 
  tags?: string[]; 
  explicacao?: string; 
  imagem_url?: string;
  subitens?: { letra: string; texto: string; gabarito?: string; criterios?: string }[]
}

export default function QuestoesPage() {
  const toast = useToast()
  const [questoes, setQuestoes] = useState<QuestaoData[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string; cor?: string }[]>([])
  const [subtemas, setSubtemas] = useState<{ id: string; materia_id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMateria, setFiltroMateria] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDificuldade, setFiltroDificuldade] = useState('')
  const [busca, setBusca] = useState('')

  // Novos estados para Modais e Formulário
  const [modal, setModal] = useState<'nova' | 'editar' | null>(null)
  const [modalImport, setModalImport] = useState(false)
  const [importando, setImportando] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [gerandoGab, setGerandoGab] = useState(false)
  const [sugestaoIA, setSugestaoIA] = useState({ loading: false, texto: '', questaoId: null as string | null })

  const [form, setForm] = useState<Partial<QuestaoData>>({
    tipo: 'objetiva', materia_id: '', subtema_id: '', enunciado: '', dificuldade: 'medio', peso: 1,
    tags: [], alternativas: [
      { letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }
    ],
    gabarito: '', explicacao: '', imagem_url: '', 
    subitens: [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
  })
  const [imagemFile, setImagemFile] = useState<File | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: q }, { data: m }, { data: s }] = await Promise.all([
      supabase.from('questoes').select('*').order('criado_em', { ascending: false }),
      supabase.from('materias').select('id, nome, cor'),
      supabase.from('subtemas').select('id, materia_id, nome'),
    ])
    setQuestoes(q || [])
    setMaterias(m || [])
    setSubtemas(s || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  let filtered = questoes
  if (filtroMateria) filtered = filtered.filter(q => q.materia_id === filtroMateria)
  if (filtroTipo) filtered = filtered.filter(q => q.tipo === filtroTipo)
  if (filtroDificuldade) filtered = filtered.filter(q => q.dificuldade === filtroDificuldade)
  if (busca) filtered = filtered.filter(q => q.enunciado.toLowerCase().includes(busca.toLowerCase()))

  async function excluir(id: string) {
    if (!confirm('Excluir esta questão?')) return
    await supabase.from('questoes').delete().eq('id', id)
    toast('Questão excluída.', 'info')
    carregar()
  }

  function abrirNova() {
    setForm({
      tipo: 'objetiva', materia_id: materias[0]?.id || '', subtema_id: '', enunciado: '', dificuldade: 'medio', peso: 1,
      tags: [], alternativas: [
        { letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }
      ],
      gabarito: '', explicacao: '', imagem_url: '',
      subitens: [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
    })
    setImagemFile(null)
    setModal('nova')
  }

  function abrirEditar(q: QuestaoData) {
    setForm({
      id: q.id, tipo: q.tipo, materia_id: q.materia_id, subtema_id: q.subtema_id || '',
      enunciado: q.enunciado, dificuldade: q.dificuldade, peso: q.peso || 1,
      tags: q.tags || [],
      alternativas: q.alternativas || [{ letra: 'A', texto: '' },{ letra: 'B', texto: '' },{ letra: 'C', texto: '' },{ letra: 'D', texto: '' },{ letra: 'E', texto: '' }],
      gabarito: q.gabarito || '', explicacao: q.explicacao || '', imagem_url: q.imagem_url || '',
      subitens: q.subitens || [{ letra: 'a', texto: '', gabarito: '', criterios: '' }]
    })
    setImagemFile(null)
    setModal('editar')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.enunciado?.trim() || !form.materia_id) return toast('Preencha enunciado e matéria', 'error')

    let urlImagem = form.imagem_url;
    if (imagemFile) {
      try {
        toast('Fazendo upload da imagem...', 'info')
        const uploaded = await uploadImagemQuestao(imagemFile)
        if (uploaded) urlImagem = uploaded
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

  function adicionarSubitem() {
    const letra = String.fromCharCode(97 + (form.subitens?.length || 0))
    setForm({ ...form, subitens: [...(form.subitens || []), { letra, texto: '', gabarito: '', criterios: '' }] })
  }

  function removerSubitem(idx: number) {
    const novos = (form.subitens || []).filter((_, i) => i !== idx).map((s, i) => ({ ...s, letra: String.fromCharCode(97 + i) }))
    setForm({ ...form, subitens: novos })
  }

  function toggleTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags?.includes(tag) ? f.tags.filter(t => t !== tag) : [...(f.tags || []), tag] }))
  }

  async function pedirSugestaoIA(q: QuestaoData) {
    setSugestaoIA({ loading: true, texto: '', questaoId: q.id })
    try {
      const texto = await sugerirMelhoriaQuestao(q)
      setSugestaoIA({ loading: false, texto, questaoId: q.id })
    } catch {
      setSugestaoIA({ loading: false, texto: 'Erro ao obter sugestão.', questaoId: q.id })
    }
  }

  async function importarPDF(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function salvarQuestoesImportadas(materiaId: string) {
    if (!materiaId || !importResult?.questoes?.length) return
    let count = 0
    let duplicados = 0
    
    toast('Importando questões...', 'info')
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
          subtemaId = (novoSub as any).id
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
      toast(`${count} novas questões importadas. ${duplicados} duplicatas ignoradas.`, 'info')
    } else {
      toast(`${count} questões importadas com sucesso!`, 'success')
    }

    setModalImport(false)
    setImportResult(null)
    carregar()
  }

  async function gerarGabarito() {
    if (!form.enunciado?.trim()) return toast('Preencha o enunciado primeiro', 'error')
    setGerandoGab(true)
    try {
      const result = await gerarGabaritoIA(form)
      if (form.tipo === 'objetiva') {
        setForm(f => ({ ...f, gabarito: (result as any).gabarito || f.gabarito, explicacao: (result as any).explicacao || f.explicacao }))
      } else {
        const novos = (form.subitens || []).map((s, i) => {
          const r = (result as any).subitens?.find((x: any) => x.letra === s.letra) || (result as any).subitens?.[i]
          return r ? { ...s, gabarito: r.gabarito || s.gabarito, criterios: r.criterios || s.criterios } : s
        })
        setForm(f => ({ ...f, subitens: novos, explicacao: (result as any).explicacao || f.explicacao }))
      }
      toast('Gabarito gerado pela IA!', 'success')
    } catch { toast('Erro ao gerar gabarito', 'error') }
    setGerandoGab(false)
  }

  const difColors = {
    facil: 'bg-emerald-500/10 text-emerald-400',
    medio: 'bg-amber-500/10 text-amber-400',
    dificil: 'bg-red-500/10 text-red-400',
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Banco de Questões</h2>
          <p className="text-slate-500 text-sm mt-0.5">{questoes.length} questões cadastradas</p>
        </div>
        <div className="flex gap-3">
          <label className="btn-premium bg-gradient-to-r from-slate-700 to-slate-800 border border-white/10 cursor-pointer !shadow-none hover:bg-slate-700">
            <Upload size={16} /> {importando ? 'Processando...' : 'Importar PDF'}
            <input type="file" accept=".pdf" className="hidden" onChange={importarPDF} disabled={importando} />
          </label>
          <button onClick={abrirNova} className="btn-premium"><Plus size={16} /> Nova Questão</button>
        </div>
      </div>

      <div className="page-body space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-[350px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input placeholder="Buscar por enunciado..." value={busca} onChange={e => setBusca(e.target.value)} className="input-dark pl-10" />
          </div>
          <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} className="select-dark max-w-[200px]">
            <option value="">Todas as matérias</option>
            {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="select-dark max-w-[150px]">
            <option value="">Tipo</option>
            <option value="objetiva">Objetiva</option>
            <option value="discursiva">Discursiva</option>
          </select>
          <select value={filtroDificuldade} onChange={e => setFiltroDificuldade(e.target.value)} className="select-dark max-w-[150px]">
            <option value="">Dificuldade</option>
            <option value="facil">Fácil</option>
            <option value="medio">Médio</option>
            <option value="dificil">Difícil</option>
          </select>
        </div>

        <p className="text-xs text-slate-600">{filtered.length} resultados</p>

        {/* Questions list */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Database size={48} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-500">Nenhuma questão encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q, i) => {
              const mat = materias.find(m => m.id === q.materia_id)
              const sub = subtemas.find(s => s.id === q.subtema_id)
              return (
                <motion.div
                  key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="glass-card p-4 flex flex-col gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-400">
                      {q.tipo === 'objetiva' ? 'OBJ' : 'DIS'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed">{q.enunciado}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mat && (
                          <span className="badge-sm" style={{ backgroundColor: `${mat.cor || '#06b6d4'}15`, color: mat.cor || '#06b6d4' }}>
                            {mat.nome}
                          </span>
                        )}
                        {sub && <span className="badge-sm bg-white/[0.04] text-slate-400">{sub.nome}</span>}
                        <span className={`badge-sm ${difColors[q.dificuldade as keyof typeof difColors] || ''}`}>{q.dificuldade}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => pedirSugestaoIA(q)} className="p-1.5 rounded-lg hover:bg-violet-500/10 text-slate-600 hover:text-violet-400 transition-colors" title="Insight da IA">
                        <Sparkles size={14} />
                      </button>
                      <button onClick={() => abrirEditar(q)} className="p-1.5 rounded-lg hover:bg-cyan-500/10 text-slate-600 hover:text-cyan-400 transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => excluir(q.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {sugestaoIA.questaoId === q.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs">
                          <Brain size={14} /> Insight da Inteligência Artificial
                        </div>
                        <button onClick={() => setSugestaoIA({ ...sugestaoIA, questaoId: null })} className="text-slate-500 hover:text-slate-300">
                          <X size={14} />
                        </button>
                      </div>
                      {sugestaoIA.loading ? (
                        <div className="flex items-center gap-3 py-2 text-xs text-slate-500">
                          <div className="w-3 h-3 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                          Analisando pedagogicamente...
                        </div>
                      ) : (
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{sugestaoIA.texto}</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      <AnimatePresence>
        {modal && (
          <div className="modal-overlay" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal modal-xl" onClick={e => e.stopPropagation()}>
              <form onSubmit={salvar} className="flex flex-col h-full">
                <div className="modal-header">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      {modal === 'editar' ? <Edit3 size={20} className="text-cyan-400" /> : <Plus size={20} className="text-cyan-400" />}
                    </div>
                    <h3>{modal === 'editar' ? 'Editar Questão' : 'Criar Nova Questão'}</h3>
                  </div>
                  <button type="button" className="p-2 rounded-full hover:bg-white/5 text-slate-500 transition-colors" onClick={() => setModal(null)}><X size={20} /></button>
                </div>
                
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Tipo de Questão</label>
                      <select className="form-select" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value as 'objetiva' | 'discursiva'})}>
                        <option value="objetiva">Objetiva (Múltipla Escolha)</option>
                        <option value="discursiva">Discursiva (Resposta Aberta)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dificuldade</label>
                      <select className="form-select" value={form.dificuldade} onChange={e => setForm({...form, dificuldade: e.target.value as 'facil' | 'medio' | 'dificil'})}>
                        <option value="facil">Fácil</option>
                        <option value="medio">Médio</option>
                        <option value="dificil">Difícil</option>
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
                      <label className="form-label">Subtema</label>
                      <select className="form-select" value={form.subtema_id} onChange={e => setForm({...form, subtema_id: e.target.value})}>
                        <option value="">Nenhum (Geral)</option>
                        {subtemas.filter(s => s.materia_id === form.materia_id).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Enunciado *</label>
                    <textarea className="form-textarea" value={form.enunciado} onChange={e => setForm({...form, enunciado: e.target.value})} placeholder="Descreva a pergunta..." />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Imagem de Suporte (Opcional)</label>
                    <div className="relative border-2 border-dashed border-white/10 rounded-xl p-4 text-center bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                      {(form.imagem_url || imagemFile) ? (
                        <div className="relative inline-block">
                          <img src={imagemFile ? URL.createObjectURL(imagemFile) : form.imagem_url} alt="Preview" className="max-h-48 rounded-lg" />
                          <button type="button" className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors" onClick={() => { setForm({...form, imagem_url: ''}); setImagemFile(null); }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Upload size={24} className="mx-auto text-slate-600 mb-2" />
                          <p className="text-xs text-slate-500 font-medium">Clique ou arraste uma imagem</p>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setImagemFile(e.target.files?.[0] || null)} />
                        </div>
                      )}
                    </div>
                  </div>

                  {form.tipo === 'objetiva' ? (
                    <div className="space-y-3 mt-6">
                      <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2"><Layers size={16} className="text-cyan-400" /> Alternativas</h4>
                      {form.alternativas?.map((alt, i) => (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${form.gabarito === alt.letra ? 'bg-emerald-500/5 border-emerald-500/30' : 'border-transparent'}`}>
                          <button type="button" onClick={() => setForm({...form, gabarito: alt.letra})} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${form.gabarito === alt.letra ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-white/5 hover:border-white/10'}`}>
                            {alt.letra}
                          </button>
                          <input className="bg-transparent border-none focus:ring-0 text-sm text-slate-300 flex-1" value={alt.texto} onChange={e => { const a = [...(form.alternativas || [])]; a[i] = {...a[i], texto: e.target.value}; setForm({...form, alternativas: a}) }} placeholder={`Alternativa ${alt.letra}...`} />
                        </div>
                      ))}
                      <div className="form-group mt-4">
                        <label className="form-label">Explicação / Resolução</label>
                        <textarea className="form-textarea" value={form.explicacao} onChange={e => setForm({...form, explicacao: e.target.value})} rows={3} placeholder="Por que esta alternativa é a correta?" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 mt-6">
                      <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2"><Edit3 size={16} className="text-violet-400" /> Subitens</h4>
                      {form.subitens?.map((sub, i) => (
                        <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">{sub.letra}</span>
                            <button type="button" onClick={() => removerSubitem(i)} className="text-red-400/50 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                          </div>
                          <input className="input-dark bg-white/[0.04]" value={sub.texto} onChange={e => { const s = [...(form.subitens || [])]; s[i] = {...s[i], texto: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Pergunta do item..." />
                          <div className="grid-2">
                            <textarea className="form-textarea text-xs h-20" value={sub.gabarito} onChange={e => { const s = [...(form.subitens || [])]; s[i] = {...s[i], gabarito: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Gabarito esperado..." />
                            <textarea className="form-textarea text-xs h-20" value={sub.criterios} onChange={e => { const s = [...(form.subitens || [])]; s[i] = {...s[i], criterios: e.target.value}; setForm({...form, subitens: s}) }} placeholder="Critérios de correção..." />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={adicionarSubitem} className="w-full py-2 border border-dashed border-white/10 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.02] transition-all">
                        + Adicionar Item
                      </button>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200" onClick={() => setModal(null)}>Cancelar</button>
                  <div className="flex-1" />
                  <button type="button" onClick={gerarGabarito} disabled={gerandoGab} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-violet-400 border border-violet-500/20 hover:bg-violet-500/5 transition-all disabled:opacity-50">
                    {gerandoGab ? <div className="w-3 h-3 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /> : <Brain size={14} />}
                    Gerar Gabarito IA
                  </button>
                  <button type="submit" className="btn-premium">
                    {modal === 'editar' ? 'Salvar Alterações' : 'Criar Questão'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Importar */}
      <AnimatePresence>
        {modalImport && importResult && (
          <div className="modal-overlay" onClick={() => setModalImport(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal modal-xl" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <FileText size={20} className="text-cyan-400" />
                  </div>
                  <h3>Questões Detectadas no PDF</h3>
                </div>
                <button onClick={() => setModalImport(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-500 transition-colors"><X size={20} /></button>
              </div>
              
              <div className="modal-body space-y-5">
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                    <Sparkles size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{importResult.total_encontradas} questões identificadas</p>
                    <p className="text-xs text-slate-500">{importResult.observacoes}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {importResult.questoes?.map((q: any, i: number) => (
                    <div key={i} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="badge-sm bg-cyan-500/10 text-cyan-400 font-bold">{q.tipo}</span>
                        <span className="badge-sm bg-slate-800 text-slate-400">{q.dificuldade}</span>
                        {q.subtema && <span className="badge-sm bg-violet-500/10 text-violet-400">{q.subtema}</span>}
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{q.enunciado}</p>
                    </div>
                  ))}
                </div>

                <div className="form-group pt-4 border-t border-white/[0.06]">
                  <label className="form-label mb-2 block">Destinar para a matéria:</label>
                  <select id="import-materia-select" className="form-select bg-white/[0.04]">
                    <option value="">Selecione a disciplina de destino...</option>
                    {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-footer bg-white/[0.02]">
                <button onClick={() => setModalImport(false)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200">Cancelar</button>
                <div className="flex-1" />
                <button onClick={() => {
                  const sel = document.getElementById('import-materia-select') as HTMLSelectElement;
                  if (!sel.value) return toast('Selecione uma matéria', 'error');
                  salvarQuestoesImportadas(sel.value);
                }} className="btn-premium">
                  Importar {importResult.total_encontradas} Questões
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
