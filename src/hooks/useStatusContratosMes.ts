import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface StatusContratosMes {
  ativos: number
  valorAtivos: number
  aguardando: number
  valorAguardando: number
  naoAtivados: number
  parados30d: number
  cancelados: number
  bloqueados: number
}

const EMPTY: StatusContratosMes = {
  ativos: 0,
  valorAtivos: 0,
  aguardando: 0,
  valorAguardando: 0,
  naoAtivados: 0,
  parados30d: 0,
  cancelados: 0,
  bloqueados: 0,
}

export function useStatusContratosMes(mes: number, ano: number) {
  const [stats, setStats] = useState<StatusContratosMes>(EMPTY)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)

    const { data } = await supabase
      .from('vendas')
      .select('status_ixc, valor_total, tags')
      .eq('mes_referencia', mes)
      .eq('ano_referencia', ano)

    const vendas = data ?? []

    let ativos = 0, valorAtivos = 0
    let aguardando = 0, valorAguardando = 0
    let naoAtivados = 0, parados30d = 0
    let cancelados = 0, bloqueados = 0

    for (const v of vendas) {
      const status = v.status_ixc ?? ''
      const valor = v.valor_total ?? 0

      if (status === 'A') {
        ativos++
        valorAtivos += valor
      } else if (status === 'AA' || status === 'P') {
        aguardando++
        valorAguardando += valor
        naoAtivados++
        if (v.tags?.includes('antigo')) parados30d++
      } else if (status === 'CN') {
        cancelados++
      } else if (status === 'CM' || status === 'FA') {
        bloqueados++
      }
    }

    setStats({ ativos, valorAtivos, aguardando, valorAguardando, naoAtivados, parados30d, cancelados, bloqueados })
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, refetch: fetch }
}
