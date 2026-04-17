/**
 * Hook de Vendas Únicas (Projetos & Serviços)
 *
 * REGRAS DE NEGÓCIO:
 * - Vendas únicas NÃO entram no cálculo de meta mensal/semanal
 * - Vendas únicas NÃO entram no MRR
 * - Faturamento real = soma das parcelas com status_pagamento = 'pago'
 * - valor_total é apenas referência; receita real é valor_recebido
 */
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ixcBuscarAreceberPorVenda, ixcBuscarAreceberPorId } from '@/lib/ixc'
import type { Tables, TablesInsert } from '@/types/database.types'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type VendaUnica = Tables<'vendas_unicas'>
export type VendaUnicaParcela = Tables<'vendas_unicas_parcelas'>

export interface VendaUnicaComParcelas extends VendaUnica {
  parcelas_lista: VendaUnicaParcela[]
  vendedor: { id: string; nome: string } | null
  // Calculados
  valor_recebido: number
  valor_pendente: number
  valor_em_atraso: number
  progresso_pct: number
  status_geral: 'quitado' | 'em_dia' | 'parcial' | 'em_atraso' | 'pendente' | 'cancelado'
}

export interface VendasUnicasStats {
  total_projetos: number
  valor_vendido: number
  valor_recebido: number
  valor_pendente: number
  valor_em_atraso: number
}

export type VendaUnicaInsert = Omit<TablesInsert<'vendas_unicas'>, 'id' | 'empresa_id' | 'created_at'>

// ── Helpers de cálculo ───────────────────────────────────────────────────────

function calcularMetricasVenda(venda: VendaUnica, parcelas: VendaUnicaParcela[]): {
  valor_recebido: number
  valor_pendente: number
  valor_em_atraso: number
  progresso_pct: number
  status_geral: VendaUnicaComParcelas['status_geral']
} {
  if (venda.status === 'cancelado') {
    return { valor_recebido: 0, valor_pendente: 0, valor_em_atraso: 0, progresso_pct: 0, status_geral: 'cancelado' }
  }

  const valor_recebido = parcelas
    .filter(p => p.status_pagamento === 'pago')
    .reduce((acc, p) => acc + (p.valor_pago ?? p.valor), 0)

  const valor_pendente = parcelas
    .filter(p => p.status_pagamento === 'a_receber')
    .reduce((acc, p) => acc + p.valor, 0)

  const valor_em_atraso = parcelas
    .filter(p => p.status_pagamento === 'em_atraso')
    .reduce((acc, p) => acc + p.valor, 0)

  const progresso_pct = venda.valor_total > 0
    ? Math.round((valor_recebido / venda.valor_total) * 100)
    : 0

  let status_geral: VendaUnicaComParcelas['status_geral'] = 'pendente'
  if (valor_em_atraso > 0) {
    status_geral = 'em_atraso'
  } else if (valor_recebido >= venda.valor_total) {
    status_geral = 'quitado'
  } else if (valor_recebido > 0) {
    status_geral = 'parcial'
  } else if (valor_pendente > 0) {
    status_geral = 'em_dia'
  }

  return { valor_recebido, valor_pendente, valor_em_atraso, progresso_pct, status_geral }
}

function mapStatusIxcParaLocal(statusIxc: string): VendaUnicaParcela['status_pagamento'] {
  // IXC: "A receber", "Recebimento em dia", "Recebimento em atraso"
  const lower = statusIxc.toLowerCase()
  if (lower.includes('em dia') || lower === 'recebimento em dia') return 'pago'
  if (lower.includes('atraso')) return 'em_atraso'
  if (lower.includes('cancelad')) return 'cancelado'
  return 'a_receber'
}

// ── Queries ──────────────────────────────────────────────────────────────────

const VENDAS_UNICAS_SELECT = `
  *,
  vendedor:vendedores(id, nome),
  parcelas_lista:vendas_unicas_parcelas(*)
`

async function fetchVendasUnicas(): Promise<VendaUnicaComParcelas[]> {
  const { data, error } = await supabase
    .from('vendas_unicas')
    .select(VENDAS_UNICAS_SELECT)
    .order('data_venda', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const parcelas = (row.parcelas_lista ?? []) as VendaUnicaParcela[]
    const metricas = calcularMetricasVenda(row as VendaUnica, parcelas)
    return {
      ...(row as VendaUnica),
      parcelas_lista: parcelas,
      vendedor: row.vendedor as { id: string; nome: string } | null,
      ...metricas,
    }
  })
}

async function fetchVendaUnicaById(id: string): Promise<VendaUnicaComParcelas | null> {
  const { data, error } = await supabase
    .from('vendas_unicas')
    .select(VENDAS_UNICAS_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const parcelas = (data.parcelas_lista ?? []) as VendaUnicaParcela[]
  const metricas = calcularMetricasVenda(data as VendaUnica, parcelas)
  return {
    ...(data as VendaUnica),
    parcelas_lista: parcelas,
    vendedor: data.vendedor as { id: string; nome: string } | null,
    ...metricas,
  }
}

// ── Hook principal: useVendasUnicas ──────────────────────────────────────────

export function useVendasUnicas() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['vendas-unicas'],
    queryFn: fetchVendasUnicas,
    staleTime: 5 * 60 * 1000,
  })

  async function createVendaUnica(payload: VendaUnicaInsert): Promise<string> {
    const { data, error } = await supabase
      .from('vendas_unicas')
      .insert(payload)
      .select('id')
      .single()

    if (error) throw error
    queryClient.invalidateQueries({ queryKey: ['vendas-unicas'] })
    return data.id
  }

  async function updateVendaUnica(id: string, payload: Partial<VendaUnicaInsert>) {
    const { error } = await supabase
      .from('vendas_unicas')
      .update(payload)
      .eq('id', id)

    if (error) throw error
    queryClient.invalidateQueries({ queryKey: ['vendas-unicas'] })
  }

  async function deleteVendaUnica(id: string) {
    // Deletar parcelas primeiro (cascade não configurado)
    await supabase.from('vendas_unicas_parcelas').delete().eq('venda_unica_id', id)
    const { error } = await supabase.from('vendas_unicas').delete().eq('id', id)
    if (error) throw error
    queryClient.invalidateQueries({ queryKey: ['vendas-unicas'] })
  }

  // Estatísticas agregadas
  const stats: VendasUnicasStats = {
    total_projetos: 0,
    valor_vendido: 0,
    valor_recebido: 0,
    valor_pendente: 0,
    valor_em_atraso: 0,
  }

  if (query.data) {
    const ativos = query.data.filter(v => v.status !== 'cancelado')
    stats.total_projetos = ativos.length
    stats.valor_vendido = ativos.reduce((acc, v) => acc + v.valor_total, 0)
    stats.valor_recebido = ativos.reduce((acc, v) => acc + v.valor_recebido, 0)
    stats.valor_pendente = ativos.reduce((acc, v) => acc + v.valor_pendente, 0)
    stats.valor_em_atraso = ativos.reduce((acc, v) => acc + v.valor_em_atraso, 0)
  }

  return {
    vendas: query.data ?? [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['vendas-unicas'] }),
    createVendaUnica,
    updateVendaUnica,
    deleteVendaUnica,
    stats,
  }
}

// ── Hook: useVendaUnicaById ──────────────────────────────────────────────────

export function useVendaUnicaById(id: string | null) {
  return useQuery({
    queryKey: ['venda-unica', id],
    queryFn: () => (id ? fetchVendaUnicaById(id) : null),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  })
}

// ── Sync de parcelas do IXC ──────────────────────────────────────────────────

