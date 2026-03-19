import { UserPlus } from 'lucide-react'
import { VendedorCard } from './VendedorCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { Tables } from '@/types/database.types'

type Vendedor = Tables<'vendedores'>

interface VendedoresListProps {
  vendedores: Vendedor[]
  loading: boolean
  onAdd: () => void
  onDelete: (id: string) => void
}

export function VendedoresList({ vendedores, loading, onAdd, onDelete }: VendedoresListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Equipe de Vendas</h2>
          <p className="text-sm text-white/40">{vendedores.length} vendedor{vendedores.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={onAdd} size="sm">
          <UserPlus size={15} />
          Novo Vendedor
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" style={{ color: '#00d68f' }} />
        </div>
      ) : vendedores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(0,214,143,0.08)' }}>
            <UserPlus size={22} style={{ color: 'rgba(0,214,143,0.5)' }} />
          </div>
          <p className="text-white/45 text-sm">Nenhum vendedor cadastrado.</p>
          <p className="text-white/25 text-xs mt-1">Clique em "Novo Vendedor" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vendedores.map((v) => (
            <VendedorCard key={v.id} vendedor={v} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
