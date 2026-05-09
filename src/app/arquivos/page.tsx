'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FolderOpen, File, Trash2, ExternalLink, Download, UploadCloud, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/shared/Toast'

export default function ArquivosPage() {
  const [arquivos, setArquivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const addToast = useToast()
  
  // O bucket principal que definimos no design foi questoes-imagens, mas podemos listar anexos em geral.
  const BUCKET_NAME = 'questoes-imagens'

  useEffect(() => {
    carregarArquivos()
  }, [])

  async function carregarArquivos() {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).list()
      if (error) throw error
      // Filtrar arquivos ocultos como .emptyFolderPlaceholder
      setArquivos(data?.filter(f => f.name !== '.emptyFolderPlaceholder') || [])
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file)
      
      if (error) throw error
      addToast('Upload concluído!', 'success')
      carregarArquivos()
    } catch (error) {
      const err = error as Error
      addToast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(fileName: string) {
    if (!confirm('Deseja realmente excluir este arquivo?')) return
    
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName])
      if (error) throw error
      addToast('Arquivo excluído com sucesso!', 'success')
      carregarArquivos()
    } catch (err: any) {
      addToast(`Erro ao excluir: ${err.message}`, 'error')
    }
  }

  function getPublicUrl(fileName: string) {
    return supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName).data.publicUrl
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <FolderOpen className="text-cyan-500" /> Gerenciador de Arquivos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Armazenamento em nuvem de anexos, PDFs e imagens das questões.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={carregarArquivos}
            className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-slate-400 hover:text-slate-200 transition-all"
            title="Atualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <label className="btn-premium cursor-pointer">
            {uploading ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {uploading ? 'Enviando...' : 'Fazer Upload'}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 gap-3">
            <RefreshCw size={24} className="animate-spin text-cyan-500" /> Carregando seus arquivos...
          </div>
        ) : arquivos.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed">
            <FolderOpen size={48} className="text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-200">Nenhum arquivo encontrado</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-sm">
              Faça o upload de imagens de questões ou PDFs para acessá-los e vinculá-los aos seus materiais.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {arquivos.map((file) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-4 group"
                >
                  <div className="w-full h-32 bg-black/20 rounded-lg flex items-center justify-center mb-4 overflow-hidden border border-white/[0.04]">
                    {file.metadata?.mimetype?.startsWith('image/') ? (
                      <img src={getPublicUrl(file.name)} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <File size={32} className="text-slate-500" />
                    )}
                  </div>
                  
                  <h4 className="text-sm font-medium text-slate-200 truncate" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-[0.65rem] text-slate-500 mt-1 uppercase">
                    {(file.metadata?.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString('pt-BR')}
                  </p>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
                    <a
                      href={getPublicUrl(file.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex justify-center py-1.5 bg-white/[0.03] hover:bg-cyan-500/10 hover:text-cyan-400 text-slate-400 rounded-lg text-xs font-medium transition-colors"
                      title="Abrir"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <a
                      href={getPublicUrl(file.name)}
                      download
                      className="flex-1 flex justify-center py-1.5 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 rounded-lg text-xs font-medium transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(file.name)}
                      className="flex-1 flex justify-center py-1.5 bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg text-xs font-medium transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
