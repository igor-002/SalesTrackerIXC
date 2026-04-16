import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type Segmento = Tables<'segmentos'>

export function useSegmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('segmentos').select('*').order('nome')
    setSegmentos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { segmentos, loading, refetch: fetch }
}
