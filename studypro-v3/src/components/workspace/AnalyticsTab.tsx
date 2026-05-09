'use client'

import { useState } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  BarChart2, 
  TrendingUp, 
  Clock, 
  Target, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Info
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AnalyticsTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

const studyData: any[] = []
const performanceData: any[] = []
const topicData: any[] = []

export default function AnalyticsTab({ materiaId, workspaceId, mainColor }: AnalyticsTabProps) {
  return (
    <div className="h-full flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 size={24} style={{ color: mainColor }} />
            Analytics & Insights
          </h3>
          <p className="text-sm text-slate-500 mt-1">Análise profunda do seu comportamento e rendimento acadêmico.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
             <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-white/10">7 Dias</button>
             <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-300 transition-all">30 Dias</button>
          </div>
        </div>
      </header>

      {/* Top Highlights */}
      <div className="grid grid-cols-4 gap-6">
         {[
           { label: 'Tempo Total', value: '0h', trend: '0%', up: true, icon: Clock, color: '#3b82f6' },
           { label: 'Eficiência', value: '0%', trend: '0%', up: true, icon: Activity, color: '#10b981' },
           { label: 'Meta Diária', value: '0%', trend: '0%', up: false, icon: Target, color: '#f59e0b' },
           { label: 'Pontuação IA', value: '---', trend: '0%', up: true, icon: TrendingUp, color: '#8b5cf6' },
         ].map((stat, i) => (
           <div key={i} className="glass-card p-6 border-white/[0.05]">
              <div className="flex items-center justify-between mb-4">
                 <div className="p-2.5 rounded-xl bg-white/5" style={{ color: stat.color }}>
                    <stat.icon size={18} />
                 </div>
                 <div className={`flex items-center gap-1 text-[10px] font-black ${stat.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.trend}
                 </div>
              </div>
              <h4 className="text-2xl font-black text-white mb-1">{stat.value}</h4>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{stat.label}</p>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
         {/* Gráfico de Horas de Estudo */}
         <div className="col-span-8 glass-card p-8 min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-slate-500" />
                  Horas de Estudo por Dia
               </h4>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mainColor }} />
                     ESTA SEMANA
                  </div>
               </div>
            </div>
            
            <div className="flex-1 w-full h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={studyData}>
                     <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor={mainColor} stopOpacity={0.3}/>
                           <stop offset="95%" stopColor={mainColor} stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                     <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                     />
                     <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                     />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0d1221', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                     />
                     <Area 
                        type="monotone" 
                        dataKey="hours" 
                        stroke={mainColor} 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorHours)" 
                     />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Distribuição de Foco */}
         <div className="col-span-4 glass-card p-8 flex flex-col">
            <h4 className="font-bold text-white text-sm mb-8 flex items-center gap-2">
               <Target size={16} className="text-slate-500" />
               Distribuição de Foco
            </h4>
            
            <div className="flex-1 flex flex-col items-center justify-center">
               <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={topicData}
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={8}
                           dataKey="value"
                        >
                           {topicData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <Tooltip />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
               
               <div className="w-full mt-8 space-y-3">
                  {topicData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
                       </div>
                       <span className="text-xs font-black text-white">{item.value}%</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Insights da IA */}
      <div className="glass-card p-8 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-transparent border-violet-500/20 mb-8">
         <div className="flex items-start gap-6">
            <div className="p-4 rounded-[2rem] bg-violet-500/20 text-violet-400 border border-violet-500/20">
               <TrendingUp size={32} />
            </div>
            <div>
               <h4 className="text-xl font-bold text-white mb-2">Previsão de Desempenho</h4>
               <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                  Ainda não temos dados suficientes de estudo nesta matéria para gerar uma previsão precisa. 
                  <span className="font-bold text-white italic"> Continue estudando e resolvendo questões</span> para habilitar este insight da IA.
                  <span className="block mt-4 text-slate-400 flex items-center gap-2">
                     <Info size={14} /> Os dados são atualizados conforme você conclui tarefas e simulados.
                  </span>
               </p>
            </div>
         </div>
      </div>
    </div>
  )
}
