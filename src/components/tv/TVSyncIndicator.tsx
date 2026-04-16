/**
 * Indicador discreto de última sincronização IXC para o TV Dashboard.
 * Exibe no footer, canto direito.
 *
 * Verde  — sync há < 30 min
 * Amarelo — sync há 30–60 min
 * Vermelho — sync há > 60 min OU último status foi erro
 */
import { useSyncStatus } from '@/hooks/useSyncStatus'

function minutosAtras(isoDate: string | null): number | null {
  if (!isoDate) return null
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

function horasAtras(mins: number): string {
  const h = Math.floor(mins / 60)
  return h === 1 ? '1h' : `${h}h`
}

export function TVSyncIndicator() {
  const { data: ultimo } = useSyncStatus()

  if (!ultimo) return null

  const mins = minutosAtras(ultimo.finalizado_em ?? ultimo.iniciado_em)
  const isErro = ultimo.status === 'erro'

  let cor: string
  let texto: string

  if (isErro) {
    cor = '#ef4444'
    texto = 'IXC: erro'
  } else if (mins === null) {
    return null
  } else if (mins > 60) {
    cor = '#ef4444'
    texto = `IXC: sem sync há ${horasAtras(mins)}`
  } else if (mins >= 30) {
    cor = '#f59e0b'
    texto = `IXC: há ${mins} min`
  } else {
    cor = '#00d68f'
    texto = mins < 1 ? 'IXC: agora' : `IXC: há ${mins} min`
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cor, boxShadow: `0 0 4px ${cor}` }}
      />
      <span className="text-[10px] font-medium tabular-nums" style={{ color: `${cor}99` }}>
        {texto}
      </span>
    </div>
  )
}
