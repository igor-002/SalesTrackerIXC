import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database.types'

type Vendedor = Tables<'vendedores'>
type VendedorInsert = TablesInsert<'vendedores'>

export function useVendedores() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendedores')
      .select('*')
      .order('nome')
    if (error) setError(error.message)
    else setVendedores(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createVendedor(payload: VendedorInsert) {
    const { error } = await supabase.from('vendedores').insert(payload)
    if (error) throw error
    await fetch()
  }

  async function updateVendedor(id: string, payload: Partial<VendedorInsert>) {
    const { error } = await supabase.from('vendedores').update(payload).eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function deleteVendedor(id: string) {
    const { error } = await supabase.from('vendedores').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { vendedores, loading, error, refetch: fetch, createVendedor, updateVendedor, deleteVendedor }
}
