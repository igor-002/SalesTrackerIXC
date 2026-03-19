import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ProdutoCard } from './ProdutoCard'
import type { Tables } from '@/types/database.types'

type Produto = Tables<'produtos'>

interface ProdutosListProps {
  produtos: Produto[]
  loading: boolean
  onAdd: () => void
  onDelete: (id: string) => void
}

export function ProdutosList({ produtos, loading, onAdd, onDelete }: ProdutosListProps) {
  const ativos = produtos.filter((p) => p.ativo !== false)
  const recorrentes = ativos.filter((p) => p.recorrente)
  const unicos = ativos.filter((p) => !p.recorrente)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Produtos</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {ativos.length} produto{ativos.length !== 1 ? 's' : ''} cadastrado{ativos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={onAdd} size="sm">
          <Plus size={15} />
          Novo Produto
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : ativos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Package size={24} className="text-white/25" />
          </div>
          <p className="text-white/50 font-medium">Nenhum produto cadastrado</p>
          <p className="text-sm text-white/30">Clique em "Novo Produto" para começar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {recorrentes.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">
                Recorrentes · {recorrentes.length}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recorrentes.map((p) => (
                  <ProdutoCard key={p.id} produto={p} onDelete={onDelete} />
                ))}
              </div>
            </section>
          )}
          {unicos.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">
                Sem recorrência · {unicos.length}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {unicos.map((p) => (
                  <ProdutoCard key={p.id} produto={p} onDelete={onDelete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
