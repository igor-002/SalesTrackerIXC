import { DollarSign, Repeat2, TrendingUp } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import { BarChartFaturamento } from '@/components/charts/BarChartFaturamento'
import { formatBRL } from '@/lib/formatters'

interface TVTelaVisaoGeralProps {
  faturamentoReal: number
  faturamentoPrometido: number
  mrrReal: number
  mrrProjetado: number
  faturamento12Meses: { mes: string; valor: number }[]
  mrr12Meses?: { mes: string; valor: number }[]
  t: TVThemeColors
}

export function TVTelaVisaoGeral({
  faturamentoReal,
  faturamentoPrometido,
  mrrReal,
  mrrProjetado,
  faturamento12Meses,
  mrr12Meses,
  t,
}: TVTelaVisaoGeralProps) {
  return (
    <div className="min-w-full h-full flex flex-col gap-4">

      <div className="flex-1 grid gap-4 min-h-0" style={{ gridTemplateColumns: '1fr 1.9fr' }}>

        {/* ── Esquerda: métricas ── */}
        <div className="flex flex-col gap-4 min-h-0">

          {/* REALIDADE — bloco brilhante */}
          <div
            className="flex-1 rounded-3xl p-7 relative overflow-hidden flex flex-col justify-between"
            style={{
              background: `linear-gradient(145deg, ${t.primary}22 0%, ${t.primary}08 100%)`,
              border: `1px solid ${t.primary}35`,
              boxShadow: `0 0 50px ${t.primary}18, inset 0 1px 0 ${t.primary}20`,
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: t.primary, boxShadow: `0 0 12px ${t.primary}` }}
              />
              <span className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: t.primary }}>
                Realidade
              </span>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 gap-5 flex-1 items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} style={{ color: t.primary, opacity: 0.7 }} />
                  <span className="text-xs text-white/40 uppercase tracking-wider">Faturamento</span>
                </div>
                <p className="text-5xl font-black text-white tracking-tight leading-none break-all">
                  {formatBRL(faturamentoReal)}
                </p>
                <p className="text-xs text-white/30 mt-2">Contratos ativos (A)</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Repeat2 size={16} style={{ color: t.primary, opacity: 0.7 }} />
                  <span className="text-xs text-white/40 uppercase tracking-wider">MRR</span>
                </div>
                <p className="text-4xl font-black tracking-tight leading-none break-all" style={{ color: t.primary }}>
                  {formatBRL(mrrReal)}
                </p>
                <p className="text-xs text-white/30 mt-2">Recorrência confirmada</p>
              </div>
            </div>

            {/* Orb glow */}
            <div
              className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-2xl pointer-events-none"
              style={{ background: t.primary, opacity: 0.12 }}
            />
          </div>

          {/* PROMESSAS — bloco apagado */}
          <div
            className="flex-1 rounded-3xl p-7 relative overflow-hidden flex flex-col justify-between"
            style={{
              background: `linear-gradient(145deg, ${t.secondary}14 0%, transparent 100%)`,
              border: `1px dashed ${t.secondary}28`,
            }}
          >
            {/* Label */}
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 opacity-60"
                style={{ background: t.secondary }}
              />
              <span className="text-xs font-black uppercase tracking-[0.25em] opacity-60" style={{ color: t.secondary }}>
                Cadastrado
              </span>
            </div>

            {/* Valores — mais apagados */}
            <div className="grid grid-cols-2 gap-5 flex-1 items-center">
              <div className="opacity-65">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} style={{ color: t.secondary, opacity: 0.7 }} />
                  <span className="text-xs text-white/35 uppercase tracking-wider">Fat. Prometido</span>
                </div>
                <p className="text-4xl font-black tracking-tight leading-none break-all" style={{ color: t.secondary }}>
                  {formatBRL(faturamentoPrometido)}
                </p>
                <p className="text-xs text-white/25 mt-2">Aguardando assinatura</p>
              </div>
              <div className="opacity-50">
                <div className="flex items-center gap-2 mb-2">
                  <Repeat2 size={16} className="text-white/30" />
                  <span className="text-xs text-white/30 uppercase tracking-wider">MRR Projetado</span>
                </div>
                <p className="text-3xl font-black text-white/50 tracking-tight leading-none break-all">
                  {formatBRL(mrrProjetado)}
                </p>
                <p className="text-xs text-white/20 mt-2">Recorrência projetada</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Direita: gráfico 12 meses ── */}
        <div
          className="rounded-3xl p-6 flex flex-col min-h-0"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${t.primary}25`,
            borderTop: `2px solid ${t.primary}`,
            boxShadow: `0 0 40px ${t.primary}10`,
          }}
        >
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4 flex-shrink-0">
            Faturamento — Últimos 12 Meses
          </p>
          <div className="flex-1 min-h-0">
            <BarChartFaturamento data={faturamento12Meses} mrrData={mrr12Meses} accentHex={t.primary} />
          </div>
        </div>

      </div>
    </div>
  )
}
