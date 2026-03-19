import { Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatBRL } from '@/lib/formatters'
import { MESES } from '@/constants'
import type { Tables } from '@/types/database.types'

type Meta = Tables<'metas'>

interface MetasHistoricoProps {
  metas: Meta[]
  loading: boolean
  onDelete: (id: string) => void
}

export function MetasHistorico({ metas, loading, onDelete }: MetasHistoricoProps) {
  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-white mb-5">Histórico de Metas</h3>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner style={{ color: '#00d68f' }} /></div>
      ) : metas.length === 0 ? (
        <p className="text-white/35 text-sm text-center py-8">Nenhuma meta definida ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Período</th>
                <th className="text-right pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Meta Mensal</th>
                <th className="text-right pb-3 text-xs font-semibold text-white/35 uppercase tracking-wider">Meta Semanal</th>
                <th className="w-10 pb-3" />
              </tr>
            </thead>
            <tbody>
              {metas.map((m, i) => (
                <tr
                  key={m.id}
                  className="hover:bg-white/3 transition-colors"
                  style={{ borderBottom: i < metas.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <td className="py-3 text-white font-semibold">{MESES[m.mes - 1]} {m.ano}</td>
                  <td className="py-3 text-right font-semibold" style={{ color: '#00d68f' }}>{formatBRL(m.meta_mensal)}</td>
                  <td className="py-3 text-right font-semibold text-cyan-400">{formatBRL(m.meta_semanal)}</td>
                  <td className="py-3 text-right">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { if (confirm('Remover esta meta?')) onDelete(m.id) }}
                      className="text-white/25 hover:text-red-400 p-1"
                      aria-label="Remover meta"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}
