import { NovaVendaForm } from '@/components/vendas/NovaVendaForm'
import type { VendaFormData as NovaVendaFormData } from '@/components/vendas/vendaFormSchema'
import { useVendas } from '@/hooks/useVendas'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/components/ui/Toast'

export default function NovaVenda() {
  const { createVenda } = useVendas()
  const { user } = useAuthStore()

  async function handleSubmit(data: NovaVendaFormData) {
    try {
      await createVenda({
        cliente_nome: data.cliente_nome,
        cliente_cpf_cnpj: data.cliente_cpf_cnpj || null,
        cliente_uf: data.cliente_uf || null,
        codigo_cliente_ixc: data.codigo_cliente_ixc || null,
        codigo_contrato_ixc: data.codigo_contrato_ixc || null,
        vendedor_id: data.vendedor_id,
        segmento_id: data.segmento_id || null,
        status_ixc: data.status_ixc || null,
        data_venda: data.data_venda,
        mrr: data.mrr,
        quantidade: data.quantidade,
        valor_unitario: data.valor_unitario,
        comissao_pct: data.comissao_pct,
        descricao: data.descricao || null,
        produtos: data.produtos?.length ? (data.produtos as never) : null,
        created_by: user?.id ?? null,
      })
      toast('success', 'Venda registrada com sucesso!')
    } catch {
      toast('error', 'Erro ao registrar venda.')
    }
  }

  return (
    <div>
      <NovaVendaForm onSubmit={handleSubmit} />
    </div>
  )
}
