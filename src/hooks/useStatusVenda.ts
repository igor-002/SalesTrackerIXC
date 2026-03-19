import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type StatusVenda = Tables<'status_venda'>

export function useStatusVenda() {
  const [statuses, setStatuses] = useState<StatusVenda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('status_venda').select('*').order('nome').then(({ data }) => {
      setStatuses(data ?? [])
      setLoading(false)
    })
  }, [])

  return { statuses, loading }
}
