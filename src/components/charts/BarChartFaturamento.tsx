import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'
import { formatBRL } from '@/lib/formatters'

interface BarChartFaturamentoProps {
  data: { mes: string; valor: number }[]
  mrrData?: { mes: string; valor: number }[]
  accentHex?: string
}

export function BarChartFaturamento({ data, mrrData, accentHex = '#3b82f6' }: BarChartFaturamentoProps) {
  const maxVal = Math.max(...data.map((d) => d.valor), 1)

  const tooltipBg = accentHex === '#00d68f' ? '#132619' : '#0d1b2e'
  const tooltipBorder = `${accentHex}33`

  // Merge faturamento + MRR into single dataset keyed by mes
  const mrrMap = new Map((mrrData ?? []).map((d) => [d.mes, d.valor]))
  const chartData = data.map((d) => ({
    mes: d.mes,
    valor: d.valor,
    mrr: mrrMap.get(d.mes) ?? 0,
  }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip
            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, color: '#fff' }}
            formatter={(v, name) => [
              formatBRL(Number(v ?? 0)),
              name === 'mrr' ? 'MRR Real' : 'Faturamento',
            ]}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          {mrrData && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingTop: 4 }}
              formatter={(value) => value === 'mrr' ? 'MRR Real' : 'Faturamento'}
            />
          )}
          <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={i === chartData.length - 1 ? accentHex : `${accentHex}${Math.round((0.25 + (d.valor / maxVal) * 0.5) * 255).toString(16).padStart(2, '0')}`}
              />
            ))}
          </Bar>
          {mrrData && (
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="mrr"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
