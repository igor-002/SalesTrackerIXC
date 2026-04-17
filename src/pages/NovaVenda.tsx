import { useState } from 'react'
import { RefreshCw, FolderKanban } from 'lucide-react'
import { NovaVendaForm } from '@/components/vendas/NovaVendaForm'
import { NovaVendaUnicaForm } from '@/components/vendas/NovaVendaUnicaForm'
import type { VendaFormData as NovaVendaFormData } from '@/components/vendas/vendaFormSchema'
import { useVendas } from '@/hooks/useVendas'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/components/ui/Toast'

type TipoVenda = 'recorrente' | 'unica'

export default function NovaVenda() {
  const [tipoVenda, setTipoVenda] = useState<TipoVenda>('recorrente')
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

  function handleVendaUnicaSuccess() {
    toast('success', 'Venda única registrada com sucesso!')
    setTipoVenda('recorrente')
  }

  return (
    <div>
      {/* Toggle tipo de venda */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTipoVenda('recorrente')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
            tipoVenda === 'recorrente'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
          }`}
        >
          <RefreshCw size={18} />
          Venda Recorrente
        </button>
        <button
          onClick={() => setTipoVenda('unica')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
            tipoVenda === 'unica'
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
          }`}
        >
          <FolderKanban size={18} />
          Venda Única (Projeto)
        </button>
      </div>

      {/* Formulário correspondente */}
      {tipoVenda === 'recorrente' ? (
        <NovaVendaForm onSubmit={handleSubmit} />
      ) : (
        <NovaVendaUnicaForm onSuccess={handleVendaUnicaSuccess} onCancel={() => setTipoVenda('recorrente')} />
      )}
    </div>
  )
}
