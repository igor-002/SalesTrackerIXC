import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ixcBuscarStatusContrato, ixcConfigurado } from '@/lib/ixc'
import type { VendaComJoins } from '@/hooks/useVendas'

export interface IxcSyncResult {
  vendaId: string
  clienteNome: string
  statusAnterior: string
  statusNovo: string
  atualizado: boolean
  erro?: string
}

export function useIxcSync() {
  const [syncing, setSyncing] = useState(false)

  /**
   * Sincroniza o status de uma única venda consultando o contrato no IXC
   * e atualizando o status_id no Supabase se houver correspondência.
   */
  async function syncVenda(venda: VendaComJoins, statusMap: Record<string, string>): Promise<IxcSyncResult> {
    const base: IxcSyncResult = {
      vendaId: venda.id,
      clienteNome: venda.cliente_nome,
      statusAnterior: venda.status?.nome ?? '',
      statusNovo: '',
      atualizado: false,
    }

    if (!venda.codigo_contrato_ixc) {
      return { ...base, erro: 'sem código de contrato IXC' }
    }

    try {
      const contrato = await ixcBuscarStatusContrato(venda.codigo_contrato_ixc)
      base.statusNovo = contrato.status

      // Busca o status_id correspondente ao nome retornado pelo IXC
      const novoStatusId = statusMap[contrato.status.toLowerCase()]
      if (!novoStatusId) {
        return { ...base, erro: `status "${contrato.status}" não mapeado` }
      }

      // Só atualiza se mudou
      if (novoStatusId === venda.status?.id) {
        return { ...base, atualizado: false }
      }

      const { error } = await supabase
        .from('vendas')
        .update({ status_id: novoStatusId })
        .eq('id', venda.id)

      if (error) throw error

      return { ...base, atualizado: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro desconhecido'
      return { ...base, erro: msg }
    }
  }

  /**
   * Sincroniza todas as vendas que possuem codigo_contrato_ixc preenchido.
   * statusOptions: lista de { id, nome } dos status cadastrados no sistema.
   */
  async function syncTodos(
    vendas: VendaComJoins[],
    statusOptions: { id: string; nome: string }[]
  ): Promise<IxcSyncResult[]> {
    if (!ixcConfigurado()) {
      throw new Error('Integração IXC não configurada. Verifique VITE_IXC_BASE_URL e VITE_IXC_TOKEN.')
    }

    // Mapa nome_em_minúsculas → id (ex: "ativo" → uuid)
    const statusMap: Record<string, string> = {}
    for (const s of statusOptions) {
      statusMap[s.nome.toLowerCase()] = s.id
    }

    const comCodigo = vendas.filter((v) => v.codigo_contrato_ixc)

    setSyncing(true)
    try {
      const results = await Promise.allSettled(
        comCodigo.map((v) => syncVenda(v, statusMap))
      )
      return results.map((r) =>
        r.status === 'fulfilled' ? r.value : { vendaId: '', clienteNome: '', statusAnterior: '', statusNovo: '', atualizado: false, erro: String(r.reason) }
      )
    } finally {
      setSyncing(false)
    }
  }

  return { syncTodos, syncing }
}
