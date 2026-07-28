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
  Download, ExternalLink, X, Globe, Lock, AlertCircle,
} from 'lucide-react'

interface FilesTabProps {
  materiaId: string
}

export default function FilesTab({ materiaId }: FilesTabProps) {
  const { data: user } = useCurrentUser()
  const [uploading, setUploading] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const ADMIN_EMAIL = 'gustavocapaz06@gmail.com'
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const MAX_SIZE_BYTES = 300 * 1024 * 1024 // 300 MB

  const { data: filesResponse, isLoading, refetch } = useQuery({
    queryKey: ['files', user?.$id, materiaId],
    queryFn: () => listFiles(materiaId, user!.$id),
    enabled: !!user && !!materiaId,
  })

  const files = filesResponse?.files || []

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0 || !user) return

    setErrorMessage('')
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_SIZE_BYTES) {
          setErrorMessage(`O arquivo ${file.name} excede o limite de 300MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`)
          continue
        }
        await uploadFile(file, materiaId, user.$id, isPublic)
      }
      refetch()
    } catch (err) {
      console.error('Erro no upload:', err)
      setErrorMessage('Erro ao realizar upload do arquivo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(fileId: string) {
    if (!user) return
    try {
      await deleteFile(fileId, user.$id)
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
    <div className="space-y-5">
      {/* Upload area */}
      <div className="surface p-6 border-dashed border-2 border-white/[0.08] hover:border-indigo-500/30 transition-all flex flex-col items-center gap-4 group relative">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
          <Upload size={20} />
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-200 font-semibold">
            {uploading ? 'Fazendo upload...' : 'Clique ou arraste arquivos desta matéria aqui'}
          </p>
          <p className="text-xs text-slate-400 mt-1">PDFs, livros, slides, imagens e documentos — <strong className="text-indigo-300 font-semibold">até 300 MB por arquivo</strong></p>
        </div>

        {/* Radio toggle for Admin */}
        {isAdmin && (
          <div className="flex items-center gap-4 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="fileVisibilidade"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="accent-indigo-500"
              />
              <Lock size={13} className="text-slate-400" />
              <span>Privado (Apenas nesta Matéria)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
              <input
                type="radio"
                name="fileVisibilidade"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="accent-indigo-500"
              />
              <Globe size={13} className="text-indigo-400" />
              <span>Público na Biblioteca Global</span>
            </label>
          </div>
        )}

        <input
          type="file"
          multiple
          onChange={handleUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={uploading}
        />

        {uploading && (
          <div className="w-48 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" style={{ width: '70%' }} />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Files Grid */}
      {files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum arquivo nesta matéria"
          description="Faça upload de PDFs, imagens e livros exclusivos para esta matéria de até 300MB."
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
                className="surface-interactive p-4 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{file.name}</p>
                    <p className="text-[0.65rem] text-slate-400 mt-0.5">
                      {formatSize(file.sizeOriginal)} • {new Date(file.$createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={getFileUrl(file.$id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-icon text-slate-400 hover:text-indigo-300 cursor-pointer"
                      title="Abrir Documento"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(file.$id)}
                      className="btn-icon text-slate-500 hover:text-rose-400 cursor-pointer"
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
