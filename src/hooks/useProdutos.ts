import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database.types'

type Produto = Tables<'produtos'>
type ProdutoInsert = TablesInsert<'produtos'>

export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .order('nome')
    setProdutos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createProduto(payload: ProdutoInsert) {
    const { error } = await supabase.from('produtos').insert(payload)
    if (error) throw error
    await fetch()
  }

  async function deleteProduto(id: string) {
    const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { produtos, loading, refetch: fetch, createProduto, deleteProduto }
}
