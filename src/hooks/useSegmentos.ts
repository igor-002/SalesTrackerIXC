import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

type Segmento = Tables<'segmentos'>

export function useSegmentos() {
  const [segmentos, setSegmentos] = useState<Segmento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('segmentos').select('*').order('nome').then(({ data }) => {
      setSegmentos(data ?? [])
      setLoading(false)
    })
  }, [])

  return { segmentos, loading }
}
