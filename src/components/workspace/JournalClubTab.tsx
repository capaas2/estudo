'use client'

import { useState } from 'react'
import { useToast } from '@/components/shared/Toast'
import { extrairTextoPDF } from '@/services/pdfService'
import { callOpenRouterIA, extrairJSON } from '@/services/iaService'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, Sparkles, Download, BookOpen, Quote, ShieldAlert, BarChart, CheckCircle2 } from 'lucide-react'

interface JournalClubTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

function mdToHtml(text: string) {
  if (!text) return ''
  return text
    .replace(/\\n/g, '\n')
    .replace(/^### (.+)$/gm, '<h4 class="text-cyan-400 font-bold mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-cyan-500 font-bold mt-5 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-slate-200 font-extrabold mt-6 mb-3">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-400">$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li class="mb-1">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="list-disc pl-5 my-2 text-slate-300">${m}</ul>`)
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

export default function JournalClubTab({ materiaId, workspaceId, mainColor }: JournalClubTabProps) {
  const toast = useToast()
  const [artigo, setArtigo] = useState<File | null>(null)
  const [analise, setAnalise] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [progresso, setProgresso] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return
    const file = e.target.files[0]
    if (file.type !== 'application/pdf') return toast('Apenas PDFs são aceitos', 'error')
    setArtigo(file)
  }

  async function analisar() {
    if (!artigo) return toast('Selecione um artigo científico (PDF)', 'error')
    setLoading(true)
    setAnalise(null)
    try {
      setProgresso('Lendo artigo...')
      const texto = await extrairTextoPDF(artigo)
      
      setProgresso('IA realizando leitura crítica...')
      const prompt = `Você é um pesquisador sênior realizando uma análise crítica para um Clube de Revista (Journal Club) de Medicina.
      
      ARTIGO CIENTÍFICO (TEXTO):
      ${texto.slice(0, 30000)}

      Analise o artigo e responda em JSON com os seguintes campos:
      {
        "titulo": "título do artigo",
        "autores": "autores principais",
        "periodico": "nome da revista/periódico",
        "objetivo": "objetivo principal do estudo",
        "metodologia_resumo": "resumo da metodologia",
        "n_estudo": "número de participantes/amostra",
        "tipo_estudo": "ex: RCT, Coorte, Revisão Sistemática",
        "resultados_principais": ["resultado 1", "resultado 2"],
        "conclusao_autores": "o que os autores concluíram",
        "analise_critica": {
          "viéses": ["possíveis vieses"],
          "limitacoes": ["limitações do estudo"],
          "pontos_fortes": ["o que foi bem feito"],
          "aplicabilidade_clinica": "como isso afeta a prática médica"
        },
        "perguntas_para_debate": ["pergunta 1", "pergunta 2"],
        "nota_evidencia": 8,
        "resumo_executivo": "texto curto em markdown"
      }
      
      Responda APENAS o JSON.`

      const resp = await callOpenRouterIA([
        { role: 'system', content: 'Você é um cientista e médico revisor. Sempre responda em português do Brasil. Responda apenas JSON válido.' },
        { role: 'user', content: prompt }
      ], true, 8000)

      const parsed = extrairJSON(resp)
      if (parsed) {
        setAnalise(parsed)
        toast('Análise crítica concluída!', 'success')
      } else {
        throw new Error('Falha ao processar resposta')
      }
    } catch (error) {
      console.error(error)
      toast('Erro ao analisar o artigo.', 'error')
    } finally {
      setLoading(false)
      setProgresso('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={24} className="text-emerald-400" />
            Clube de Revista IA
          </h3>
          <p className="text-sm text-slate-500 mt-1">Análise crítica de artigos científicos para discussão acadêmica.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Column */}
        <div className="lg:col-span-4 space-y-6">
           <div className="glass-card p-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Selecionar Artigo</h4>
              <div 
                onClick={() => document.getElementById('journal-pdf-input')?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  artigo ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/30'
                }`}
              >
                {artigo ? (
                  <div className="space-y-2">
                    <FileText size={32} className="mx-auto text-emerald-400" />
                    <p className="text-xs text-white font-bold truncate">{artigo.name}</p>
                    <button className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Trocar Arquivo</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={32} className="mx-auto text-slate-500" />
                    <p className="text-xs text-slate-400">Clique para enviar o PDF do artigo</p>
                  </div>
                )}
              </div>
              <input id="journal-pdf-input" type="file" accept=".pdf" className="hidden" onChange={handleFile} />
              
              <button 
                onClick={analisar}
                disabled={loading || !artigo}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:shadow-none mt-6 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-xs">{progresso}</span>
                  </div>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Análise Crítica
                  </>
                )}
              </button>
           </div>

           {analise && (
             <div className="glass-card p-6 border-l-4 border-l-emerald-500">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                   <BarChart size={14} className="text-emerald-400" />
                   Nível de Evidência
                </h4>
                <div className="flex items-end gap-2">
                   <span className="text-4xl font-black text-white">{analise.nota_evidencia}</span>
                   <span className="text-lg font-bold text-slate-600 mb-1">/ 10</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${analise.nota_evidencia * 10}%` }}
                     className="h-full bg-emerald-500"
                   />
                </div>
             </div>
           )}
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
             {!analise ? (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center"
               >
                  <Quote size={48} className="text-slate-800 mb-6" />
                  <h4 className="text-lg font-bold text-slate-600">Aguardando artigo...</h4>
                  <p className="text-sm text-slate-700 mt-2 max-w-sm">
                    Envie um artigo científico para obter um resumo crítico, análise de vieses e perguntas para o debate no Clube de Revista.
                  </p>
               </motion.div>
             ) : (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                 className="space-y-6 pb-20"
               >
                  {/* Header do Artigo */}
                  <div className="glass-card p-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
                     <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <CheckCircle2 size={12} /> Analisado por StudyPro
                     </div>
                     <h2 className="text-2xl font-black text-white leading-tight mb-4">{analise.titulo}</h2>
                     <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                        <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10"><strong>Revista:</strong> {analise.periodico}</span>
                        <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10"><strong>Tipo:</strong> {analise.tipo_estudo}</span>
                        <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10"><strong>Amostra:</strong> {analise.n_estudo}</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="glass-card p-6">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Objetivo e Metodologia</h4>
                        <div className="space-y-4">
                           <div>
                              <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Objetivo</p>
                              <p className="text-sm text-slate-300">{analise.objetivo}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Resumo Metodológico</p>
                              <p className="text-sm text-slate-300">{analise.metodologia_resumo}</p>
                           </div>
                        </div>
                     </div>

                     <div className="glass-card p-6 border-l-4 border-l-violet-500">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Principais Resultados</h4>
                        <ul className="space-y-3">
                           {analise.resultados_principais.map((r: string, i: number) => (
                             <li key={i} className="text-sm text-slate-300 flex items-start gap-3">
                                <div className="w-5 h-5 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 font-bold text-[10px]">{i+1}</div>
                                {r}
                             </li>
                           ))}
                        </ul>
                     </div>
                  </div>

                  {/* Análise Crítica */}
                  <div className="glass-card p-8 bg-[#161b2c]/50">
                     <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <ShieldAlert size={20} className="text-amber-500" />
                        Análise Crítica e Vieses
                     </h3>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                           <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">Vieses e Limitações</p>
                           <ul className="space-y-2">
                              {analise.analise_critica.viéses.concat(analise.analise_critica.limitacoes).map((v: string, i: number) => (
                                <li key={i} className="text-xs text-slate-400 flex items-center gap-2 italic">
                                   <div className="w-1 h-1 rounded-full bg-amber-500" />
                                   {v}
                                </li>
                              ))}
                           </ul>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Pontos Fortes</p>
                           <ul className="space-y-2">
                              {analise.analise_critica.pontos_fortes.map((p: string, i: number) => (
                                <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                                   <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                   {p}
                                </li>
                              ))}
                           </ul>
                        </div>
                     </div>

                     <div className="mt-8 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Aplicabilidade Clínica</p>
                        <p className="text-sm text-slate-300 leading-relaxed italic">"{analise.analise_critica.aplicabilidade_clinica}"</p>
                     </div>
                  </div>

                  {/* Debate */}
                  <div className="glass-card p-8 border-dashed border-emerald-500/20">
                     <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                        <Sparkles size={20} className="text-emerald-400" />
                        Tópicos para Debate
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analise.perguntas_para_debate.map((p: string, i: number) => (
                          <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-sm text-slate-300 hover:border-emerald-500/20 transition-all">
                             {p}
                          </div>
                        ))}
                     </div>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
