import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type MetaVendedor = Tables<'metas_vendedor'>

export function useMetasVendedor(mes: number, ano: number) {
  const [metas, setMetas] = useState<MetaVendedor[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('metas_vendedor')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
    setMetas(data ?? [])
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { fetch() }, [fetch])

  async function upsertMeta(vendedor_id: string, meta_contratos: number) {
    const { error } = await supabase
      .from('metas_vendedor')
      .upsert(
        { vendedor_id, mes, ano, meta_contratos, empresa_id: '' } as never,
        { onConflict: 'empresa_id,vendedor_id,mes,ano' },
      )
    if (error) throw error
    await fetch()
  }

  async function deleteMeta(id: string) {
    const { error } = await supabase.from('metas_vendedor').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  function getMetaVendedor(vendedor_id: string): number {
    return metas.find(m => m.vendedor_id === vendedor_id)?.meta_contratos ?? 0
  }

  return { metas, loading, refetch: fetch, upsertMeta, deleteMeta, getMetaVendedor }
}
