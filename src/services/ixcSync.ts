import { supabase } from '@/lib/supabase'
import { ixcBuscarStatusContrato } from '@/lib/ixc'

const DAY_MS = 1000 * 60 * 60 * 24

export interface SyncResultado {
  atualizadas: number
  erros: number
  total: number
}

interface VendaParaSync {
  id: string
  codigo_contrato_ixc: string
  status_ixc: string | null
  status_atualizado_em: string | null
}

async function sincronizarVenda(venda: VendaParaSync): Promise<{ atualizado: boolean; erro?: string }> {
  try {
    const contrato = await ixcBuscarStatusContrato(venda.codigo_contrato_ixc)
    const newCode = contrato.status_code

    const statusChanged = newCode !== venda.status_ixc
    const now = new Date()

    // Determinar novo status_atualizado_em
    const novoStatusAtualizadoEm = statusChanged
      ? now.toISOString()
      : (venda.status_atualizado_em ?? now.toISOString())

    // Calcular dias em AA usando o campo "data" do IXC como referência real
    const diasEmAa = newCode === 'AA' && contrato.data
      ? Math.floor((now.getTime() - new Date(contrato.data).getTime()) / DAY_MS)
      : null

    // Só atualiza se algo mudou (evita writes desnecessários)
    const deveAtualizar = statusChanged || (newCode === 'AA')
    if (!deveAtualizar) return { atualizado: false }

    const payload: Record<string, unknown> = { dias_em_aa: diasEmAa }
    if (statusChanged) {
      payload.status_ixc = newCode
      payload.status_atualizado_em = novoStatusAtualizadoEm
    }

    const { error } = await supabase.from('vendas').update(payload).eq('id', venda.id)
    if (error) throw error

    return { atualizado: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido'
    return { atualizado: false, erro: msg }
  }
}

export async function sincronizarStatusIxc(): Promise<SyncResultado> {
  // Busca apenas vendas com código de contrato IXC
  const { data, error } = await supabase
    .from('vendas')
    .select('id, codigo_contrato_ixc, status_ixc, status_atualizado_em')
    .not('codigo_contrato_ixc', 'is', null)

  if (error) throw new Error(`Erro ao buscar vendas: ${error.message}`)

  const vendas = (data ?? []) as VendaParaSync[]
  if (!vendas.length) return { atualizadas: 0, erros: 0, total: 0 }

  const results = await Promise.allSettled(vendas.map(sincronizarVenda))

  let atualizadas = 0
  let erros = 0
  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.atualizado) atualizadas++
      if (r.value.erro) erros++
    } else {
      erros++
    }
  }

  return { atualizadas, erros, total: vendas.length }
}
