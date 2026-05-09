'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/shared/Toast'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ClipboardList, Plus, Play, Eye, Clock, Award, Trash2 } from 'lucide-react'

interface SimuladoData {
  id: string; titulo: string; materia_id: string; status: string;
  nota?: number; nota_maxima?: number; tempo_total?: number; criado_em: string
}

export default function SimuladosPage() {
  const toast = useToast()
  const [simulados, setSimulados] = useState<SimuladoData[]>([])
  const [materias, setMaterias] = useState<{ id: string; nome: string; cor?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from('simulados').select('*').order('criado_em', { ascending: false }),
      supabase.from('materias').select('id, nome, cor'),
    ])
    setSimulados(s || [])
    setMaterias(m || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtered = filtro === 'todos' ? simulados : simulados.filter(s => s.status === filtro)

  async function excluir(id: string) {
    if (!confirm('Excluir este simulado e todas as respostas?')) return
    await supabase.from('respostas_simulado').delete().eq('simulado_id', id)
    await supabase.from('analises_simulado').delete().eq('simulado_id', id)
    await supabase.from('simulados').delete().eq('id', id)
    toast('Simulado excluído.', 'info')
    carregar()
  }

  const statusMap = {
    criado: { label: 'Criado', color: 'text-slate-400', bg: 'bg-slate-500/10' },
    em_andamento: { label: 'Em andamento', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    finalizado: { label: 'Finalizado', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Simulados</h2>
          <p className="text-slate-500 text-sm mt-0.5">{simulados.length} simulados</p>
        </div>
        <Link href="/simulados/criar" className="btn-premium"><Plus size={16} /> Novo Simulado</Link>
      </div>

      <div className="page-body space-y-5">
        <div className="flex gap-2">
          {['todos', 'criado', 'em_andamento', 'finalizado'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filtro === f ? 'bg-cyan-500/15 text-cyan-400' : 'bg-white/[0.03] text-slate-500 hover:text-slate-300'}`}
            >
              {f === 'todos' ? 'Todos' : statusMap[f as keyof typeof statusMap]?.label || f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={48} className="mx-auto text-slate-700 mb-3" />
            <h3 className="text-lg font-semibold text-slate-300">Nenhum simulado</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Crie simulados para testar seus conhecimentos.</p>
            <Link href="/simulados/criar" className="btn-premium"><Plus size={16} /> Criar Simulado</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((s, i) => {
              const mat = materias.find(m => m.id === s.materia_id)
              const st = statusMap[s.status as keyof typeof statusMap] || statusMap.criado
              const pct = s.nota_maxima ? (s.nota! / s.nota_maxima * 100).toFixed(1) : null
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="glass-card p-5 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge-sm ${st.bg} ${st.color}`}>{st.label}</span>
                    <span className="text-[0.6rem] text-slate-600">{new Date(s.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <h3 className="font-bold text-slate-200 mb-2">{s.titulo}</h3>
                  {mat && <span className="badge-sm mb-3" style={{ backgroundColor: `${mat.cor}15`, color: mat.cor || '#06b6d4' }}>{mat.nome}</span>}
                  {s.status === 'finalizado' && pct && (
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Award size={14} className={parseFloat(pct) >= 60 ? 'text-emerald-400' : 'text-red-400'} />
                        <span className="font-bold text-slate-200">{pct}%</span>
                      </div>
                      {s.tempo_total && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Clock size={14} /> {Math.round(s.tempo_total / 60)} min
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    {s.status === 'criado' && <Link href={`/simulados/${s.id}/executar`} className="btn-premium text-xs py-2 px-3"><Play size={14} /> Iniciar</Link>}
                    {s.status === 'finalizado' && <Link href={`/simulados/${s.id}/resultado`} className="text-xs px-3 py-2 rounded-lg bg-white/[0.04] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"><Eye size={14} /> Resultado</Link>}
                    <button onClick={() => excluir(s.id)} className="ml-auto p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
