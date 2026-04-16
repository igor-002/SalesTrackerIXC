import { useState, useEffect, useCallback } from 'react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import type { Permissoes } from '@/types/permissoes'

export interface UsuarioRow {
  id: string
  user_id: string | null
  nome: string
  email: string
  id_vendedor_ixc: string | null
  permissoes: Permissoes | null
  ativo: boolean | null
  criado_em: string | null
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('criado_em', { ascending: false })
    setUsuarios((data ?? []) as UsuarioRow[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createUsuario(payload: {
    nome: string
    email: string
    senha: string
    id_vendedor_ixc: string | null
    permissoes: Permissoes
  }) {
    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.senha,
    })
    if (authError) throw authError
    if (!authData.user) throw new Error('Falha ao criar usuário no Auth.')

    // 2. Inserir na tabela usuarios
    const { error: dbError } = await supabase.from('usuarios').insert({
      user_id: authData.user.id,
      nome: payload.nome,
      email: payload.email,
      id_vendedor_ixc: payload.id_vendedor_ixc,
      permissoes: payload.permissoes as unknown as Json,
    })
    if (dbError) throw dbError

    await fetch()
  }

  async function updateUsuario(id: string, payload: {
    nome: string
    id_vendedor_ixc: string | null
    permissoes: Permissoes
  }) {
    const { error } = await supabase
      .from('usuarios')
      .update({
        nome: payload.nome,
        id_vendedor_ixc: payload.id_vendedor_ixc,
        permissoes: payload.permissoes as unknown as Json,
      })
      .eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function updateSenha(user_id: string, novaSenha: string) {
    if (!supabaseAdmin) throw new Error('Service role key não configurada. Defina VITE_SUPABASE_SERVICE_ROLE_KEY.')
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: novaSenha })
    if (error) throw error
  }

  async function deleteUsuario(id: string, user_id: string | null) {
    // 1. Remover da tabela usuarios
    const { error: dbError } = await supabase.from('usuarios').delete().eq('id', id)
    if (dbError) throw dbError

    // 2. Remover do Supabase Auth (requer service role key)
    if (user_id) {
      if (!supabaseAdmin) throw new Error('Service role key não configurada. Defina VITE_SUPABASE_SERVICE_ROLE_KEY.')
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
      if (authError) throw authError
    }

    await fetch()
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await supabase
      .from('usuarios')
      .update({ ativo })
      .eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { usuarios, loading, refetch: fetch, createUsuario, updateUsuario, updateSenha, toggleAtivo, deleteUsuario }
}
