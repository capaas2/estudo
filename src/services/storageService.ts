import { supabase } from '@/lib/supabase'

export async function uploadImagemQuestao(file: File): Promise<string | null> {
  if (!file) return null

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('questoes-imagens')
    .upload(fileName, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('questoes-imagens')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export async function uploadArquivoMateria(file: File, materiaId: string): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${materiaId}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from('materias-arquivos')
    .upload(fileName, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('materias-arquivos')
    .getPublicUrl(fileName)

  return data.publicUrl
}
