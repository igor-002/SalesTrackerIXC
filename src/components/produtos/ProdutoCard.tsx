import { Trash2, RefreshCw, ShoppingBag } from 'lucide-react'
import { formatBRL } from '@/lib/formatters'
import type { Tables } from '@/types/database.types'

type Produto = Tables<'produtos'>

interface ProdutoCardProps {
  produto: Produto
  onDelete: (id: string) => void
}

export function ProdutoCard({ produto, onDelete }: ProdutoCardProps) {
  const accentHex = produto.recorrente ? '#06b6d4' : '#00d68f'

  function handleDelete() {
    if (confirm(`Remover "${produto.nome}"?`)) onDelete(produto.id)
  }

  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ borderTop: `2px solid ${accentHex}` }}
    >
      {/* Icon + Badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentHex}18`, color: accentHex }}
        >
          {produto.recorrente ? <RefreshCw size={18} /> : <ShoppingBag size={18} />}
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={produto.recorrente
            ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }
            : { background: 'rgba(0,214,143,0.12)', color: '#00d68f' }
          }
        >
          {produto.recorrente ? 'Recorrente' : 'Único'}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1">
        <p className="text-base font-bold text-white leading-tight">{produto.nome}</p>
        {produto.descricao && (
          <p className="text-xs text-white/40 mt-1 line-clamp-2">{produto.descricao}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-lg font-bold text-white">
            {produto.preco_base != null ? formatBRL(produto.preco_base) : '—'}
          </p>
          {produto.recorrente && (
            <p className="text-xs text-white/35">/mês</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
          title="Remover produto"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Decorative circle */}
      <div
        className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.06]"
        style={{ background: accentHex }}
      />
    </div>
  )
}
