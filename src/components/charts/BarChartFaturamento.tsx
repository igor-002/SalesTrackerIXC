import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { formatBRL } from '@/lib/formatters'

interface BarChartFaturamentoProps {
  data: { mes: string; valor: number }[]
  accentHex?: string
}

export function BarChartFaturamento({ data, accentHex = '#3b82f6' }: BarChartFaturamentoProps) {
  const maxVal = Math.max(...data.map((d) => d.valor), 1)

  // derive tooltip bg: darken the accent slightly
  const tooltipBg = accentHex === '#00d68f' ? '#132619' : '#0d1b2e'
  const tooltipBorder = `${accentHex}33`

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip
            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, color: '#fff' }}
            formatter={(v) => [formatBRL(Number(v ?? 0)), 'Faturamento']}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={i === data.length - 1 ? accentHex : `${accentHex}${Math.round((0.25 + (d.valor / maxVal) * 0.5) * 255).toString(16).padStart(2, '0')}`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
