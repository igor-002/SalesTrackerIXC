import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface VendedorComConfig {
  id: string
  nome: string
  comissao_pct_padrao: number | null
}

interface EmpresaComConfig {
  id: string
  comissao_pct_padrao: number | null
}

export function useComissaoConfig() {
  const queryClient = useQueryClient()

  const { data: empresa, isLoading: loadingEmpresa } = useQuery({
    queryKey: ['comissao-config-empresa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, comissao_pct_padrao')
        .limit(1)
        .single()
      if (error) throw error
      return data as unknown as EmpresaComConfig
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendedoresConfig = [], isLoading: loadingVendedores } = useQuery({
    queryKey: ['comissao-config-vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendedores')
        .select('id, nome, comissao_pct_padrao')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return (data ?? []) as unknown as VendedorComConfig[]
    },
    staleTime: 5 * 60 * 1000,
  })

  async function salvarPadraoGlobal(pct: number | null) {
    if (!empresa) return
    await supabase
      .from('empresas')
      .update({ comissao_pct_padrao: pct } as never)
      .eq('id', empresa.id)
    await queryClient.invalidateQueries({ queryKey: ['comissao-config-empresa'] })
  }

  async function salvarPadraoVendedor(vendedorId: string, pct: number | null) {
    await supabase
      .from('vendedores')
      .update({ comissao_pct_padrao: pct } as never)
      .eq('id', vendedorId)
    await queryClient.invalidateQueries({ queryKey: ['comissao-config-vendedores'] })
  }

  // Resolve o % efetivo para um vendedor: próprio → global → 0
  function resolverPct(vendedorId: string): number {
    const vend = vendedoresConfig.find(v => v.id === vendedorId)
    if (vend?.comissao_pct_padrao != null) return vend.comissao_pct_padrao
    return empresa?.comissao_pct_padrao ?? 0
  }

  return {
    loading: loadingEmpresa || loadingVendedores,
    padraoGlobal: empresa?.comissao_pct_padrao ?? null,
    vendedoresConfig,
    salvarPadraoGlobal,
    salvarPadraoVendedor,
    resolverPct,
  }
}
