import { AreaChart, Area, LabelList, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { TVThemeColors } from './TVCard'
import { formatBRL } from '@/lib/formatters'

interface TVTelaEvolucaoProps {
  mrr6Meses: { mes: string; valor: number }[]
  mrrPotencial6Meses: { mes: string; valor: number }[]
  t: TVThemeColors
}

function formatCompact(v: number): string {
  if (v === 0) return ''
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`
  return `R$ ${v.toFixed(0)}`
}

const AMBER = '#f59e0b'
const AMBER_LABEL = '#fbbf24'

// Estilo de label com outline escuro simulando sombra de texto (paintOrder não suportado
// via prop style em SVG em todos os browsers, então usamos stroke como fallback)
const LABEL_CONFIRMADO = {
  fill: '#ffffff',
  fontSize: 18,
  fontWeight: 'bold',
  stroke: 'rgba(0,0,0,0.65)',
  strokeWidth: 4,
  paintOrder: 'stroke',
} as React.CSSProperties

const LABEL_POTENCIAL = {
  fill: AMBER_LABEL,
  fontSize: 18,
  fontWeight: 'bold',
  stroke: 'rgba(0,0,0,0.55)',
  strokeWidth: 4,
  paintOrder: 'stroke',
} as React.CSSProperties

export function TVTelaEvolucao({ mrr6Meses, mrrPotencial6Meses, t }: TVTelaEvolucaoProps) {
  const mesAtualLabel = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  if (mrr6Meses.length === 0) {
    return (
      <div className="min-w-full h-full flex flex-col items-center justify-center gap-6">
        <p className="text-2xl font-bold text-white/30">Sem dados de MRR</p>
      </div>
    )
  }

  // Merge confirmado + potencial por posição (mesmos meses, mesma ordem)
  // slice(-6) já foi aplicado no Dashboard — aqui apenas exibimos todos os 6
  const chartData = mrr6Meses.map((d, i) => ({
    mes: d.mes,
    confirmado: d.valor,
    potencial: mrrPotencial6Meses[i]?.valor ?? 0,
  }))

  // Remove meses zerados do início (não do meio) — evita área vazia à esquerda
  const firstWithData = chartData.findIndex(d => d.confirmado > 0 || d.potencial > 0)
  const dadosFiltrados = firstWithData >= 0 ? chartData.slice(firstWithData) : chartData

  const ultimo = dadosFiltrados[dadosFiltrados.length - 1]

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
            <AreaChart data={dadosFiltrados} margin={{ top: 60, right: 30, left: 10, bottom: 0 }}>
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

              {/* Linha confirmada (área preenchida) */}
              <Area
                type="monotone"
                dataKey="confirmado"
                stroke={t.primary}
                strokeWidth={3}
                fill="url(#mrrGrad)"
                dot={{ fill: t.primary, r: 8, strokeWidth: 2, stroke: 'rgba(255,255,255,0.2)' }}
                activeDot={{ r: 10, fill: t.primary, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
              >
                <LabelList
                  dataKey="confirmado"
                  position="top"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => formatCompact(Number(v))}
                  style={LABEL_CONFIRMADO}
                />
              </Area>

              {/* Linha potencial (tracejada, sem área) */}
              <Area
                type="monotone"
                dataKey="potencial"
                stroke={AMBER}
                strokeWidth={2.5}
                strokeDasharray="5 5"
                fill="none"
                dot={{ fill: AMBER, r: 8, strokeWidth: 2, stroke: 'rgba(255,255,255,0.15)' }}
                activeDot={{ r: 10, fill: AMBER, strokeWidth: 2, stroke: 'rgba(255,255,255,0.25)' }}
              >
                <LabelList
                  dataKey="potencial"
                  position="top"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => formatCompact(Number(v))}
                  style={LABEL_POTENCIAL}
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda */}
        <div className="flex-shrink-0 flex items-center justify-center gap-6 py-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: t.primary, boxShadow: `0 0 8px ${t.primary}` }}
            />
            <span className="text-sm font-semibold text-white/55">MRR Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: AMBER, boxShadow: `0 0 8px ${AMBER}80` }}
            />
            <span className="text-sm font-semibold text-white/55">MRR Potencial (aguardando)</span>
          </div>
        </div>

        {/* Rodapé: valores do mês mais recente */}
        {ultimo && (
          <div
            className="flex-shrink-0 pt-4 mt-1 flex items-center justify-center gap-6"
            style={{ borderTop: `1px solid ${t.primary}18` }}
          >
            <div className="text-center">
              <p className="text-xs text-white/35 uppercase tracking-widest font-bold mb-1 capitalize">
                {mesAtualLabel} — Confirmado
              </p>
              <p
                className="text-2xl font-black"
                style={{ color: t.primary, textShadow: `0 0 20px ${t.primary}60` }}
              >
                {formatBRL(ultimo.confirmado)}
              </p>
            </div>
            <div className="w-px h-10 bg-white/10 flex-shrink-0" />
            <div className="text-center">
              <p className="text-xs text-white/35 uppercase tracking-widest font-bold mb-1">
                Potencial
              </p>
              <p className="text-2xl font-black" style={{ color: AMBER_LABEL }}>
                {formatBRL(ultimo.potencial)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
