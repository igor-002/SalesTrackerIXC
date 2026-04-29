import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { TVThemeColors } from './TVCard'
import { formatBRL } from '@/lib/formatters'

interface TVTelaEvolucaoProps {
  mrr6Meses: { mes: string; valor: number }[]
  t: TVThemeColors
}

export function TVTelaEvolucao({ mrr6Meses, t }: TVTelaEvolucaoProps) {
  const tooltipBg = t.primary === '#00d68f' ? '#132619' : '#0d1b2e'
  const monthLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

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
          className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
          style={{ background: `${t.primary}12`, color: `${t.primary}cc`, border: `1px solid ${t.primary}20` }}
        >
          {monthLabel}
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
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mrr6Meses} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={t.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={t.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${t.primary}33`,
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                }}
                formatter={(v) => [formatBRL(Number(v ?? 0)), 'MRR']}
                cursor={{ stroke: `${t.primary}40`, strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={t.primary}
                strokeWidth={3}
                fill="url(#mrrGrad)"
                dot={{ fill: t.primary, r: 5, strokeWidth: 0 }}
                activeDot={{ r: 8, fill: t.primary, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
