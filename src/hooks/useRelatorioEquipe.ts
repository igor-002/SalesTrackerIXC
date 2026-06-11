/**
 * Hook do Relatório Consolidado da Equipe (visão do gestor).
 * Agrega a tabela `relatorio_diario` num intervalo de datas, gerando:
 * totais, ranking por vendedor, evolução por dia, produtos e funil de atividade.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProdutoVendido } from '@/hooks/useRelatorioDiario'

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface RelEquipeRow {
  id: string
  vendedor_id: string
  vendedor_nome: string
  data_relatorio: string
  leads: number
  contatos: number
  calls_reunioes: number
  vendas: number
  valor_total: number
  observacoes: string | null
  produtos_vendidos: ProdutoVendido[]
}

export interface TotaisEquipe {
  leads: number
  contatos: number
  calls_reunioes: number
  vendas: number
  valor: number
  registros: number
  diasComRegistro: number
  vendedoresAtivos: number
  ticketMedio: number
  taxaConversao: number   // vendas ÷ contatos
}

export interface VendedorEquipe {
  vendedor_id: string
  nome: string
  leads: number
  contatos: number
  calls_reunioes: number
  vendas: number
  valor: number
  dias: number
  ticketMedio: number
  taxaConversao: number
  produtos: number
}

export interface DiaEquipe {
  data: string
  label: string        // dd/mm
  leads: number
  contatos: number
  calls_reunioes: number
  vendas: number
  valor: number
}

export interface ProdutoEquipe {
  nome: string
  qtd: number
  valor: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function labelDia(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useRelatorioEquipe(inicio: string, fim: string) {
  const habilitado = Boolean(inicio && fim && inicio <= fim)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['relatorio-equipe', inicio, fim],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorio_diario')
        .select('id, vendedor_id, data_relatorio, leads, contatos, calls_reunioes, vendas, valor_total, observacoes, produtos_vendidos, vendedor:vendedores(nome)')
        .gte('data_relatorio', inicio)
        .lte('data_relatorio', fim)
        .order('data_relatorio', { ascending: true })
      if (error) throw error

      return (data ?? []).map(r => {
        const v = r as unknown as {
          id: string; vendedor_id: string; data_relatorio: string
          leads: number; contatos: number; calls_reunioes: number; vendas: number; valor_total: number
          observacoes: string | null; produtos_vendidos: unknown
          vendedor: { nome: string } | null
        }
        return {
          id: v.id,
          vendedor_id: v.vendedor_id,
          vendedor_nome: v.vendedor?.nome ?? 'Sem vendedor',
          data_relatorio: v.data_relatorio,
          leads: v.leads ?? 0,
          contatos: v.contatos ?? 0,
          calls_reunioes: v.calls_reunioes ?? 0,
          vendas: v.vendas ?? 0,
          valor_total: v.valor_total ?? 0,
          observacoes: v.observacoes,
          produtos_vendidos: Array.isArray(v.produtos_vendidos)
            ? (v.produtos_vendidos as ProdutoVendido[])
            : [],
        } as RelEquipeRow
      })
    },
    staleTime: 60 * 1000,
  })

  const totais = useMemo((): TotaisEquipe => {
    const leads = rows.reduce((s, r) => s + r.leads, 0)
    const contatos = rows.reduce((s, r) => s + r.contatos, 0)
    const calls = rows.reduce((s, r) => s + r.calls_reunioes, 0)
    const vendas = rows.reduce((s, r) => s + r.vendas, 0)
    const valor = rows.reduce((s, r) => s + r.valor_total, 0)
    const dias = new Set(rows.map(r => r.data_relatorio)).size
    const vendedores = new Set(rows.map(r => r.vendedor_id)).size
    return {
      leads, contatos, calls_reunioes: calls, vendas, valor,
      registros: rows.length,
      diasComRegistro: dias,
      vendedoresAtivos: vendedores,
      ticketMedio: vendas > 0 ? valor / vendas : 0,
      taxaConversao: contatos > 0 ? (vendas / contatos) * 100 : 0,
    }
  }, [rows])

  const porVendedor = useMemo((): VendedorEquipe[] => {
    const map = new Map<string, VendedorEquipe & { _dias: Set<string> }>()
    for (const r of rows) {
      let v = map.get(r.vendedor_id)
      if (!v) {
        v = {
          vendedor_id: r.vendedor_id, nome: r.vendedor_nome,
          leads: 0, contatos: 0, calls_reunioes: 0, vendas: 0, valor: 0,
          dias: 0, ticketMedio: 0, taxaConversao: 0, produtos: 0,
          _dias: new Set<string>(),
        }
        map.set(r.vendedor_id, v)
      }
      v.leads += r.leads
      v.contatos += r.contatos
      v.calls_reunioes += r.calls_reunioes
      v.vendas += r.vendas
      v.valor += r.valor_total
      v.produtos += r.produtos_vendidos.length
      v._dias.add(r.data_relatorio)
    }
    return Array.from(map.values())
      .map(v => ({
        vendedor_id: v.vendedor_id, nome: v.nome,
        leads: v.leads, contatos: v.contatos, calls_reunioes: v.calls_reunioes,
        vendas: v.vendas, valor: v.valor, produtos: v.produtos,
        dias: v._dias.size,
        ticketMedio: v.vendas > 0 ? v.valor / v.vendas : 0,
        taxaConversao: v.contatos > 0 ? (v.vendas / v.contatos) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [rows])

  const porDia = useMemo((): DiaEquipe[] => {
    const map = new Map<string, DiaEquipe>()
    for (const r of rows) {
      let d = map.get(r.data_relatorio)
      if (!d) {
        d = { data: r.data_relatorio, label: labelDia(r.data_relatorio), leads: 0, contatos: 0, calls_reunioes: 0, vendas: 0, valor: 0 }
        map.set(r.data_relatorio, d)
      }
      d.leads += r.leads
      d.contatos += r.contatos
      d.calls_reunioes += r.calls_reunioes
      d.vendas += r.vendas
      d.valor += r.valor_total
    }
    return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data))
  }, [rows])

  const produtos = useMemo((): ProdutoEquipe[] => {
    const map = new Map<string, ProdutoEquipe>()
    for (const r of rows) {
      for (const p of r.produtos_vendidos) {
        const nome = p.nome.trim() || 'Sem nome'
        const e = map.get(nome) ?? { nome, qtd: 0, valor: 0 }
        e.qtd += 1
        e.valor += p.valor ?? 0
        map.set(nome, e)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor)
  }, [rows])

  return { rows, loading: isLoading, habilitado, totais, porVendedor, porDia, produtos }
}
