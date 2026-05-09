'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import { supabase } from '@/lib/supabase'
import { 
  Plus, 
  Search, 
  FileText, 
  Star, 
  Trash2, 
  MoreVertical,
  Save,
  Clock,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Code,
  Quote,
  Undo,
  Redo
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Note {
  id: string
  titulo: string
  conteudo: any
  is_favorita: boolean
  atualizado_em: string
  icone: string
}

interface NotesTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function NotesTab({ materiaId, workspaceId, mainColor }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Comece a escrever ou digite "/" para comandos...',
      }),
      Image,
      Link,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Typography,
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Auto-save logic could go here (throttled)
    },
  })

  useEffect(() => {
    fetchNotes()
  }, [materiaId])

  async function fetchNotes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('materia_id', materiaId)
        .order('atualizado_em', { ascending: false })

      if (error) throw error
      setNotes(data || [])
      if (data && data.length > 0 && !activeNote) {
        selectNote(data[0])
      }
    } catch (error) {
      console.error('Erro ao buscar notas:', error)
    } finally {
      setLoading(false)
    }
  }

  function selectNote(note: Note) {
    setActiveNote(note)
    if (editor) {
      editor.commands.setContent(note.conteudo || '')
    }
  }

  async function createNote() {
    try {
      const newNote = {
        materia_id: materiaId,
        workspace_id: workspaceId,
        titulo: 'Nova Nota',
        conteudo: {},
        icone: '📝',
        user_id: (await supabase.auth.getUser()).data.user?.id
      }

      const { data, error } = await supabase
        .from('notes')
        .insert(newNote)
        .select()
        .single()

      if (error) throw error
      setNotes([data, ...notes])
      selectNote(data)
    } catch (error) {
      console.error('Erro ao criar nota:', error)
    }
  }

  async function saveNote() {
    if (!activeNote || !editor) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          titulo: activeNote.titulo,
          conteudo: editor.getJSON(),
          atualizado_em: new Promise(resolve => resolve(new Date().toISOString()))
        })
        .eq('id', activeNote.id)

      if (error) throw error
      
      // Update local state
      setNotes(notes.map(n => n.id === activeNote.id ? { ...n, titulo: activeNote.titulo, atualizado_em: new Date().toISOString() } : n))
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
      
      const updatedNotes = notes.filter(n => n.id !== id)
      setNotes(updatedNotes)
      if (activeNote?.id === id) {
        setActiveNote(updatedNotes.length > 0 ? updatedNotes[0] : null)
        if (updatedNotes.length > 0) {
          editor?.commands.setContent(updatedNotes[0].conteudo || '')
        } else {
          editor?.commands.setContent('')
        }
      }
    } catch (error) {
      console.error('Erro ao excluir nota:', error)
    }
  }

  const filteredNotes = notes.filter(n => 
    n.titulo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full gap-0 lg:gap-6 overflow-hidden relative">
      {/* Listagem de Notas */}
      <aside className={`
        ${activeNote && 'hidden lg:flex'} 
        w-full lg:w-80 flex flex-col gap-4
      `}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-white">Minhas Notas</h3>
          <button 
            onClick={createNote}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/10"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar nas notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all text-slate-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-600 italic text-sm">
              Nenhuma nota encontrada.
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => selectNote(note)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                  activeNote?.id === note.id 
                    ? 'bg-white/[0.05] border-white/20' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">{note.icone}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate ${activeNote?.id === note.id ? 'text-white' : 'text-slate-400'}`}>
                      {note.titulo}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-slate-600" />
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(note.atualizado_em), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNote(note.id)
                    }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Editor Tiptap */}
      <main className={`
        ${!activeNote && 'hidden lg:flex'}
        flex-1 lg:glass-card flex flex-col overflow-hidden bg-[#0a0e1a] lg:bg-transparent
      `}>
        {activeNote ? (
          <>
            {/* Toolbar do Editor */}
            <header className="px-4 lg:px-6 py-3 lg:py-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between bg-white/[0.01] gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveNote(null)}
                  className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <input 
                  type="text" 
                  value={activeNote.titulo}
                  onChange={(e) => setActiveNote({ ...activeNote, titulo: e.target.value })}
                  className="bg-transparent text-lg lg:text-xl font-bold text-white focus:outline-none border-b border-transparent focus:border-white/20 transition-all pb-1 flex-1 min-w-0"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 mr-2 border border-white/10">
                  <button 
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-white/10 transition-all ${editor?.isActive('bold') ? 'text-white bg-white/10' : 'text-slate-500'}`}
                  >
                    <Bold size={16} />
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-white/10 transition-all ${editor?.isActive('italic') ? 'text-white bg-white/10' : 'text-slate-500'}`}
                  >
                    <Italic size={16} />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button 
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-1.5 rounded hover:bg-white/10 transition-all ${editor?.isActive('heading', { level: 1 }) ? 'text-white bg-white/10' : 'text-slate-500'}`}
                  >
                    <Heading1 size={16} />
                  </button>
                  <button 
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-white/10 transition-all ${editor?.isActive('bulletList') ? 'text-white bg-white/10' : 'text-slate-500'}`}
                  >
                    <List size={16} />
                  </button>
                </div>

                <button 
                  onClick={saveNote}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
                  style={{ borderColor: `${mainColor}40` }}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={16} style={{ color: mainColor }} />
                  )}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 lg:p-12 editor-container custom-scrollbar">
              <EditorContent editor={editor} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4">
            <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
              <FileText size={40} />
            </div>
            <p className="italic">Selecione uma nota ou crie uma nova para começar.</p>
            <button 
              onClick={createNote}
              className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-bold transition-all"
            >
              Criar Primeira Nota
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        .editor-container .tiptap {
          outline: none;
          color: #e2e8f0;
          font-size: 1.1rem;
          line-height: 1.8;
        }
        .editor-container .tiptap p.is-editor-empty:first-child::before {
          color: #475569;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .editor-container .tiptap h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 2rem; color: white; }
        .editor-container .tiptap h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem; color: #f1f5f9; margin-top: 2rem; }
        .editor-container .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .editor-container .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; }
        .editor-container .tiptap blockquote { border-left: 4px solid ${mainColor}; padding-left: 1.5rem; font-style: italic; color: #94a3b8; margin: 2rem 0; }
        .editor-container .tiptap img { border-radius: 1rem; margin: 2rem 0; width: 100%; }
        .editor-container .tiptap pre { background: #0f172a; padding: 1.5rem; border-radius: 1rem; margin: 2rem 0; border: 1px solid rgba(255,255,255,0.05); }
      `}</style>
    </div>
  )
}
