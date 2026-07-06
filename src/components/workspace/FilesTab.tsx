'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'
import { listFiles, uploadFile, deleteFile, getFileUrl } from '@/services/storageService'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoading } from '@/components/shared/LoadingSpinner'
import { motion } from 'framer-motion'
import {
  FolderOpen, Upload, Trash2, FileText, Image, File,
  Download, ExternalLink, X,
} from 'lucide-react'

interface FilesTabProps {
  materiaId: string
}

export default function FilesTab({ materiaId }: FilesTabProps) {
  const { data: user } = useCurrentUser()
  const [uploading, setUploading] = useState(false)

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

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <label className="glass-card p-6 border-dashed border-2 border-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer flex flex-col items-center gap-3 group">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
          <Upload size={20} className="text-cyan-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-300 font-medium">
            {uploading ? 'Fazendo upload...' : 'Clique ou arraste arquivos aqui'}
          </p>
          <p className="text-xs text-slate-500 mt-1">PDF, imagens, documentos — até 50MB</p>
        </div>
        <input
          type="file"
          multiple
          onChange={handleUpload}
          className="hidden"
          disabled={uploading}
        />
        {uploading && (
          <div className="w-32 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 animate-shimmer" style={{ width: '60%' }} />
          </div>
        )}
      </label>

      {/* Files Grid */}
      {files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum arquivo"
          description="Faça upload de PDFs, imagens e materiais de estudo."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.name)
            return (
              <motion.div
                key={file.$id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card-hover p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                    <p className="text-[0.65rem] text-slate-500">
                      {formatSize(file.sizeOriginal)} • {new Date(file.$createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={getFileUrl(file.$id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon"
                      title="Abrir"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(file.$id)}
                      className="btn-icon text-slate-500 hover:text-red-400"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
