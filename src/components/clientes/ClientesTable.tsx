import { Pencil, Trash2, RefreshCw, ShoppingBag, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatBRL } from '@/lib/formatters'
import type { ClienteComJoins } from '@/hooks/useClientes'

interface ClientesTableProps {
  clientes: ClienteComJoins[]
  loading: boolean
  onAdd: () => void
  onEdit: (cliente: ClienteComJoins) => void
  onDelete: (id: string) => void
}

export function ClientesTable({ clientes, loading, onAdd, onEdit, onDelete }: ClientesTableProps) {
  const mrrTotal = clientes.filter((c) => c.mrr).reduce((s, c) => s + c.valor_pacote, 0)
  const totalClientes = clientes.length

  function handleDelete(c: ClienteComJoins) {
    if (confirm(`Remover cliente "${c.nome}"?`)) onDelete(c.id)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {totalClientes} cliente{totalClientes !== 1 ? 's' : ''} · MRR{' '}
            <span className="font-semibold" style={{ color: '#00d68f' }}>{formatBRL(mrrTotal)}</span>
          </p>
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus size={15} />
          Novo Cliente
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Users size={24} className="text-white/25" />
          </div>
          <p className="text-white/50 font-medium">Nenhum cliente cadastrado</p>
          <p className="text-sm text-white/30">Clique em "Novo Cliente" para começar</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Produto</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Vendedor</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Tipo</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Valor Pacote</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-white/3"
                    style={{ borderBottom: i < clientes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-white font-semibold">{c.nome}</p>
                      <p className="text-xs text-white/35 mt-0.5">
                        {[c.cpf_cnpj, c.uf].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-white/60">{c.produto?.nome ?? '—'}</td>
                    <td className="px-4 py-4 text-white/60">{c.vendedor?.nome ?? '—'}</td>
                    <td className="px-4 py-4 text-center">
                      {c.mrr ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                          <RefreshCw size={11} />
                          MRR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f' }}>
                          <ShoppingBag size={11} />
                          Único
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-white">{formatBRL(c.valor_pacote)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(c)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all duration-150 cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
