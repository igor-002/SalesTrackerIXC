import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database.types'

export type ClienteComJoins = Tables<'clientes'> & {
  produto: { nome: string } | null
  vendedor: { nome: string } | null
}

export function useClientes() {
  const [clientes, setClientes] = useState<ClienteComJoins[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*, produto:produtos(nome), vendedor:vendedores(nome)')
      .eq('ativo', true)
      .order('nome')
    setClientes((data ?? []) as ClienteComJoins[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createCliente(payload: TablesInsert<'clientes'>) {
    const { error } = await supabase.from('clientes').insert(payload)
    if (error) throw error
    await fetch()
  }

  async function updateCliente(id: string, payload: Partial<TablesInsert<'clientes'>>) {
    const { error } = await supabase.from('clientes').update(payload).eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function deleteCliente(id: string) {
    const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { clientes, loading, refetch: fetch, createCliente, updateCliente, deleteCliente }
}
