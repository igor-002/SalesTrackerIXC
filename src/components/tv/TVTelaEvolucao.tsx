import { AreaChart, Area, LabelList, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { TVThemeColors } from './TVCard'
import { formatBRL } from '@/lib/formatters'

interface TVTelaEvolucaoProps {
  mrr6Meses: { mes: string; valor: number }[]
  t: TVThemeColors
}

function formatCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${v.toFixed(0)}`
}

export function TVTelaEvolucao({ mrr6Meses, t }: TVTelaEvolucaoProps) {
  const ultimo = mrr6Meses[mrr6Meses.length - 1]
  const mesAtualLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  if (mrr6Meses.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <p className="text-2xl font-bold text-white/30">Sem dados de MRR</p>
      </div>
    )
  }

  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: `${t.primary}99` }}>
          Evolução do MRR
        </p>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          Últimos 6 meses
        </span>
      </div>

      <div
        className="flex-1 rounded-3xl p-6 flex flex-col min-h-0"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${t.primary}25`,
          borderTop: `2px solid ${t.primary}`,
          boxShadow: `0 0 40px ${t.primary}10`,
        }}
      >
        {/* Gráfico */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mrr6Meses} margin={{ top: 52, right: 30, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={t.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={t.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={t.primary}
                strokeWidth={3}
                fill="url(#mrrGrad)"
                dot={{ fill: t.primary, r: 8, strokeWidth: 2, stroke: 'rgba(255,255,255,0.2)' }}
                activeDot={{ r: 10, fill: t.primary, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
              >
                <LabelList
                  dataKey="valor"
                  position="top"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => formatCompact(Number(v))}
                  style={{ fill: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 700 }}
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Rodapé: valor do mês mais recente em destaque */}
        {ultimo && (
          <div
            className="flex-shrink-0 pt-5 mt-2 text-center"
            style={{ borderTop: `1px solid ${t.primary}20` }}
          >
            <p className="text-sm text-white/35 uppercase tracking-widest font-bold mb-1 capitalize">
              {mesAtualLabel}
            </p>
            <p
              className="text-3xl font-black"
              style={{ color: t.primary, textShadow: `0 0 30px ${t.primary}60` }}
            >
              {formatBRL(ultimo.valor)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
