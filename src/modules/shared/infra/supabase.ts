import { createClient } from '@supabase/supabase-js'
 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[SGEM] ADVERTENCIA: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas en .env.local. Por favor configura tus credenciales de Supabase en un archivo .env.local.'
    )
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey)