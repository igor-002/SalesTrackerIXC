import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/types/database.types'
import { ixcListarVendedores, type IxcVendedor } from '@/lib/ixc'

type Vendedor = Tables<'vendedores'>
type VendedorInsert = TablesInsert<'vendedores'>

export function useVendedores() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendedores')
      .select('*')
      .order('nome')
    if (error) setError(error.message)
    else setVendedores(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function createVendedor(payload: VendedorInsert) {
    const { error } = await supabase.from('vendedores').insert(payload)
    if (error) throw error
    await fetch()
  }

  async function updateVendedor(id: string, payload: Partial<VendedorInsert>) {
    const { error } = await supabase.from('vendedores').update(payload).eq('id', id)
    if (error) throw error
    await fetch()
  }

  async function deleteVendedor(id: string) {
    const { error } = await supabase.from('vendedores').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  /** Ativa um vendedor IXC no CRM (insert se novo, update se já existe). */
  async function syncVendedorIxc(ixcVend: IxcVendedor) {
    const existing = vendedores.find((v) => v.ixc_id === ixcVend.id)
    if (existing) {
      await updateVendedor(existing.id, { ativo: true })
    } else {
      const { error } = await supabase.from('vendedores').insert({
        nome: ixcVend.nome,
        ixc_id: ixcVend.id,
        ativo: true,
      } as never)
      if (error) throw error
      await fetch()
    }
  }

  /** Desativa um vendedor IXC no CRM pelo ixc_id. */
  async function disableVendedorIxc(ixcId: string) {
    const existing = vendedores.find((v) => v.ixc_id === ixcId)
    if (existing) await updateVendedor(existing.id, { ativo: false })
  }

  /**
   * Puxa todos os vendedores ativos do IXC e sincroniza com a tabela `vendedores`.
   * - Vendedor novo: insere como inativo (admin liga o toggle "Ativo" depois).
   * - Vendedor existente: atualiza o nome se mudou (não mexe em ativo/histórico).
   */
  async function syncVendedoresFromIXC(): Promise<{ inseridos: number; atualizados: number; total: number }> {
    const ixcVends = await ixcListarVendedores()

    const { data: emp } = await supabase.from('empresas').select('id').limit(1).single()
    const { data: existentes } = await supabase
      .from('vendedores')
      .select('id, ixc_id, nome')
      .not('ixc_id', 'is', null)

    const byIxc = new Map<string, { id: string; nome: string }>()
    for (const v of (existentes ?? []) as { id: string; ixc_id: string | null; nome: string }[]) {
      if (v.ixc_id) byIxc.set(v.ixc_id, { id: v.id, nome: v.nome })
    }

    let inseridos = 0
    let atualizados = 0

    for (const iv of ixcVends) {
      if (!iv.id || !iv.nome) continue
      const ex = byIxc.get(iv.id)
      if (ex) {
        if (ex.nome !== iv.nome) {
          const { error } = await supabase.from('vendedores').update({ nome: iv.nome }).eq('id', ex.id)
          if (!error) atualizados++
        }
      } else {
        const { error } = await supabase.from('vendedores').insert({
          nome: iv.nome,
          ixc_id: iv.id,
          ativo: false,
          incluir_historico: false,
          empresa_id: emp?.id ?? '',
        } as never)
        if (!error) inseridos++
      }
    }

    await fetch()
    return { inseridos, atualizados, total: ixcVends.length }
  }

  /** Alterna incluir_historico para um vendedor pelo ID. */
  async function toggleIncluirHistorico(vendedorId: string, incluir: boolean) {
    const { error } = await supabase
      .from('vendedores')
      .update({ incluir_historico: incluir })
      .eq('id', vendedorId)
    if (error) throw error
    await fetch()
  }

  return {
    vendedores,
    loading,
    error,
    refetch: fetch,
    createVendedor,
    updateVendedor,
    deleteVendedor,
    syncVendedorIxc,
    disableVendedorIxc,
    syncVendedoresFromIXC,
    toggleIncluirHistorico,
  }
}
