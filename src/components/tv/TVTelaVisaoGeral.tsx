import { Repeat2, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import type { TVThemeColors } from './TVCard'
import { formatBRL, formatPercent } from '@/lib/formatters'

interface TVTelaVisaoGeralProps {
  faturamentoReal: number
  faturamentoPrometido: number
  mrrReal: number
  totalAtivos: number
  totalAguardando: number
  taxaConversao: number
  metaMensal: number
  t: TVThemeColors
}

export function TVTelaVisaoGeral({
  faturamentoReal,
  faturamentoPrometido,
  mrrReal,
  totalAtivos,
  totalAguardando,
  taxaConversao,
  metaMensal,
  t,
}: TVTelaVisaoGeralProps) {
  const pctMeta = metaMensal > 0 ? Math.min(100, (faturamentoReal / metaMensal) * 100) : 0
  const convColor = taxaConversao >= 70 ? '#00d68f' : taxaConversao >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-w-full h-full grid grid-cols-2 gap-4">

      {/* Card 1 — MRR Real */}
      <div
        className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${t.primary}22 0%, ${t.primary}08 100%)`,
          border: `1px solid ${t.primary}35`,
          boxShadow: `0 0 50px ${t.primary}18, inset 0 1px 0 ${t.primary}20`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <Repeat2 size={20} style={{ color: t.primary }} />
          <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: t.primary }}>
            MRR Real
          </span>
        </div>
        <div>
          <p className="text-6xl font-black text-white tracking-tight leading-none break-all">
            {formatBRL(mrrReal)}
          </p>
          <p className="text-sm text-white/40 mt-3">Recorrência confirmada</p>
        </div>
        <div
          className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-2xl pointer-events-none"
          style={{ background: t.primary, opacity: 0.12 }}
        />
      </div>

      {/* Card 2 — Contratos Ativos / Meta */}
      <div
        className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${t.primary}18 0%, ${t.primary}05 100%)`,
          border: `1px solid ${t.primary}28`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={20} style={{ color: t.primary }} />
          <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: t.primary }}>
            Contratos Ativos
          </span>
        </div>
        <div>
          <p className="text-8xl font-black text-white tracking-tight leading-none">
            {totalAtivos}
          </p>
          {metaMensal > 0 ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/35">{formatBRL(faturamentoReal)}</span>
                <span className="text-xs text-white/35">meta {formatBRL(metaMensal)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pctMeta}%`, background: t.primary }}
                />
              </div>
              <p className="text-xs text-white/40 mt-1.5">{pctMeta.toFixed(0)}% da meta atingido</p>
            </div>
          ) : (
            <p className="text-sm text-white/40 mt-3">Contratos ativos (A)</p>
          )}
        </div>
        <div
          className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-2xl pointer-events-none"
          style={{ background: t.primary, opacity: 0.08 }}
        />
      </div>

      {/* Card 3 — Aguardando Assinatura */}
      <div
        className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${t.secondary}18 0%, ${t.secondary}05 100%)`,
          border: `1px solid ${t.secondary}28`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <Clock size={20} style={{ color: t.secondary }} />
          <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: t.secondary }}>
            Aguardando
          </span>
        </div>
        <div>
          <p className="text-8xl font-black tracking-tight leading-none" style={{ color: t.secondary }}>
            {totalAguardando}
          </p>
          <p className="text-sm mt-3" style={{ color: `${t.secondary}80` }}>
            Aguardando assinatura (AA)
          </p>
          {faturamentoPrometido > 0 && (
            <p className="text-base font-bold mt-2" style={{ color: '#f59e0b' }}>
              {formatBRL(faturamentoPrometido)} em potencial
            </p>
          )}
        </div>
        <div
          className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-2xl pointer-events-none"
          style={{ background: t.secondary, opacity: 0.1 }}
        />
      </div>

      {/* Card 4 — Taxa de Conversão */}
      <div
        className="rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${convColor}18 0%, ${convColor}05 100%)`,
          border: `1px solid ${convColor}28`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <TrendingUp size={20} style={{ color: convColor }} />
          <span className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: convColor }}>
            Taxa de Conversão
          </span>
        </div>
        <div>
          <p
            className="text-8xl font-black tracking-tight leading-none"
            style={{ color: convColor, textShadow: `0 0 40px ${convColor}60` }}
          >
            {formatPercent(taxaConversao)}
          </p>
          <p className="text-sm text-white/40 mt-3">
            {totalAtivos} de {totalAtivos + totalAguardando} propostas convertidas
          </p>
        </div>
        <div
          className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full blur-2xl pointer-events-none"
          style={{ background: convColor, opacity: 0.1 }}
        />
      </div>

    </div>
  )
}
