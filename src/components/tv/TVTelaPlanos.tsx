import { BarChart2 } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import type { PlanoStat } from '@/hooks/useTVStats'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface TVTelaPlanosProps {
  planosMes: PlanoStat[]
  t: TVThemeColors
}

export function TVTelaPlanos({ planosMes, t }: TVTelaPlanosProps) {
  if (planosMes.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <BarChart2 size={52} style={{ color: t.primary, opacity: 0.35 }} />
        <p className="text-2xl font-bold text-white/30">Nenhum contrato ativo este mês</p>
      </div>
    )
  }

  const maxQtd = planosMes[0].qtd || 1
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const totalGeral = planosMes.reduce((s, p) => s + p.total, 0)
  const qtdGeral   = planosMes.reduce((s, p) => s + p.qtd, 0)
  const ticketMedioGeral = qtdGeral > 0 ? totalGeral / qtdGeral : 0

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Planos do Mês
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {monthLabel}
        </span>
      </div>

      {/* Lista */}
      <div
        className="flex-1 rounded-3xl overflow-hidden min-h-0 flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid rgba(255,255,255,0.08)`,
          borderTop: `2px solid ${t.primary}`,
        }}
      >
        {/* Cabeçalho fixo */}
        <div
          className="grid text-[11px] font-black uppercase tracking-widest text-white/25 px-8 py-4 flex-shrink-0"
          style={{ gridTemplateColumns: '1fr 200px 90px 120px', gap: '1.5rem', background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span>Plano / Segmento</span>
          <span>Proporção</span>
          <span className="text-right">Contratos</span>
          <span className="text-right">Faturamento</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {planosMes.map((p, i) => {
            const pct = Math.round((p.qtd / maxQtd) * 100)
            const isFirst = i === 0

            return (
              <div
                key={p.nome}
                className="grid items-center px-8 py-5 border-b"
                style={{
                  gridTemplateColumns: '1fr 200px 90px 120px',
                  gap: '1.5rem',
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                  background: isFirst ? `${t.primary}08` : undefined,
                }}
              >
                {/* Nome */}
                <span
                  className="font-bold truncate"
                  style={{
                    fontSize: isFirst ? '1.3rem' : '1.05rem',
                    color: isFirst ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                  }}
                >
                  {p.nome}
                </span>

                {/* Barra proporcional */}
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: isFirst ? t.primary : `${t.primary}55` }}
                  />
                </div>

                {/* Qtd */}
                <span
                  className="text-right font-black tabular-nums text-xl"
                  style={{ color: isFirst ? t.primary : `${t.primary}80` }}
                >
                  {formatNumber(p.qtd)}
                </span>

                {/* Total */}
                <span
                  className="text-right tabular-nums font-semibold"
                  style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)' }}
                >
                  {formatBRL(p.total)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé: ticket médio geral */}
      <div
        className="flex-shrink-0 flex items-center justify-end px-6 py-3 rounded-2xl"
        style={{ background: `${t.primary}0a`, border: `1px solid ${t.primary}18` }}
      >
        <span className="text-sm text-white/40 mr-3">Ticket médio geral do mês</span>
        <span className="text-xl font-black tabular-nums" style={{ color: t.primary }}>
          {formatBRL(ticketMedioGeral)}
        </span>
      </div>
    </div>
  )
}
