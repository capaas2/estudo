'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  FileText, 
  Upload, 
  Folder, 
  MoreVertical, 
  Download, 
  Trash2, 
  Search,
  Grid,
  List as ListIcon,
  FileCode,
  FileImage,
  ExternalLink,
  Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FileItem {
  id: string
  nome: string
  tamanho: number
  tipo: string
  url: string
  criado_em: string
}

interface FilesTabProps {
  materiaId: string
  workspaceId: string
  mainColor: string
}

export default function FilesTab({ materiaId, workspaceId, mainColor }: FilesTabProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [materiaId])

  async function fetchFiles() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subject_files')
        .select('*')
        .eq('materia_id', materiaId)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const user = (await supabase.auth.getUser()).data.user
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user?.id}/${materiaId}/${fileName}`

      // 1. Upload para o Storage (Assume bucket 'subject-materials' existe)
      const { error: uploadError } = await supabase.storage
        .from('subject-materials')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('subject-materials')
        .getPublicUrl(filePath)

      // 2. Salvar metadados no banco
      const { data, error: dbError } = await supabase
        .from('subject_files')
        .insert({
          user_id: user?.id,
          materia_id: materiaId,
          nome: file.name,
          tamanho: file.size,
          tipo: file.type,
          url: publicUrl
        })
        .select()
        .single()

      if (dbError) throw dbError
      setFiles([data, ...files])
    } catch (error) {
      console.error('Erro no upload:', error)
      alert('Certifique-se de que o bucket "subject-materials" está configurado no Supabase.')
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-rose-500" />
    if (type.includes('image')) return <FileImage className="text-emerald-500" />
    if (type.includes('javascript') || type.includes('json')) return <FileCode className="text-amber-500" />
    return <FileText className="text-slate-400" />
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Folder size={24} style={{ color: mainColor }} />
            Repositório de Arquivos
          </h3>
          <p className="text-sm text-slate-500 mt-1">Organize PDFs, imagens e documentos da disciplina.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mr-2">
             <button 
               onClick={() => setViewMode('grid')}
               className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <Grid size={16} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
             >
                <ListIcon size={16} />
             </button>
          </div>
          
          <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm cursor-pointer hover:bg-slate-200 transition-all shadow-lg active:scale-95">
             <Upload size={16} />
             {uploading ? 'Enviando...' : 'Fazer Upload'}
             <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar nos arquivos..." 
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all text-slate-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
             <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-40 rounded-3xl bg-white/[0.02] animate-pulse" />)}
             </div>
          ) : files.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center">
                   <FileText size={40} />
                </div>
                <p className="italic">Nenhum arquivo encontrado.</p>
             </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4">
              {files.map(file => (
                <motion.div 
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-5 border-white/[0.05] hover:border-white/10 transition-all group relative"
                >
                   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400">
                         <MoreVertical size={14} />
                      </button>
                   </div>
                   
                   <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                      {getFileIcon(file.tipo)}
                   </div>
                   
                   <h5 className="text-sm font-bold text-slate-200 truncate mb-1" title={file.nome}>{file.nome}</h5>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{formatSize(file.tamanho)}</p>
                   
                   <div className="mt-4 flex gap-2">
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                      >
                         <ExternalLink size={12} /> Abrir
                      </a>
                      <button className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-rose-400 transition-all">
                         <Trash2 size={14} />
                      </button>
                   </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
               {files.map(file => (
                 <div key={file.id} className="glass-card p-4 flex items-center justify-between border-white/[0.03] hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          {getFileIcon(file.tipo)}
                       </div>
                       <div>
                          <h5 className="text-sm font-bold text-slate-200">{file.nome}</h5>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{formatSize(file.tamanho)} • {new Date(file.criado_em).toLocaleDateString()}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button className="p-2 text-slate-400 hover:text-white transition-colors"><Download size={16} /></button>
                       <button className="p-2 text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      <footer className="glass-card p-5 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-blue-500/10 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
               <Folder size={18} />
            </div>
            <div>
               <h4 className="text-xs font-bold text-white">Espaço Utilizado</h4>
               <p className="text-[10px] text-slate-500">Você está usando 124 MB de 2 GB (6%)</p>
            </div>
         </div>
         <div className="w-48 h-2 bg-white/5 rounded-full overflow-hidden border border-white/[0.05]">
            <div className="h-full bg-blue-500 w-[6%]" />
         </div>
      </footer>
    </div>
  )
}
