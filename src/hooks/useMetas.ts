import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type Meta = Tables<'metas'>

interface UpsertMetaPayload {
  ano: number
  mes: number
  meta_mensal: number
  meta_semanal: number
}

export function useMetas() {
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('metas')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
    setMetas(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function upsertMeta(payload: UpsertMetaPayload) {
    const { error } = await supabase
      .from('metas')
      // empresa_id é setado automaticamente pelo trigger — cast necessário para o TS
      .upsert(payload as never, { onConflict: 'ano,mes' })
    if (error) throw error
    await fetch()
  }

  async function deleteMeta(id: string) {
    const { error } = await supabase.from('metas').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  function getMetaAtual(): Meta | null {
    const now = new Date()
    return metas.find(
      (m) => m.ano === now.getFullYear() && m.mes === now.getMonth() + 1
    ) ?? null
  }

  return { metas, loading, refetch: fetch, upsertMeta, deleteMeta, getMetaAtual }
}
