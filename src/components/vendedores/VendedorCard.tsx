import { Trash2, Phone, Mail } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatBRL } from '@/lib/formatters'
import type { Tables } from '@/types/database.types'

type Vendedor = Tables<'vendedores'>

interface VendedorCardProps {
  vendedor: Vendedor
  onDelete: (id: string) => void
}

export function VendedorCard({ vendedor, onDelete }: VendedorCardProps) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4" style={{ borderTop: '2px solid #00d68f' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={vendedor.nome} size="lg" />
          <div>
            <p className="font-semibold text-white text-sm leading-tight">{vendedor.nome}</p>
            <span
              className="text-xs px-1.5 py-0.5 rounded-md font-medium mt-1 inline-block"
              style={vendedor.ativo
                ? { color: '#00d68f', background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.2)' }
                : { color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)' }
              }
            >
              {vendedor.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { if (confirm(`Remover ${vendedor.nome}?`)) onDelete(vendedor.id) }}
          className="text-white/25 hover:text-red-400 hover:bg-red-500/8 p-1.5"
          aria-label={`Remover ${vendedor.nome}`}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {vendedor.email && (
          <div className="flex items-center gap-2 text-xs text-white/45">
            <Mail size={12} className="text-white/30 flex-shrink-0" />
            <span className="truncate">{vendedor.email}</span>
          </div>
        )}
        {vendedor.telefone && (
          <div className="flex items-center gap-2 text-xs text-white/45">
            <Phone size={12} className="text-white/30 flex-shrink-0" />
            <span>{vendedor.telefone}</span>
          </div>
        )}
      </div>

      <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs text-white/35 font-medium">Meta Mensal</p>
        <p className="text-sm font-bold" style={{ color: '#00d68f' }}>{formatBRL(vendedor.meta_mensal)}</p>
      </div>
    </div>
  )
}
