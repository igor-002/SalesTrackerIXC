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

// ── Helpers de log ────────────────────────────────────────────────────────────

async function inserirLogSync(tipo: string): Promise<string | null> {
  const { data } = await supabase
    .from('sync_log')
    .insert({ tipo, status: 'em_andamento', iniciado_em: new Date().toISOString() })
    .select('id')
    .single()
  return data?.id ?? null
}

async function atualizarLogSync(id: string, fields: Partial<{
  status: string
  finalizado_em: string
  duracao_ms: number
  registros_processados: number
  registros_atualizados: number
  registros_erro: number
  erro_mensagem: string
}>): Promise<void> {
  await supabase.from('sync_log').update(fields).eq('id', id)
}

// ── Sync principal ────────────────────────────────────────────────────────────

export async function sincronizarStatusIxc(): Promise<SyncResultado> {
  const iniciadoEm = Date.now()
  // Log não-fatal: se falhar, o sync continua normalmente
  const logId = await inserirLogSync('ixc_contratos').catch(() => null)

  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('id, codigo_contrato_ixc, status_ixc, status_atualizado_em')
      .not('codigo_contrato_ixc', 'is', null)

    if (error) throw new Error(`Erro ao buscar vendas: ${error.message}`)

    const vendas = (data ?? []) as VendaParaSync[]

    let resultado: SyncResultado
    if (!vendas.length) {
      resultado = { atualizadas: 0, erros: 0, total: 0 }
    } else {
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
      resultado = { atualizadas, erros, total: vendas.length }
    }

    if (logId) {
      await atualizarLogSync(logId, {
        status: 'sucesso',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        registros_processados: resultado.total,
        registros_atualizados: resultado.atualizadas,
        registros_erro: resultado.erros,
      }).catch(() => undefined)
    }

    return resultado
  } catch (err) {
    if (logId) {
      await atualizarLogSync(logId, {
        status: 'erro',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        erro_mensagem: err instanceof Error ? err.message : 'erro desconhecido',
      }).catch(() => undefined)
    }
    throw err
  }
}
