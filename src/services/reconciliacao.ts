/**
 * Reconciliação CRM vs. IXC
 *
 * Identifica e corrige divergências entre o status_ixc armazenado no CRM
 * e o status real atual no IXC para todos os contratos vinculados.
 *
 * Divergências tratadas:
 *   AA no CRM → A no IXC   (contrato ativado sem atualização no CRM)
 *   A no CRM  → B no IXC   (contrato bloqueado sem atualização no CRM)
 *   A no CRM  → C no IXC   (contrato cancelado sem atualização no CRM)
 *
 * Resultado registrado em sync_log com tipo = 'reconciliacao'.
 */
import { supabase } from '@/lib/supabase'
import { ixcBuscarStatusContrato } from '@/lib/ixc'

export interface ReconciliacaoResult {
  total: number
  divergencias: number
  atualizadas: number
  erros: number
}

interface VendaParaReconciliar {
  id: string
  codigo_contrato_ixc: string
  status_ixc: string | null
}

async function reconciliarVenda(venda: VendaParaReconciliar): Promise<{
  divergente: boolean
  atualizado: boolean
  erro?: string
}> {
  try {
    const contrato = await ixcBuscarStatusContrato(venda.codigo_contrato_ixc)
    const statusIxc = contrato.status_code
    const statusCrm = venda.status_ixc

    const divergente =
      (statusCrm === 'AA' && statusIxc === 'A') ||
      (statusCrm === 'A'  && (statusIxc === 'B' || statusIxc === 'C'))

    if (!divergente) return { divergente: false, atualizado: false }

    const { error } = await supabase
      .from('vendas')
      .update({ status_ixc: statusIxc, status_atualizado_em: new Date().toISOString() })
      .eq('id', venda.id)

    if (error) throw error
    return { divergente: true, atualizado: true }
  } catch (err) {
    return { divergente: true, atualizado: false, erro: err instanceof Error ? err.message : 'erro desconhecido' }
  }
}

// ── Log helpers (locais) ─────────────────────────────────────────────────────

async function inserirLog(): Promise<string | null> {
  const { data } = await supabase
    .from('sync_log')
    .insert({ tipo: 'reconciliacao', status: 'em_andamento', iniciado_em: new Date().toISOString() })
    .select('id')
    .single()
  return data?.id ?? null
}

async function atualizarLog(id: string, fields: Partial<{
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

// ── Função principal ─────────────────────────────────────────────────────────

// empresaId aceito por assinatura de interface mas empresa_id é preenchido
// automaticamente pelo trigger de RLS do Supabase.
export async function runReconciliacao(_empresaId: string): Promise<ReconciliacaoResult> {
  const iniciadoEm = Date.now()
  const logId = await inserirLog().catch(() => null)

  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('id, codigo_contrato_ixc, status_ixc')
      .not('codigo_contrato_ixc', 'is', null)

    if (error) throw new Error(`Erro ao buscar vendas: ${error.message}`)

    const vendas = (data ?? []) as VendaParaReconciliar[]
    const results = await Promise.allSettled(vendas.map(reconciliarVenda))

    let divergencias = 0, atualizadas = 0, erros = 0
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.divergente)  divergencias++
        if (r.value.atualizado)  atualizadas++
        if (r.value.erro)        erros++
      } else {
        erros++
      }
    }

    const resultado: ReconciliacaoResult = { total: vendas.length, divergencias, atualizadas, erros }

    if (logId) {
      await atualizarLog(logId, {
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
      await atualizarLog(logId, {
        status: 'erro',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        erro_mensagem: err instanceof Error ? err.message : 'erro desconhecido',
      }).catch(() => undefined)
    }
    throw err
  }
}
