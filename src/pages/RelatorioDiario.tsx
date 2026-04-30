import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ClipboardList, CheckCircle2, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/authStore'
import { useVendedores } from '@/hooks/useVendedores'
import { useRelatorioDiario, useRelatorioDiarioHistorico } from '@/hooks/useRelatorioDiario'
import { formatBRL } from '@/lib/formatters'

// ── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

function fmtBR(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type FormData = {
  leads: string
  contatos: string
  calls_reunioes: string
  vendas: string
  valor_total: string
  observacoes: string
}

const emptyForm = (): FormData => ({
  leads: '', contatos: '', calls_reunioes: '', vendas: '', valor_total: '', observacoes: '',
})

function numOf(s: string) { const n = parseFloat(s.replace(',', '.')); return isNaN(n) ? 0 : n }

// ── Geração de PDF ────────────────────────────────────────────────────────────

async function gerarPDF(
  data: string,
  vendedores: { id: string; nome: string }[],
  forms: Record<string, FormData>,
  empresaNome: string,
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const { data: contratos } = await supabase
    .from('vendas')
    .select('cliente_nome, valor_unitario, status_ixc, vendedor:vendedores(nome)')
    .eq('data_venda', data)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = 297
  const pageH = 210
  const marginL = 14
  const marginR = 14
  const contentW = pageW - marginL - marginR
  const headerGreen: [number, number, number] = [26, 58, 42]

  // ── Header
  doc.setFillColor(...headerGreen)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('RELATÓRIO DE DESEMPENHO DIÁRIO', pageW / 2, 12, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(empresaNome, marginL, 22)
  const [yr, mo, dy] = data.split('-')
  const dateObj = new Date(Number(yr), Number(mo) - 1, Number(dy))
  const dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), pageW - marginR, 22, { align: 'right' })

  // ── KPI block
  const kpiY = 33
  const kpiH = 20
  const gap = 4
  const kpiW = (contentW - gap * 2) / 3

  const totalVendas = vendedores.reduce((s, v) => s + numOf(forms[v.id]?.vendas ?? '0'), 0)
  const totalValor = vendedores.reduce((s, v) => s + numOf(forms[v.id]?.valor_total ?? '0'), 0)
  const totalContatos = vendedores.reduce((s, v) => s + numOf(forms[v.id]?.contatos ?? '0'), 0)
  const totalLeads = vendedores.reduce((s, v) => s + numOf(forms[v.id]?.leads ?? '0'), 0)

  const kpis = [
    { title: 'VENDAS FECHADAS', value: String(totalVendas), sub: `Valor: ${formatBRL(totalValor)}` },
    { title: 'TOTAL DE CONTATOS', value: String(totalContatos), sub: 'contatos realizados' },
    { title: 'TOTAL DE LEADS', value: String(totalLeads), sub: 'leads trabalhados' },
  ]

  kpis.forEach((kpi, i) => {
    const x = marginL + i * (kpiW + gap)
    doc.setFillColor(240, 247, 244)
    doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'F')
    doc.setDrawColor(180, 220, 200)
    doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'S')
    doc.setTextColor(26, 58, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(kpi.title, x + kpiW / 2, kpiY + 6, { align: 'center' })
    doc.setFontSize(16)
    doc.text(kpi.value, x + kpiW / 2, kpiY + 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(80, 110, 95)
    doc.text(kpi.sub, x + kpiW / 2, kpiY + 19, { align: 'center' })
  })

  // ── Shared table styles
  const headStyles = {
    fillColor: headerGreen,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 8,
  }
  const altRows = { fillColor: [240, 247, 244] as [number, number, number] }
  const tblStyles = { fontSize: 8, cellPadding: 3 }
  const tblLine = { tableLineColor: [200, 220, 210] as [number, number, number], tableLineWidth: 0.1 }

  const mkRow = (label: string, key: keyof FormData, isValor = false) => {
    const vals = vendedores.map(v => numOf(forms[v.id]?.[key] ?? '0'))
    const total = vals.reduce((s, x) => s + x, 0)
    const fmt = isValor ? formatBRL : (n: number) => String(n)
    return [label, ...vals.map(fmt), fmt(total)]
  }

  // ── Activity table
  autoTable(doc, {
    startY: kpiY + kpiH + 5,
    head: [['MÉTRICA', ...vendedores.map(v => v.nome.toUpperCase()), 'TOTAL']],
    body: [
      mkRow('LEADS', 'leads'),
      mkRow('CONTATOS', 'contatos'),
      mkRow('CALLS / REUNIÕES', 'calls_reunioes'),
      mkRow('VENDAS FECHADAS', 'vendas'),
      mkRow('VALOR (R$)', 'valor_total', true),
    ],
    headStyles,
    alternateRowStyles: altRows,
    columnStyles: { 0: { fontStyle: 'bold' as const, textColor: headerGreen } },
    styles: tblStyles,
    margin: { left: marginL, right: marginR },
    ...tblLine,
  })

  // ── Contracts table
  if (contratos && contratos.length > 0) {
    const afterY = (doc as any).lastAutoTable.finalY + 8
    const statusLabel = (s: string | null) => {
      const map: Record<string, string> = { A: 'Ativo', AA: 'Aguardando Assinatura', CA: 'Cancelado', B: 'Bloqueado' }
      return (s && map[s]) ? map[s] : (s ?? '—')
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...headerGreen)
    doc.text('CONTRATOS FECHADOS HOJE', marginL, afterY - 2)

    autoTable(doc, {
      startY: afterY + 1,
      head: [['CLIENTE', 'VENDEDOR', 'VALOR', 'STATUS']],
      body: (contratos as any[]).map(c => [
        c.cliente_nome ?? '—',
        c.vendedor?.nome ?? '—',
        formatBRL(c.valor_unitario ?? 0),
        statusLabel(c.status_ixc),
      ]),
      headStyles,
      alternateRowStyles: altRows,
      styles: tblStyles,
      margin: { left: marginL, right: marginR },
      ...tblLine,
    })
  }

  // ── Footer
  const finalY = (doc as any).lastAutoTable?.finalY ?? 180
  doc.setTextColor(150, 150, 150)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(
    `${empresaNome} · Gerado em ${new Date().toLocaleString('pt-BR')}`,
    pageW / 2,
    Math.min(finalY + 8, pageH - 5),
    { align: 'center' },
  )

  doc.save(`relatorio-diario-${data}.pdf`)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RelatorioDiario() {
  const { user, permissoes, vendedorDbId } = useAuthStore()
  const isGestor = Boolean(permissoes?.relatorios) && !vendedorDbId

  const [dataSel, setDataSel] = useState(today())
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [forms, setForms] = useState<Record<string, FormData>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [gerandoPDF, setGerandoPDF] = useState(false)

  const { data: empresa } = useQuery({
    queryKey: ['empresa-nome'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('nome').limit(1).single()
      return data?.nome ?? 'SalesTracker'
    },
    staleTime: Infinity,
  })

  const { vendedores, loading: loadingVend } = useVendedores()
  const vendedoresAtivos = useMemo(
    () => vendedores.filter(v => v.ativo),
    [vendedores],
  )

  // Gestor vê todos; vendedor vê só o próprio
  const vendedoresVisiveis = useMemo(
    () => isGestor ? vendedoresAtivos : vendedoresAtivos.filter(v => v.id === vendedorDbId),
    [isGestor, vendedoresAtivos, vendedorDbId],
  )

  const { relatorios, loading: loadingRel, upsert } = useRelatorioDiario(dataSel)
  const { historico, loading: loadingHist } = useRelatorioDiarioHistorico()

  // Inicializar forms quando dados chegam
  useEffect(() => {
    const next: Record<string, FormData> = {}
    for (const v of vendedoresVisiveis) {
      const existing = relatorios.find(r => r.vendedor_id === v.id)
      next[v.id] = existing
        ? {
            leads: String(existing.leads),
            contatos: String(existing.contatos),
            calls_reunioes: String(existing.calls_reunioes),
            vendas: String(existing.vendas),
            valor_total: String(existing.valor_total),
            observacoes: existing.observacoes ?? '',
          }
        : emptyForm()
    }
    setForms(next)
  }, [relatorios, vendedoresVisiveis])

  const preenchidos = relatorios.filter(r =>
    vendedoresAtivos.some(v => v.id === r.vendedor_id),
  ).length

  function setField(vendedorId: string, field: keyof FormData, value: string) {
    setForms(f => ({ ...f, [vendedorId]: { ...(f[vendedorId] ?? emptyForm()), [field]: value } }))
  }

  async function handleSalvar(vendedorId: string) {
    const f = forms[vendedorId] ?? emptyForm()
    setSalvando(s => ({ ...s, [vendedorId]: true }))
    try {
      await upsert(vendedorId, {
        leads: numOf(f.leads),
        contatos: numOf(f.contatos),
        calls_reunioes: numOf(f.calls_reunioes),
        vendas: numOf(f.vendas),
        valor_total: numOf(f.valor_total),
        observacoes: f.observacoes || null,
      }, user?.id ?? null)
      toast('success', 'Relatório salvo!')
    } catch {
      toast('error', 'Erro ao salvar relatório.')
    } finally {
      setSalvando(s => ({ ...s, [vendedorId]: false }))
    }
  }

  async function handleGerarPDF() {
    setGerandoPDF(true)
    try {
      await gerarPDF(dataSel, vendedoresVisiveis, forms, empresa ?? 'SalesTracker')
    } finally {
      setGerandoPDF(false)
    }
  }

  // Totais para tabela consolidada
  const metricas = [
    { label: 'Leads', key: 'leads' as keyof FormData },
    { label: 'Contatos', key: 'contatos' as keyof FormData },
    { label: 'Calls / Reuniões', key: 'calls_reunioes' as keyof FormData },
    { label: 'Vendas fechadas', key: 'vendas' as keyof FormData },
    { label: 'Valor total', key: 'valor_total' as keyof FormData },
  ]

  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg text-sm text-white outline-none tabular-nums'
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }

  if (loadingVend) {
    return <div className="flex justify-center py-20"><Spinner style={{ color: '#00d68f' }} /></div>
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList size={20} style={{ color: '#00d68f' }} />
            Relatório Diário Comercial
          </h2>
          <p className="text-sm text-white/40 mt-0.5">Preenchimento diário de atividades por vendedor</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dataSel}
            onChange={e => setDataSel(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm text-white outline-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' }}
          />
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(0,214,143,0.08)', border: '1px solid rgba(0,214,143,0.2)' }}
          >
            {loadingRel
              ? <Spinner size="sm" style={{ color: '#00d68f' }} />
              : <>
                  <CheckCircle2 size={13} style={{ color: '#00d68f' }} />
                  <span style={{ color: '#00d68f' }}>{preenchidos}</span>
                  <span className="text-white/40">de</span>
                  <span className="text-white/70">{vendedoresAtivos.length} vendedores preencheram</span>
                </>
            }
          </div>
        </div>
      </div>

      {/* Grid de cards por vendedor */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {vendedoresVisiveis.map(v => {
          const f = forms[v.id] ?? emptyForm()
          const preenchido = relatorios.some(r => r.vendedor_id === v.id)
          const isSaving = salvando[v.id] ?? false

          return (
            <GlassCard key={v.id} className="p-5 flex flex-col gap-4">
              {/* Header do card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'rgba(0,214,143,0.15)', border: '1px solid rgba(0,214,143,0.25)' }}
                  >
                    {v.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{v.nome}</p>
                    <p className="text-xs text-white/35">{dataSel === today() ? 'Hoje' : fmtBR(dataSel)}</p>
                  </div>
                </div>
                {preenchido
                  ? <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.25)' }}>
                      <CheckCircle2 size={11} /> Preenchido
                    </span>
                  : <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Clock size={11} /> Pendente
                    </span>
                }
              </div>

              {/* Campos numéricos — grid 2×2 + campo de valor */}
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { label: 'Leads', field: 'leads' },
                  { label: 'Contatos', field: 'contatos' },
                  { label: 'Calls / Reuniões', field: 'calls_reunioes' },
                  { label: 'Vendas fechadas', field: 'vendas' },
                ] as { label: string; field: keyof FormData }[]).map(({ label, field }) => (
                  <div key={field} className="flex flex-col gap-1">
                    <label className="text-xs text-white/40 font-medium">{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={f[field]}
                      onChange={e => setField(v.id, field, e.target.value)}
                      placeholder="0"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-xs text-white/40 font-medium">Valor total (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={f.valor_total}
                    onChange={e => setField(v.id, 'valor_total', e.target.value)}
                    placeholder="0,00"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/40 font-medium">Observações (opcional)</label>
                <textarea
                  rows={2}
                  value={f.observacoes}
                  onChange={e => setField(v.id, 'observacoes', e.target.value)}
                  placeholder="Anotações do dia..."
                  className="w-full px-2.5 py-1.5 rounded-lg text-sm text-white/80 outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <Button
                onClick={() => handleSalvar(v.id)}
                loading={isSaving}
                className="w-full"
              >
                Salvar
              </Button>
            </GlassCard>
          )
        })}

        {vendedoresVisiveis.length === 0 && (
          <p className="text-sm text-white/30 py-6">Nenhum vendedor ativo encontrado.</p>
        )}
      </div>

      {/* Tabela consolidada */}
      {vendedoresVisiveis.length > 0 && (
        <GlassCard className="overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h3 className="text-sm font-semibold text-white">Consolidado do Dia</h3>
              <p className="text-xs text-white/30 mt-0.5">{fmtBR(dataSel)}</p>
            </div>
            <Button
              variant="secondary"
              onClick={handleGerarPDF}
              loading={gerandoPDF}
            >
              <FileText size={14} className="mr-1.5" />
              Gerar PDF
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30 w-36">Métrica</th>
                  {vendedoresVisiveis.map(v => (
                    <th key={v.id} className="px-3 py-3 text-center text-xs font-bold uppercase tracking-widest text-white/30 whitespace-nowrap">
                      {v.nome}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ color: '#00d68f' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {metricas.map(({ label, key }, idx) => {
                  const vals = vendedoresVisiveis.map(v => numOf(forms[v.id]?.[key] ?? '0'))
                  const total = vals.reduce((s, x) => s + x, 0)
                  const isValor = key === 'valor_total'
                  const fmt = (n: number) => isValor ? formatBRL(n) : String(n)

                  return (
                    <tr
                      key={key}
                      className="transition-colors hover:bg-white/3"
                      style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-4 py-2.5 text-xs font-bold text-white/60 uppercase tracking-wide">{label}</td>
                      {vals.map((val, i) => (
                        <td key={vendedoresVisiveis[i].id} className="px-3 py-2.5 text-center tabular-nums text-white/70">
                          {fmt(val)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center tabular-nums font-bold" style={{ color: '#00d68f' }}>
                        {fmt(total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Histórico (colapsável) */}
      <GlassCard className="overflow-hidden">
        <button
          onClick={() => setHistoricoAberto(h => !h)}
          className="w-full px-5 py-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-white/3"
        >
          <div>
            <h3 className="text-sm font-semibold text-white text-left">Ver histórico</h3>
            <p className="text-xs text-white/30 mt-0.5 text-left">Últimos 30 dias</p>
          </div>
          {historicoAberto ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
        </button>

        {historicoAberto && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {loadingHist ? (
              <div className="flex justify-center py-8"><Spinner style={{ color: '#00d68f' }} /></div>
            ) : historico.length === 0 ? (
              <p className="px-5 py-6 text-sm text-white/30">Nenhum registro nos últimos 30 dias.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Data', 'Preencheram', 'Total Vendas', 'Valor Total', 'Status', 'PDF'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map(h => {
                      const completo = h.vendedoresPreenchidos >= vendedoresAtivos.length
                      return (
                        <tr key={h.data_relatorio} className="hover:bg-white/3 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="px-4 py-3 font-medium text-white">{fmtBR(h.data_relatorio)}</td>
                          <td className="px-4 py-3 tabular-nums text-white/60">{h.vendedoresPreenchidos}</td>
                          <td className="px-4 py-3 tabular-nums text-white/70">{h.totalVendas}</td>
                          <td className="px-4 py-3 tabular-nums font-medium" style={{ color: '#00d68f' }}>{formatBRL(h.valorTotal)}</td>
                          <td className="px-4 py-3">
                            {completo
                              ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}>Completo</span>
                              : <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Incompleto</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setDataSel(h.data_relatorio)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg cursor-pointer transition-colors hover:bg-white/8 text-white/40 hover:text-white"
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </GlassCard>

    </div>
  )
}
