import { Badge, statusToBadgeVariant } from '@/components/ui/Badge'
import { formatBRL, formatDate } from '@/lib/formatters'
import { ixcStatusLabel } from '@/lib/ixc'

export interface VendaRow {
  id: string
  cliente_nome: string
  cliente_uf?: string | null
  valor_total: number | null
  data_venda: string
  status_ixc?: string | null
  status: { nome: string } | null
  vendedor: { nome: string } | null
}

interface VendasTableProps {
  vendas: VendaRow[]
}

export function VendasTable({ vendas }: VendasTableProps) {
  if (vendas.length === 0) {
    return <p className="text-white/35 text-sm text-center py-8">Nenhuma venda encontrada.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <th className="text-left pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Cliente</th>
            <th className="text-left pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Vendedor</th>
            <th className="text-left pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Data</th>
            <th className="text-right pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Total</th>
            <th className="text-right pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {vendas.map((v, i) => (
            <tr
              key={v.id}
              className="transition-colors hover:bg-white/3"
              style={{ borderBottom: i < vendas.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            >
              <td className="py-3.5">
                <p className="text-white font-semibold">{v.cliente_nome}</p>
                {v.cliente_uf && <p className="text-xs text-white/35 mt-0.5">{v.cliente_uf}</p>}
              </td>
              <td className="py-3.5 text-white/60">{v.vendedor?.nome ?? '-'}</td>
              <td className="py-3.5 text-white/45">{formatDate(v.data_venda)}</td>
              <td className="py-3.5 text-right font-bold text-white">{formatBRL(v.valor_total)}</td>
              <td className="py-3.5 text-right">
                {v.status_ixc
                  ? <Badge variant={statusToBadgeVariant(v.status_ixc)}>{ixcStatusLabel(v.status_ixc)}</Badge>
                  : <Badge variant={statusToBadgeVariant(v.status?.nome ?? '')}>{v.status?.nome ?? '-'}</Badge>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
