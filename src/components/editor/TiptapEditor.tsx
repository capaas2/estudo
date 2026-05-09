'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import { Bold, Italic, Strikethrough, List, ListOrdered, CheckSquare, Highlighter, Heading1, Heading2, Quote, Undo, Redo } from 'lucide-react'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  editable?: boolean
}

export default function TiptapEditor({ content, onChange, editable = true }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Pressione "/" para comandos ou comece a digitar...',
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
    ],
    content,
    immediatelyRender: false,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-cyan max-w-none focus:outline-none min-h-[500px]',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="flex flex-col h-full bg-transparent rounded-xl">
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/[0.05] bg-white/[0.01] sticky top-0 z-10 backdrop-blur-md rounded-t-xl">
          <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={<Bold size={16} />} title="Negrito" />
          <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={<Italic size={16} />} title="Itálico" />
          <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={<Strikethrough size={16} />} title="Tachado" />
          <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} icon={<Highlighter size={16} />} title="Destacar" />
          
          <div className="w-px h-5 bg-white/[0.1] mx-1" />
          
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={<Heading1 size={16} />} title="Título 1" />
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={<Heading2 size={16} />} title="Título 2" />
          
          <div className="w-px h-5 bg-white/[0.1] mx-1" />
          
          <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={<List size={16} />} title="Lista de Marcadores" />
          <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={<ListOrdered size={16} />} title="Lista Numerada" />
          <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} icon={<CheckSquare size={16} />} title="Lista de Tarefas" />
          
          <div className="w-px h-5 bg-white/[0.1] mx-1" />
          
          <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={<Quote size={16} />} title="Citação" />
          
          <div className="flex-1" />
          
          <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={<Undo size={16} />} title="Desfazer" />
          <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={<Redo size={16} />} title="Refazer" />
        </div>
      )}

      {/* Editor Area */}
      <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function MenuButton({ onClick, active, disabled, icon, title }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {icon}
    </button>
  )
}
