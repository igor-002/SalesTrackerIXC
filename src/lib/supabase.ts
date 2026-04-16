import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Valores públicos (anon key) — seguro hardcodar no frontend.
// Env vars opcionais: se definidas, têm prioridade (trim remove espaços acidentais).
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '')
  || 'https://phoikjhbtzqxppvxbzvq.supabase.co'

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBob2lramhidHpxeHBwdnhienZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODA0MjcsImV4cCI6MjA4OTQ1NjQyN30.PxQudxhFz7pZ8nEOxYgTLzEsCvmDYQfbJx8GM4Ld_98'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente com service role key — necessário apenas para operações admin (ex: alterar senha de outro usuário).
// Defina VITE_SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do projeto.
const serviceRoleKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined)?.trim()
export const supabaseAdmin = serviceRoleKey
  ? createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

export type SupabaseClient = typeof supabase
