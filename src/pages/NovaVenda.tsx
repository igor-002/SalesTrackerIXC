import { useState, useEffect } from 'react'
import { RefreshCw, FolderKanban } from 'lucide-react'
import { NovaVendaForm } from '@/components/vendas/NovaVendaForm'
import { NovaVendaUnicaForm } from '@/components/vendas/NovaVendaUnicaForm'
import type { VendaFormData as NovaVendaFormData } from '@/components/vendas/vendaFormSchema'
import { useVendas } from '@/hooks/useVendas'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/components/ui/Toast'

type TipoVenda = 'recorrente' | 'unica'

const STORAGE_KEY = 'salestracker_nova_venda_draft'

function getSavedTipoVenda(): TipoVenda {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.tipoVenda === 'recorrente' || parsed.tipoVenda === 'unica') {
        return parsed.tipoVenda
      }
    }
  } catch { /* ignore */ }
  return 'recorrente'
}

export default function NovaVenda() {
  const [tipoVenda, setTipoVenda] = useState<TipoVenda>(getSavedTipoVenda)
  const { createVenda } = useVendas()
  const { user } = useAuthStore()

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : {}
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, tipoVenda }))
    } catch { /* ignore */ }
  }, [tipoVenda])

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
              ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]'
              : 'bg-white text-[#71717a] hover:bg-[#f4f4f5] border border-[#e4e4e7]'
          }`}
        >
          <RefreshCw size={18} />
          Venda Recorrente
        </button>
        <button
          onClick={() => setTipoVenda('unica')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
            tipoVenda === 'unica'
              ? 'bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff]'
              : 'bg-white text-[#71717a] hover:bg-[#f4f4f5] border border-[#e4e4e7]'
          }`}
        >
          <FolderKanban size={18} />
          Venda Única (Projeto)
        </button>
      </div>

      {/* Formulários — ambos montados, visibilidade controlada por CSS para evitar re-mount */}
      <div className={tipoVenda === 'recorrente' ? '' : 'hidden'}>
        <NovaVendaForm onSubmit={handleSubmit} />
      </div>
      <div className={tipoVenda === 'unica' ? '' : 'hidden'}>
        <NovaVendaUnicaForm onSuccess={handleVendaUnicaSuccess} onCancel={() => setTipoVenda('recorrente')} />
      </div>
    </div>
  )
}
