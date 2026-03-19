import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatBRL } from '@/lib/formatters'

interface TVMetaAreaChartProps {
  data: { dia: string; valor: number }[]
  metaMensal: number
  mrrTotal: number
  accentHex?: string
}

export function TVMetaAreaChart({ data, metaMensal, mrrTotal, accentHex = '#3b82f6' }: TVMetaAreaChartProps) {
  const pct = metaMensal > 0 ? Math.min(100, (mrrTotal / metaMensal) * 100) : 0
  const daysInMonth = 31
  const daysElapsed = data.length
  const dailyTarget = metaMensal > 0 ? metaMensal / daysInMonth : 0
  const gradientId = `tvMetaGrad_${accentHex.replace('#', '')}`

  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col h-full relative overflow-hidden"
      style={{ borderTop: `2px solid ${accentHex}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentHex}18` }}>
            <TrendingUp size={15} style={{ color: accentHex }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Meta MRR</p>
            <p className="text-xs text-white/40">{daysElapsed} dias registrados</p>
          </div>
        </div>
        <p className="text-lg font-bold" style={{ color: accentHex }}>{pct.toFixed(1)}%</p>
      </div>

      {/* Values */}
      <p className="text-2xl font-bold text-white leading-none mb-0.5 flex-shrink-0">{formatBRL(mrrTotal)}</p>
      <p className="text-xs text-white/40 mb-3 flex-shrink-0">
        Meta: <span className="text-white/60 font-medium">{formatBRL(metaMensal)}</span>
      </p>

      {/* Chart */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentHex} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accentHex} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="dia"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(data.length / 4)}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: '#0d1b2e', border: `1px solid ${accentHex}33`, borderRadius: 10, color: '#fff', fontSize: 12 }}
              formatter={(v) => [formatBRL(Number(v ?? 0)), 'MRR']}
              labelFormatter={(l) => `Dia ${l}`}
              cursor={{ stroke: `${accentHex}44`, strokeWidth: 1 }}
            />
            {dailyTarget > 0 && (
              <ReferenceLine
                y={dailyTarget}
                stroke={accentHex}
                strokeDasharray="4 3"
                strokeOpacity={0.35}
                strokeWidth={1.5}
              />
            )}
            <Area
              type="monotone"
              dataKey="valor"
              stroke={accentHex}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: accentHex, stroke: '#fff', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
