'use client'

import { useState, useRef } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listFiles, uploadFile, deleteFile, getFileUrl } from '@/services/storageService'
import AppShell from '@/components/layout/AppShell'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  FolderOpen, Upload, Trash2, FileText, Image, File,
  Download, ExternalLink, Search, Grid, List, Sparkles,
} from 'lucide-react'

export default function ArquivosPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: filesResponse, isLoading, refetch } = useQuery({
    queryKey: ['files', user?.$id],
    queryFn: () => listFiles(),
    enabled: !!user,
  })

  const files = filesResponse?.files || []

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(file)
      }
      refetch()
    } catch (err) {
      console.error('Erro no upload:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(fileId: string) {
    try {
      await deleteFile(fileId)
      refetch()
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return Image
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) return FileText
    return File
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalSize = files.reduce((sum, f) => sum + (f.sizeOriginal || 0), 0)

  if (userLoading || isLoading) return <AppShell><PageLoading /></AppShell>

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Arquivos</h1>
          <p className="page-subtitle">{files.length} arquivo{files.length !== 1 ? 's' : ''} • {formatSize(totalSize)}</p>
        </div>
      </div>
      <div className="page-body">
        {/* Upload area */}
        <label className="glass-card p-6 border-dashed border-2 border-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer flex flex-col items-center gap-3 group mb-6">
          <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
            <Upload size={24} className="text-cyan-400" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-300 font-medium">
              {uploading ? 'Fazendo upload...' : 'Clique ou arraste arquivos aqui'}
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF, imagens, documentos — até 50MB</p>
          </div>
          <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
          {uploading && (
            <div className="w-40 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 animate-shimmer rounded-full" style={{ width: '60%' }} />
            </div>
          )}
        </label>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar arquivos..."
              className="form-input pl-9 text-sm"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`btn-icon ${viewMode === 'grid' ? 'text-cyan-400 bg-cyan-500/10' : ''}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn-icon ${viewMode === 'list' ? 'text-cyan-400 bg-cyan-500/10' : ''}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Files */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={search ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo'}
            description="Faça upload de PDFs, imagens e materiais de estudo."
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((file, i) => {
              const Icon = getFileIcon(file.name)
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.name.split('.').pop()?.toLowerCase() || '')
              return (
                <motion.div
                  key={file.$id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card-hover group overflow-hidden"
                >
                  {isImage && (
                    <div className="h-32 bg-white/[0.02] flex items-center justify-center border-b border-white/[0.04]">
                      <img
                        src={getFileUrl(file.$id)}
                        alt={file.name}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {!isImage && (
                        <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-[0.65rem] text-slate-500">
                          {formatSize(file.sizeOriginal)} • {new Date(file.$createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={getFileUrl(file.$id)} target="_blank" rel="noopener noreferrer" className="btn-secondary text-[0.65rem] flex-1 justify-center">
                        <ExternalLink size={12} /> Abrir
                      </a>
                      <button onClick={() => handleDelete(file.$id)} className="btn-icon text-slate-500 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((file, i) => {
              const Icon = getFileIcon(file.name)
              return (
                <motion.div
                  key={file.$id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <Icon size={16} className="text-slate-400 shrink-0" />
                  <p className="text-sm text-slate-200 flex-1 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 shrink-0">{formatSize(file.sizeOriginal)}</p>
                  <p className="text-xs text-slate-600 shrink-0">{new Date(file.$createdAt).toLocaleDateString('pt-BR')}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={getFileUrl(file.$id)} target="_blank" rel="noopener noreferrer" className="btn-icon"><ExternalLink size={14} /></a>
                    <button onClick={() => handleDelete(file.$id)} className="btn-icon text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
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