export async function syncParcelasFromIxc(idVendaUnica: string): Promise<{ atualizadas: number; erros: number }> {
  // Buscar a venda única
  const { data: venda, error: vendaError } = await supabase
    .from('vendas_unicas')
    .select('id, id_venda_ixc, ids_areceber')
    .eq('id', idVendaUnica)
    .single()

  if (vendaError || !venda) throw new Error('Venda única não encontrada')
  if (!venda.id_venda_ixc && !venda.ids_areceber) {
    return { atualizadas: 0, erros: 0 }
  }

  let boletos: Awaited<ReturnType<typeof ixcBuscarAreceberPorVenda>> = []

  // Tentar buscar por id_venda primeiro
  if (venda.id_venda_ixc) {
    try {
      boletos = await ixcBuscarAreceberPorVenda(venda.id_venda_ixc)
    } catch {
      // Ignorar erro, tentar por IDs individuais
    }
  }

  // Se não encontrou por venda, tentar por IDs individuais
  if (!boletos.length && venda.ids_areceber) {
    const ids = venda.ids_areceber.split(',').map(s => s.trim()).filter(Boolean)
    const results = await Promise.allSettled(ids.map(id => ixcBuscarAreceberPorId(id)))
    boletos = results
      .filter((r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof ixcBuscarAreceberPorId>>>> =>
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value)
  }

  if (!boletos.length) return { atualizadas: 0, erros: 0 }

  let atualizadas = 0
  let erros = 0

  for (let i = 0; i < boletos.length; i++) {
    const boleto = boletos[i]
    const statusLocal = mapStatusIxcParaLocal(boleto.status)
    const valorPago = boleto.valor_baixado > 0 ? boleto.valor_baixado : null
    const dataPagamento = statusLocal === 'pago' ? boleto.data_pagamento : null

    try {
      // Upsert: verificar se já existe
      const { data: existing } = await supabase
        .from('vendas_unicas_parcelas')
        .select('id')
        .eq('venda_unica_id', idVendaUnica)
        .eq('id_areceber_ixc', boleto.id)
        .maybeSingle()

      if (existing) {
        // Update
        await supabase
          .from('vendas_unicas_parcelas')
          .update({
            valor: boleto.valor,
            data_vencimento: boleto.data_vencimento,
            status_pagamento: statusLocal,
            valor_pago: valorPago,
            data_pagamento: dataPagamento,
            ultima_atualizacao: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        // Insert
        await supabase
          .from('vendas_unicas_parcelas')
          .insert({
            venda_unica_id: idVendaUnica,
            id_areceber_ixc: boleto.id,
            numero_parcela: i + 1,
            valor: boleto.valor,
            data_vencimento: boleto.data_vencimento,
            status_pagamento: statusLocal,
            valor_pago: valorPago,
            data_pagamento: dataPagamento,
            ultima_atualizacao: new Date().toISOString(),
          })
      }
      atualizadas++
    } catch {
      erros++
    }
  }

  return { atualizadas, erros }
}

// ── Sync de todas as vendas únicas ───────────────────────────────────────────

export interface SyncVendasUnicasResult {
  total: number
  atualizadas: number
  erros: number
}

export async function syncAllVendasUnicas(): Promise<SyncVendasUnicasResult> {
  const iniciadoEm = Date.now()

  // Inserir log
  const { data: logData } = await supabase
    .from('sync_log')
    .insert({ tipo: 'vendas_unicas', status: 'em_andamento', iniciado_em: new Date().toISOString() })
    .select('id')
    .single()
  const logId = logData?.id ?? null

  try {
    // Buscar vendas com vínculo IXC
    const { data: vendas, error } = await supabase
      .from('vendas_unicas')
      .select('id')
      .or('id_venda_ixc.not.is.null,ids_areceber.not.is.null')

    if (error) throw error

    const total = vendas?.length ?? 0
    let atualizadas = 0
    let erros = 0

    // Sincronizar cada venda
    for (const venda of vendas ?? []) {
      try {
        const result = await syncParcelasFromIxc(venda.id)
        atualizadas += result.atualizadas
        erros += result.erros
      } catch {
        erros++
      }
    }

    // Atualizar log
    if (logId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'sucesso',
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - iniciadoEm,
          registros_processados: total,
          registros_atualizados: atualizadas,
          registros_erro: erros,
        })
        .eq('id', logId)
    }

    return { total, atualizadas, erros }
  } catch (err) {
    if (logId) {
      await supabase
        .from('sync_log')
        .update({
          status: 'erro',
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - iniciadoEm,
          erro_mensagem: err instanceof Error ? err.message : 'erro desconhecido',
        })
        .eq('id', logId)
    }
    throw err
  }
}

// ── Hook para stats do mês (TV Dashboard e Dashboard) ────────────────────────

export function useVendasUnicasMes() {
  const now = new Date()
  const inicioMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  return useQuery({
    queryKey: ['vendas-unicas-mes', inicioMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas_unicas')
        .select(VENDAS_UNICAS_SELECT)
        .gte('data_venda', inicioMes)
        .order('data_venda', { ascending: false })

      if (error) throw error

      const vendas = (data ?? []).map((row) => {
        const parcelas = (row.parcelas_lista ?? []) as VendaUnicaParcela[]
        const metricas = calcularMetricasVenda(row as VendaUnica, parcelas)
        return {
          ...(row as VendaUnica),
          parcelas_lista: parcelas,
          vendedor: row.vendedor as { id: string; nome: string } | null,
          ...metricas,
        }
      })

      const ativos = vendas.filter(v => v.status !== 'cancelado')

      return {
        vendas,
        stats: {
          total_projetos: ativos.length,
          valor_vendido: ativos.reduce((acc, v) => acc + v.valor_total, 0),
          valor_recebido: ativos.reduce((acc, v) => acc + v.valor_recebido, 0),
          valor_pendente: ativos.reduce((acc, v) => acc + v.valor_pendente, 0),
          valor_em_atraso: ativos.reduce((acc, v) => acc + v.valor_em_atraso, 0),
        },
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
