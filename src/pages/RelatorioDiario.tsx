import { useState, useMemo, useEffect } from 'react'
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
) {
  const { default: jsPDF } = await import('jspdf')

  const cols = vendedores
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const verde = [15, 64, 25] as [number, number, number]
  const pageW = 297
  const marginL = 14
  const colW = Math.min(38, (pageW - marginL - 14 - 44) / Math.max(cols.length, 1))
  const metricaW = 44
  const totalW = 30

  // Header
  doc.setFillColor(...verde)
  doc.rect(0, 0, pageW, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('RELATÓRIO DE DESEMPENHO DIÁRIO', pageW / 2, 11, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`DATA: ${fmtBR(data)}`, pageW / 2, 20, { align: 'center' })

  // Tabela
  const startY = 32
  const rowH = 10
  const headers = ['MÉTRICA', ...cols.map(v => v.nome.toUpperCase()), 'TOTAL']
  const widths = [metricaW, ...cols.map(() => colW), totalW]

  // Header da tabela
  doc.setFillColor(30, 80, 40)
  let xPos = marginL
  for (let i = 0; i < headers.length; i++) {
    doc.setFillColor(30, 80, 40)
    doc.rect(xPos, startY, widths[i], rowH, 'F')
    doc.setDrawColor(100, 150, 100)
    doc.rect(xPos, startY, widths[i], rowH, 'S')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(headers[i], xPos + widths[i] / 2, startY + 6.5, { align: 'center' })
    xPos += widths[i]
  }

  const metricas = [
    { label: 'LEADS', key: 'leads' as keyof FormData, fmt: (v: number) => String(v) },
    { label: 'CONTATOS', key: 'contatos' as keyof FormData, fmt: (v: number) => String(v) },
    { label: 'CALLS / REUNIÕES', key: 'calls_reunioes' as keyof FormData, fmt: (v: number) => String(v) },
    { label: 'VENDAS FECHADAS', key: 'vendas' as keyof FormData, fmt: (v: number) => String(v) },
    { label: 'VALOR (R$)', key: 'valor_total' as keyof FormData, fmt: (v: number) => formatBRL(v) },
  ]

  for (let row = 0; row < metricas.length; row++) {
    const { label, key, fmt } = metricas[row]
    const y = startY + (row + 1) * rowH
    const isEven = row % 2 === 0
    xPos = marginL
    let total = 0

    const vals = cols.map(v => numOf(forms[v.id]?.[key] ?? '0'))
    total = vals.reduce((s, x) => s + x, 0)
    const allVals = [...vals, total]
    const allHeaders = [label, ...allVals.map(fmt)]

    for (let c = 0; c < allHeaders.length; c++) {
      doc.setFillColor(isEven ? 245 : 255, isEven ? 250 : 255, isEven ? 245 : 255)
      doc.rect(xPos, y, widths[c], rowH, 'F')
      doc.setDrawColor(180, 210, 180)
      doc.rect(xPos, y, widths[c], rowH, 'S')
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', c === 0 ? 'bold' : 'normal')
      doc.setFontSize(8)
      doc.text(allHeaders[c], xPos + (c === 0 ? 3 : widths[c] / 2), y + 6.5, { align: c === 0 ? 'left' : 'center' })
      xPos += widths[c]
    }
  }

  // Footer
  const footerY = startY + (metricas.length + 1) * rowH + 8
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, marginL, footerY)

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
      await gerarPDF(dataSel, vendedoresVisiveis, forms)
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
