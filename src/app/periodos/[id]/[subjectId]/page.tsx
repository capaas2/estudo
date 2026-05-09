'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Calendar, 
  RefreshCw, 
  Layers, 
  FolderOpen, 
  HelpCircle, 
  BarChart3, 
  Sparkles,
  ChevronLeft,
  Clock,
  User,
  BookOpen,
  Plus,
  MoreHorizontal,
  MoreVertical,
  Zap,
  Target,
  Settings2,
  Save,
  X
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/shared/Toast'
import Link from 'next/link'

// Componentes das Abas
import OverviewTab from '@/components/workspace/OverviewTab'
import NotesTab from '@/components/workspace/NotesTab'
import TasksTab from '@/components/workspace/TasksTab'
import CalendarTab from '@/components/workspace/CalendarTab'
import ReviewsTab from '@/components/workspace/ReviewsTab'
import FlashcardsTab from '@/components/workspace/FlashcardsTab'
import FilesTab from '@/components/workspace/FilesTab'
import QuestionsTab from '@/components/workspace/QuestionsTab'
import AnalyticsTab from '@/components/workspace/AnalyticsTab'
import IACopilotTab from '@/components/workspace/IACopilotTab'
import TutoriaTab from '@/components/workspace/TutoriaTab'
import JournalClubTab from '@/components/workspace/JournalClubTab'

type TabType = 'visao-geral' | 'notas' | 'tarefas' | 'calendario' | 'revisoes' | 'flashcards' | 'arquivos' | 'questoes' | 'analytics' | 'ia' | 'tutoria' | 'journal'

