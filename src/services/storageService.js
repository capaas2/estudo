import { supabase } from '../lib/supabase'

export async function uploadImagemQuestao(file) {
  if (!file) return null;
  
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('questoes-imagens')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('questoes-imagens')
    .getPublicUrl(filePath)

  return data.publicUrl
}
