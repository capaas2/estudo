'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GraduationCap, ChevronRight, Plus } from 'lucide-react'

const PERIOD_COLORS = [
  'from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600', 'from-rose-500 to-pink-600', 'from-indigo-500 to-blue-600',
  'from-teal-500 to-cyan-600', 'from-fuchsia-500 to-purple-600', 'from-lime-500 to-green-600',
  'from-orange-500 to-red-600', 'from-sky-500 to-indigo-600', 'from-pink-500 to-rose-600',
]

const PERIOD_SUBJECTS: Record<number, string[]> = {
  1: ['Anatomia Humana I', 'Genética e Embriologia', 'HAC I', 'Histologia', 'Homeostasia I', 'Homeostasia II', 'PISEC I'],
  2: ['HAC II', 'Metabolismo I', 'Metabolismo II', 'Neuroanatomia', 'PISEC II', 'Sistema Nervoso'],
  3: ['Anatomia Humana II', 'HAC III', 'Histologia II', 'Interação com Meio Ambiente', 'PISEC III', 'Sist. Circulatório', 'Sist. Locomotor'],
  4: ['HAC IV', 'Optativa I', 'Patologia Geral', 'PISEC IV', 'Sist. Digestório', 'Sist. Respiratório', 'Sist. Urinário'],
  5: ['Anat. Patológica I', 'Dermatologia', 'Farmacologia Básica', 'HAC V', 'Radiologia', 'Saúde Mental', 'Sist. Hemolinfopoiético'],
  6: ['Anat. Patológica II', 'Farmacologia Clínica', 'HAC VI', 'PISEC VI', 'Sist. Endócrino', 'Sist. Reprodutor', 'Técnica Cirúrgica'],
  7: ['Infectologia', 'HAC VII', 'Pediatria I', 'PISEC VII', 'Saúde Coletiva I', 'Saúde da Mulher I'],
  8: ['Clínica Médica I', 'HAC VIII', 'Ortopedia', 'Pediatria II', 'PISEC VIII', 'Saúde da Mulher II'],
  9: ['Internato - Clínica Médica'],
  10: ['Internato - Cirurgia Geral'],
  11: ['Internato - Pediatria', 'Internato - Ginecologia e Obstetrícia'],
  12: ['Internato - Urgência e Emergência', 'Internato - Saúde Coletiva'],
}

interface PeriodData {
  numero: number; nome: string; status: string; progresso: number; meta_horas_semana: number
}

export default function PeriodosPage() {
  const { user } = useAuth()
  const [periods, setPeriods] = useState<PeriodData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('periods').select('*, subjects_workspace(progresso)').order('numero')
    if (data && data.length > 0) {
      const periodsWithProgress = data.map((p: any) => {
        let computedProgress = p.progresso;
        if (p.subjects_workspace && p.subjects_workspace.length > 0) {
          const sum = p.subjects_workspace.reduce((acc: number, sw: any) => acc + (sw.progresso || 0), 0)
          computedProgress = Math.round(sum / p.subjects_workspace.length)
        } else if (p.subjects_workspace && p.subjects_workspace.length === 0) {
          computedProgress = 0;
        }
        return { ...p, progresso: computedProgress }
      })
      setPeriods(periodsWithProgress)
    } else {
      setPeriods(Array.from({ length: 12 }, (_, i) => ({
        numero: i + 1, nome: `${i + 1}º Período`, status: 'nao_iniciado', progresso: 0, meta_horas_semana: 20
      })))
    }
    setLoading(false)
  }

  const statusMap = {
    nao_iniciado: { label: 'Não iniciado', dot: 'bg-slate-500' },
    em_andamento: { label: 'Em andamento', dot: 'bg-amber-400' },
    concluido: { label: 'Concluído', dot: 'bg-emerald-400' },
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Períodos Acadêmicos</h2>
          <p className="text-slate-500 text-sm mt-0.5">Organize seu progresso do 1º ao 12º período de Medicina</p>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {periods.map((p, i) => {
              const st = statusMap[p.status as keyof typeof statusMap] || statusMap.nao_iniciado
              const subjects = PERIOD_SUBJECTS[p.numero] || []
              return (
                <motion.div
                  key={p.numero}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/periodos/${p.numero}`}
                    className="glass-card group block overflow-hidden hover:border-white/[0.15] transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`h-28 bg-gradient-to-br ${PERIOD_COLORS[i % 12]} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-black text-white/80">{p.numero}º</span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${st.dot} ring-2 ring-black/20`} />
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-200">{p.nome}</h3>
                        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{st.label}</p>
                      
                      <div className="space-y-1">
                        {subjects.slice(0, 3).map((s, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${PERIOD_COLORS[i % 12]}`} />
                            <span className="text-xs text-slate-400 truncate">{s}</span>
                          </div>
                        ))}
                        {subjects.length > 3 && (
                          <p className="text-[0.6rem] text-slate-600 pl-3.5">+{subjects.length - 3} matérias</p>
                        )}
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[0.6rem] text-slate-600">Progresso</span>
                          <span className="text-[0.6rem] font-semibold text-slate-400">{p.progresso}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${PERIOD_COLORS[i % 12]} transition-all duration-500`}
                            style={{ width: `${p.progresso}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