export default function SubjectWorkspace() {
  const params = useParams()
  const router = useRouter()
  const addToast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('visao-geral')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState<any>(null)
  const [materia, setMateria] = useState<any>(null)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    status: 'cursando',
    professor: '',
    carga_horaria: 0,
    progresso: 0
  })

  useEffect(() => {
    fetchData()
  }, [params.subjectId])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: ws, error } = await supabase
        .from('subjects_workspace')
        .select('*, materias(*)')
        .eq('id', params.subjectId)
        .single()

      if (error) throw error
      setWorkspace(ws)
      setMateria(ws.materias)
      setEditForm({
        status: ws.status || 'cursando',
        professor: ws.professor || '',
        carga_horaria: ws.carga_horaria || 0,
        progresso: ws.progresso || 0
      })
    } catch (error: any) {
      addToast(error.message, 'error')
      router.push(`/periodos/${params.id}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateWorkspace() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('subjects_workspace')
        .update({
          status: editForm.status,
          professor: editForm.professor,
          carga_horaria: editForm.carga_horaria,
          progresso: editForm.progresso
        })
        .eq('id', params.subjectId)

      if (error) throw error
      
      addToast('Informações atualizadas!', 'success')
      await fetchData()
      setIsEditModalOpen(false)
    } catch (error: any) {
      addToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'notas', label: 'Notas', icon: FileText },
    { id: 'tarefas', label: 'Tarefas', icon: CheckSquare },
    { id: 'calendario', label: 'Calendário', icon: Calendar },
    { id: 'revisoes', label: 'Revisões', icon: RefreshCw },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
    { id: 'questoes', label: 'Questões', icon: HelpCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ia', label: 'IA Copilot', icon: Sparkles },
    { id: 'tutoria', label: 'Tutoria IA', icon: Zap },
    { id: 'journal', label: 'Clube Revista', icon: BookOpen },
  ]

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0e1a]">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  const mainColor = workspace?.cor_override || materia?.cor || '#6366f1'

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-slate-200 overflow-hidden font-sans relative">
      {/* OVERLAY MOBILE */}
      <AnimatePresence>
        {showMobileSidebar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileSidebar(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR INTERNA */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 lg:relative lg:w-64 border-r border-white/[0.06] bg-[#0d1221] flex flex-col z-50 transition-transform duration-300 lg:translate-x-0
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <Link 
            href={`/periodos/${params.id}`}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-widest mb-8 group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Voltar ao Período
          </Link>

          <div className="flex items-center gap-3 mb-10">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: mainColor, boxShadow: `${mainColor}20 0px 8px 24px` }}
            >
              <BookOpen size={20} />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-slate-100 truncate leading-tight">{materia?.nome}</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">{params.id}º Semestre</p>
            </div>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType)
                  setShowMobileSidebar(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative group ${
                  activeTab === tab.id 
                    ? 'text-white bg-white/[0.05]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabSide"
                    className="absolute left-0 w-1 h-5 rounded-full"
                    style={{ backgroundColor: mainColor }}
                  />
                )}
                <tab.icon size={18} className={activeTab === tab.id ? '' : 'group-hover:scale-110 transition-transform'} style={{ color: activeTab === tab.id ? mainColor : 'inherit' }} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 mb-3">
            <span>Favoritos</span>
            <Plus size={12} className="cursor-pointer hover:text-slate-300" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors group">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              <span className="truncate">Prova Final - Resumo</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors group">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
              <span className="truncate">Caso Clínico #04</span>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* BOTÃO HAMBÚRGUER MOBILE */}
        <button 
          onClick={() => setShowMobileSidebar(true)}
          className="lg:hidden fixed top-4 left-4 z-30 p-2.5 bg-[#0d1221] border border-white/10 rounded-xl text-white shadow-xl"
        >
          <MoreVertical size={20} />
        </button>

        {/* HEADER DA MATÉRIA */}
        <header className="h-48 lg:h-64 relative flex-shrink-0 group">
          {/* Capa */}
          <div className="absolute inset-0 bg-slate-900 overflow-hidden">
            {workspace?.capa_url ? (
              <img src={workspace.capa_url} className="w-full h-full object-cover opacity-40" alt="Capa" />
            ) : (
              <div className="w-full h-full opacity-20 bg-gradient-to-br from-slate-800 via-slate-900 to-[#0a0e1a]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] to-transparent" />
          </div>

          {/* Info Header */}
          <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between">
            <div className="flex items-end gap-6">
              <div className="relative">
                <div 
                  className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center text-white text-2xl lg:text-4xl shadow-2xl border-4 border-[#0a0e1a]"
                  style={{ backgroundColor: mainColor }}
                >
                  {materia?.nome?.charAt(0)}
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="pb-1 lg:pb-2">
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-2">
                  <h1 className="text-xl lg:text-4xl font-black text-white tracking-tight leading-tight">{materia?.nome}</h1>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {workspace?.status || 'Em andamento'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs lg:text-sm text-slate-400">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <User size={14} className="text-slate-500" />
                    <span>Prof. {workspace?.professor || 'Não definido'}</span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Clock size={14} className="text-slate-500" />
                    <span>{workspace?.carga_horaria || 0}h Carga Horária</span>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-all uppercase tracking-wider"
                  >
                    <Settings2 size={12} />
                    Editar Info
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-4 pb-2">
              <div className="flex items-center gap-3 relative">
                <button 
                  onClick={() => setActiveTab('ia')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all group"
                  title="IA Copilot"
                >
                  <Zap size={18} className="group-hover:text-amber-400 group-hover:scale-110 transition-all" />
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all group"
                  title="Configurações e Analytics"
                >
                  <MoreHorizontal size={18} className="group-hover:text-cyan-400 group-hover:scale-110 transition-all" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    style={{ backgroundColor: mainColor }}
                  >
                    <Plus size={16} />
                    Ação Rápida
                  </button>

                  <AnimatePresence>
                    {showQuickActions && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowQuickActions(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-56 p-2 rounded-2xl bg-[#1a1f2e]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="text-[10px] uppercase font-black text-slate-500 px-3 py-2 tracking-widest">Atalhos</div>
                          
                          <button 
                            onClick={() => { setActiveTab('notas'); setShowQuickActions(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                          >
                            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                              <FileText size={14} />
                            </div>
                            Nova Nota
                          </button>

                          <button 
                            onClick={() => { setActiveTab('tarefas'); setShowQuickActions(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                          >
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <CheckSquare size={14} />
                            </div>
                            Nova Tarefa
                          </button>

                          <button 
                            onClick={() => { router.push(`/simulados/criar?materia=${materia?.id}`); setShowQuickActions(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                          >
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                              <HelpCircle size={14} />
                            </div>
                            Gerar Simulado
                          </button>

                          <button 
                            onClick={() => { setActiveTab('flashcards'); setShowQuickActions(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all group"
                          >
                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                              <Layers size={14} />
                            </div>
                            Novo Flashcard
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="w-64">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 mb-2 tracking-tighter">
                  <span>Progresso da Disciplina</span>
                  <span style={{ color: mainColor }}>{workspace?.progresso || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${workspace?.progresso || 0}%` }}
                    className="h-full"
                    style={{ backgroundColor: mainColor }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* NAVEGAÇÃO DE TABS */}
        <div className="px-4 lg:px-8 bg-[#0a0e1a]/80 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-20 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="flex items-center gap-4 lg:gap-8 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 text-[10px] lg:text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                  activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon size={14} className="lg:hidden" />
                  {tab.label}
                </div>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabSubject"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: mainColor }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO (ABAS) */}
        <section className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'visao-geral' && (
                <OverviewTab 
                  materia={materia} 
                  workspace={workspace}
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                  onNavigate={setActiveTab}
                  onEdit={() => setIsEditModalOpen(true)}
                />
              )}

              {activeTab === 'notas' && (
                <NotesTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'tarefas' && (
                <TasksTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'calendario' && (
                <CalendarTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'revisoes' && (
                <ReviewsTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'flashcards' && (
                <FlashcardsTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                  materiaNome={materia?.nome}
                />
              )}

              {activeTab === 'arquivos' && (
                <FilesTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'questoes' && (
                <QuestionsTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'ia' && (
                <IACopilotTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'tutoria' && (
                <TutoriaTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}

              {activeTab === 'journal' && (
                <JournalClubTab 
                  materiaId={workspace?.materia_id} 
                  workspaceId={workspace?.id} 
                  mainColor={mainColor} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* MODAL DE EDIÇÃO */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-card border-white/10 p-8 shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Editar Disciplina</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Metadados Acadêmicos</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Status da Matéria</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cursando', 'concluido', 'trancado'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setEditForm({...editForm, status})}
                        className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                          editForm.status === status 
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                            : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Nome do Professor</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
                    <input 
                      type="text"
                      value={editForm.professor}
                      onChange={e => setEditForm({...editForm, professor: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                      placeholder="Ex: Dr. João Silva"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Carga Horária (h)</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
                      <input 
                        type="number"
                        value={editForm.carga_horaria}
                        onChange={e => setEditForm({...editForm, carga_horaria: parseInt(e.target.value) || 0})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Progresso (%)</label>
                    <div className="relative group">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.progresso}
                        onChange={e => setEditForm({...editForm, progresso: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={saving}
                    onClick={handleUpdateWorkspace}
                    className="flex-1 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={16} />
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .btn-premium {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: white;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
        }
        .btn-premium:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  )
}
