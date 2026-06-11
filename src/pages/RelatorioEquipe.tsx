/**
 * Relatório Consolidado da Equipe — visão do gestor.
 * Filtra um período e agrega tudo que os atendentes preencheram no Relatório Diário,
 * com dashboard (KPIs + gráficos) e exportação em PDF formatado.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import {
  BarChart3, Users, Phone, Target, FileText,
  TrendingUp, ShoppingBag,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { useRelatorioEquipe, type VendedorEquipe, type ProdutoEquipe, type TotaisEquipe } from '@/hooks/useRelatorioEquipe'
import { formatBRL, formatPercent } from '@/lib/formatters'

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: Date) => d.toISOString().split('T')[0]
function fmtBR(iso: string) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

function inicioMesAtual() {
  const n = new Date()
  return fmtDate(new Date(n.getFullYear(), n.getMonth(), 1))
}

type Preset = 'mes' | 'mesAnterior' | 'semana' | 'ultimos30' | 'range'

// ── Tooltip escuro ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string; dataKey?: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl" style={{ background: '#0f2419', border: '1px solid rgba(0,214,143,0.2)' }}>
      {label && <p className="text-white/50 mb-1.5 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'valor' ? formatBRL(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, accentHex, sub }: {
  label: string; value: string; icon: React.ReactNode; accentHex: string; sub?: string
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderTop: `2px solid ${accentHex}` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accentHex}18`, color: accentHex }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        <p className="text-xs font-medium text-white/50 mt-0.5">{label}</p>
        {sub && <p className="text-xs mt-0.5 text-white/30">{sub}</p>}
      </div>
      <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accentHex }} />
    </div>
  )
}

// ── Geração de PDF ────────────────────────────────────────────────────────────

async function gerarPDF(
  inicio: string, fim: string, empresaNome: string,
  totais: TotaisEquipe, porVendedor: VendedorEquipe[], produtos: ProdutoEquipe[],
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = 297, pageH = 210, marginL = 14, marginR = 14
  const contentW = pageW - marginL - marginR
  const headerGreen: [number, number, number] = [26, 58, 42]

  // Header
  doc.setFillColor(...headerGreen)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text('RELATÓRIO CONSOLIDADO DA EQUIPE', pageW / 2, 12, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(empresaNome, marginL, 22)
  doc.text(`Período: ${fmtBR(inicio)} a ${fmtBR(fim)}`, pageW - marginR, 22, { align: 'right' })

  // KPIs
  const kpiY = 33, kpiH = 20, gap = 4
  const kpis = [
    { title: 'VENDAS FECHADAS', value: String(totais.vendas), sub: formatBRL(totais.valor) },
    { title: 'CONTATOS', value: String(totais.contatos), sub: `${totais.leads} leads` },
    { title: 'CALLS / REUNIÕES', value: String(totais.calls_reunioes), sub: `${totais.diasComRegistro} dias com registro` },
    { title: 'TAXA DE CONVERSÃO', value: `${totais.taxaConversao.toFixed(1)}%`, sub: `ticket ${formatBRL(totais.ticketMedio)}` },
  ]
  const kpiW = (contentW - gap * 3) / 4
  kpis.forEach((kpi, i) => {
    const x = marginL + i * (kpiW + gap)
    doc.setFillColor(240, 247, 244); doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F')
    doc.setDrawColor(180, 220, 200); doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'S')
    doc.setTextColor(26, 58, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
    doc.text(kpi.title, x + kpiW / 2, kpiY + 6, { align: 'center' })
    doc.setFontSize(15); doc.text(kpi.value, x + kpiW / 2, kpiY + 13, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 110, 95)
    doc.text(kpi.sub, x + kpiW / 2, kpiY + 18, { align: 'center' })
  })

  const headStyles = { fillColor: headerGreen, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 8 }
  const altRows = { fillColor: [240, 247, 244] as [number, number, number] }
  const tblStyles = { fontSize: 8, cellPadding: 2.5 }
  const tblLine = { tableLineColor: [200, 220, 210] as [number, number, number], tableLineWidth: 0.1 }

  // Ranking por vendedor
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...headerGreen)
  doc.text('DESEMPENHO POR VENDEDOR', marginL, kpiY + kpiH + 8)
  autoTable(doc, {
    startY: kpiY + kpiH + 11,
    head: [['VENDEDOR', 'DIAS', 'LEADS', 'CONTATOS', 'CALLS', 'VENDAS', 'CONV.', 'VALOR']],
    body: [
      ...porVendedor.map(v => [
        v.nome, String(v.dias), String(v.leads), String(v.contatos),
        String(v.calls_reunioes), String(v.vendas), `${v.taxaConversao.toFixed(0)}%`, formatBRL(v.valor),
      ]),
      ['TOTAL', '', String(totais.leads), String(totais.contatos), String(totais.calls_reunioes),
        String(totais.vendas), `${totais.taxaConversao.toFixed(0)}%`, formatBRL(totais.valor)],
    ],
    headStyles, alternateRowStyles: altRows, styles: tblStyles,
    margin: { left: marginL, right: marginR }, ...tblLine,
    didParseCell: (data: any) => {
      if (data.row.index === porVendedor.length) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 247, 244]
        data.cell.styles.textColor = headerGreen
      }
    },
  })

  // Produtos vendidos no período
  if (produtos.length > 0) {
    const y = (doc as any).lastAutoTable.finalY + 8
    const totalProd = produtos.reduce((s, p) => s + p.valor, 0)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...headerGreen)
    doc.text('PRODUTOS VENDIDOS NO PERÍODO', marginL, y - 2)
    autoTable(doc, {
      startY: y + 1,
      head: [['PRODUTO', 'QTD', 'VALOR']],
      body: [
        ...produtos.map(p => [p.nome, String(p.qtd), formatBRL(p.valor)]),
        ['TOTAL', String(produtos.reduce((s, p) => s + p.qtd, 0)), formatBRL(totalProd)],
      ],
      headStyles, alternateRowStyles: altRows, styles: tblStyles,
      margin: { left: marginL, right: marginR }, ...tblLine,
      didParseCell: (data: any) => {
        if (data.row.index === produtos.length) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [240, 247, 244]
          data.cell.styles.textColor = headerGreen
        }
      },
    })
  }

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY ?? 180
  doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  doc.text(`${empresaNome} · Gerado em ${new Date().toLocaleString('pt-BR')}`, pageW / 2, Math.min(finalY + 8, pageH - 5), { align: 'center' })

  doc.save(`relatorio-equipe-${inicio}_a_${fim}.pdf`)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RelatorioEquipe() {
  const { permissoes, vendedorDbId } = useAuthStore()
  const isGestor = Boolean(permissoes?.relatorios) && !vendedorDbId

  const [preset, setPreset] = useState<Preset>('mes')
  const [inicio, setInicio] = useState(inicioMesAtual())
  const [fim, setFim] = useState(fmtDate(new Date()))
  const [pendingIni, setPendingIni] = useState('')
  const [pendingFim, setPendingFim] = useState('')
  const [gerandoPDF, setGerandoPDF] = useState(false)

  function aplicarPreset(p: Preset) {
    setPreset(p)
    const hoje = new Date()
    if (p === 'mes') {
      setInicio(inicioMesAtual()); setFim(fmtDate(hoje))
    } else if (p === 'mesAnterior') {
      const m = hoje.getMonth() === 0 ? 11 : hoje.getMonth() - 1
      const a = hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear()
      setInicio(fmtDate(new Date(a, m, 1)))
      setFim(fmtDate(new Date(a, m + 1, 0)))
    } else if (p === 'semana') {
      const dow = hoje.getDay(); const back = dow === 0 ? 6 : dow - 1
      const start = new Date(hoje); start.setDate(hoje.getDate() - back)
      setInicio(fmtDate(start)); setFim(fmtDate(hoje))
    } else if (p === 'ultimos30') {
      const start = new Date(hoje); start.setDate(hoje.getDate() - 29)
      setInicio(fmtDate(start)); setFim(fmtDate(hoje))
    }
  }

  function aplicarRange() {
    if (!pendingIni || !pendingFim || pendingIni > pendingFim) return
    setInicio(pendingIni); setFim(pendingFim); setPreset('range')
  }

  const { loading, totais, porVendedor, porDia, produtos } = useRelatorioEquipe(inicio, fim)

  const { data: empresa } = useQuery({
    queryKey: ['empresa-nome'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('nome').limit(1).single()
      return data?.nome ?? 'SalesTracker'
    },
    staleTime: Infinity,
  })

  const temDados = totais.registros > 0

  const dadosVendedorChart = useMemo(
    () => porVendedor.map(v => ({ nome: v.nome.split(' ')[0], vendas: v.vendas, valor: v.valor })),
    [porVendedor],
  )

  async function handlePDF() {
    setGerandoPDF(true)
    try {
      await gerarPDF(inicio, fim, empresa ?? 'SalesTracker', totais, porVendedor, produtos)
    } finally {
      setGerandoPDF(false)
    }
  }

  if (!isGestor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <BarChart3 size={32} className="text-white/20" />
        <p className="text-sm text-white/40">Acesso restrito ao gestor.</p>
      </div>
    )
  }

  const btns: { key: Preset; label: string }[] = [
    { key: 'mes', label: 'Este mês' },
    { key: 'mesAnterior', label: 'Mês anterior' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'ultimos30', label: 'Últimos 30 dias' },
    { key: 'range', label: 'Período livre' },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} style={{ color: '#00d68f' }} />
            Relatório Consolidado da Equipe
          </h2>
          <p className="text-sm text-white/40 mt-0.5">Atividades que os atendentes preencheram no período</p>
        </div>
        <Button variant="secondary" onClick={handlePDF} loading={gerandoPDF} disabled={!temDados}>
          <FileText size={14} className="mr-1.5" />
          Gerar PDF
        </Button>
      </div>

      {/* Filtros de período */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {btns.map(({ key, label }) => {
              const ativo = preset === key
              return (
                <button
                  key={key}
                  onClick={() => key === 'range' ? setPreset('range') : aplicarPreset(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  style={ativo
                    ? { background: 'rgba(0,214,143,0.18)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.35)' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {preset === 'range' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={pendingIni} onChange={e => setPendingIni(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
              <span className="text-xs text-white/30">até</span>
              <input type="date" value={pendingFim} onChange={e => setPendingFim(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs text-white outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
              <button onClick={aplicarRange} disabled={!pendingIni || !pendingFim || pendingIni > pendingFim}
                className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all disabled:opacity-40"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                Aplicar
              </button>
            </div>
          )}

          <p className="text-xs text-white/50">
            Exibindo: <span className="text-white/80 font-medium">{fmtBR(inicio)} a {fmtBR(fim)}</span>
            {' · '}<span className="text-white/40">{totais.diasComRegistro} dias com registro · {totais.vendedoresAtivos} vendedores</span>
          </p>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner style={{ color: '#00d68f' }} /></div>
      ) : !temDados ? (
        <GlassCard className="p-10 flex flex-col items-center gap-2">
          <FileText size={28} className="text-white/20" />
          <p className="text-sm text-white/40">Nenhum relatório preenchido neste período.</p>
        </GlassCard>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard label="Vendas Fechadas" value={String(totais.vendas)} icon={<Target size={18} />} accentHex="#00d68f" sub={formatBRL(totais.valor)} />
            <KpiCard label="Contatos" value={String(totais.contatos)} icon={<Phone size={18} />} accentHex="#06b6d4" sub={`${totais.leads} leads trabalhados`} />
            <KpiCard label="Calls / Reuniões" value={String(totais.calls_reunioes)} icon={<Users size={18} />} accentHex="#8b5cf6" sub={`${totais.diasComRegistro} dias com registro`} />
            <KpiCard label="Taxa de Conversão" value={formatPercent(totais.taxaConversao)} icon={<TrendingUp size={18} />} accentHex="#f59e0b" sub={`ticket médio ${formatBRL(totais.ticketMedio)}`} />
          </div>

          {/* Evolução por dia */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Evolução Diária</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={porDia} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="contatos" name="Contatos" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="calls_reunioes" name="Calls/Reuniões" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#00d68f" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Vendas por vendedor */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Vendas por Vendedor</h3>
            <ResponsiveContainer width="100%" height={Math.max(220, dadosVendedorChart.length * 42)}>
              <BarChart data={dadosVendedorChart} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nome" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="vendas" name="Vendas" fill="#00d68f" radius={[0, 4, 4, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Ranking detalhado */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white">Desempenho por Vendedor</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Vendedor', 'Dias', 'Leads', 'Contatos', 'Calls', 'Vendas', 'Conv.', 'Valor'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/30 ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porVendedor.map((v, idx) => (
                    <tr key={v.vendedor_id} className="hover:bg-white/3 transition-colors"
                      style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-2.5 font-medium text-white">{v.nome}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-white/50">{v.dias}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-white/70">{v.leads}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-white/70">{v.contatos}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-white/70">{v.calls_reunioes}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-semibold text-white">{v.vendas}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-white/60">{v.taxaConversao.toFixed(0)}%</td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-bold" style={{ color: '#00d68f' }}>{formatBRL(v.valor)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid rgba(0,214,143,0.15)', background: 'rgba(0,214,143,0.04)' }}>
                    <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white/60">Total</td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold text-white/80">{totais.leads}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold text-white/80">{totais.contatos}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold text-white/80">{totais.calls_reunioes}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold text-white">{totais.vendas}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold text-white/80">{totais.taxaConversao.toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-bold" style={{ color: '#00d68f' }}>{formatBRL(totais.valor)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Produtos vendidos */}
          {produtos.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <ShoppingBag size={15} style={{ color: '#00d68f' }} />
                <h3 className="text-sm font-semibold text-white">Produtos Vendidos no Período</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Produto', 'Qtd', 'Valor'].map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/30 ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p, idx) => (
                      <tr key={p.nome} className="hover:bg-white/3 transition-colors"
                        style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-2.5 text-white/80">{p.nome}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums text-white/60">{p.qtd}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums font-semibold" style={{ color: '#00d68f' }}>{formatBRL(p.valor)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '1px solid rgba(0,214,143,0.15)', background: 'rgba(0,214,143,0.04)' }}>
                      <td className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white/60">Total</td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-bold text-white/80">{produtos.reduce((s, p) => s + p.qtd, 0)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-bold" style={{ color: '#00d68f' }}>{formatBRL(produtos.reduce((s, p) => s + p.valor, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}
