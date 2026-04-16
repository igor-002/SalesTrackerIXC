import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type StatusVenda = Tables<'status_venda'>

export function useStatusVenda() {
  const [statuses, setStatuses] = useState<StatusVenda[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('status_venda').select('*').order('nome')
    setStatuses(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { statuses, loading, refetch: fetch }
}
