import { TrendingUp, DollarSign, Users, Repeat2, Award } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { VendasTable } from '@/components/vendas/VendasTable'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { formatBRL, formatNumber } from '@/lib/formatters'

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  sub?: string
  accentHex: string
}

function StatCard({ label, value, icon, sub, accentHex }: StatCardProps) {
  return (
    <div
      className="glass rounded-2xl p-5 relative overflow-hidden"
      style={{ borderTop: `2px solid ${accentHex}` }}
    >
      <div className="mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accentHex}18`, color: accentHex }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-0.5 tracking-tight">{value}</p>
      <p className="text-xs font-medium text-white/50">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.08]" style={{ background: accentHex }} />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse" style={{ borderTop: '2px solid rgba(255,255,255,0.08)' }}>
      <div className="w-9 h-9 bg-white/8 rounded-xl mb-3" />
      <div className="h-7 bg-white/8 rounded-lg w-2/3 mb-2" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
  )
}

export default function Dashboard() {
  const { stats, loading } = useDashboardStats()
  const now = new Date()
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-white">Visão Geral</h2>
        <p className="text-sm text-white/40 font-medium">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Faturamento do Mês" value={formatBRL(stats.faturamentoMes)} icon={<DollarSign size={18} />} accentHex="#00d68f" />
            <StatCard label="Total de Vendas" value={formatNumber(stats.vendasMes)} icon={<TrendingUp size={18} />} accentHex="#06b6d4" sub={`${stats.vendasUnicasMes} únicas`} />
            <StatCard label="Comissões" value={formatBRL(stats.comissoesMes)} icon={<Award size={18} />} accentHex="#f59e0b" />
            <StatCard label="MRR" value={formatBRL(stats.mrrTotal)} icon={<Repeat2 size={18} />} accentHex="#00d68f" sub="Receita recorrente" />
            <StatCard label="Vendas Únicas" value={formatNumber(stats.vendasUnicasMes)} icon={<Users size={18} />} accentHex="#06b6d4" />
          </>
        )}
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Últimas Vendas</h3>
            <p className="text-xs text-white/40 mt-0.5">Registros mais recentes</p>
          </div>
          <a
            href="/nova-venda"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
          >
            + Nova venda
          </a>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Spinner style={{ color: '#00d68f' }} /></div>
        ) : (
          <VendasTable vendas={stats.ultimasVendas as any} />
        )}
      </GlassCard>
    </div>
  )
}
