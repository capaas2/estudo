import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tuxgyaolajmhzqoblamv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eGd5YW9sYWptaHpxb2JsYW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjI2MDMsImV4cCI6MjA5MzIzODYwM30.pWnt4H_rF1_woTOmlVkQGTxBBSu07VEktzoeCooBVpU'

export const supabase = createClient(supabaseUrl, supabaseKey)
