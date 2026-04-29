import { useState, useMemo } from 'react'
import { Search, RefreshCw, Wrench, Eye, ChevronDown, ChevronUp, X, AlertTriangle, Calendar } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { useDiagnosticoIXC, useVendedoresAutorizados, type ContratoComVendedor } from '@/hooks/useDiagnosticoIXC'
import { syncContratosFromIXC, syncHistoricoVendedores } from '@/services/ixcSync'
import { ixcBuscarProdutosPorVdContrato, ixcBuscarStatusContrato, type IxcContratoProduto } from '@/lib/ixc'
import { formatBRL, formatDate } from '@/lib/formatters'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const STATUS_LABELS: Record<string, string> = {
  A: 'Ativo',
  AA: 'Aguardando',
  P: 'Proposta',
  B: 'Bloqueado',
  CM: 'Bloq. Manual',
  C: 'Cancelado',
  CN: 'Cancelado',
  FA: 'Fin. Atraso',
  N: 'Negativado',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'rgba(0,214,143,0.15)', text: '#00d68f', border: 'rgba(0,214,143,0.3)' },
  AA: { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
  P: { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
  B: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  CM: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  C: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  CN: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  FA: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  N: { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
}

export default function DiagnosticoIXC() {
  const { contratos, syncLogs, loading, loadingLogs, refetch, refetchLogs } = useDiagnosticoIXC()
  const vendedoresAutorizados = useVendedoresAutorizados()

  const [busca, setBusca] = useState('')
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('')
  const [statusFiltro, setStatusFiltro] = useState<string>('')

  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ msg: '', pct: 0 })
  const [syncingContrato, setSyncingContrato] = useState<string | null>(null)

  const agora = new Date()
  const mesAtualNum = agora.getMonth() + 1
  const anoAtualNum = agora.getFullYear()
  const mesPadrao = mesAtualNum === 1 ? 12 : mesAtualNum - 1
  const anoPadrao = mesAtualNum === 1 ? anoAtualNum - 1 : anoAtualNum
  const [mesHistorico, setMesHistorico] = useState(mesPadrao)
  const [anoHistorico, setAnoHistorico] = useState(anoPadrao)
  const [syncingHistorico, setSyncingHistorico] = useState(false)
  const [syncHistoricoProgress, setSyncHistoricoProgress] = useState({ msg: '', pct: 0 })
  const ANOS = Array.from({ length: anoAtualNum - 2023 }, (_, i) => 2024 + i)
  const isMesAtualOuFuturo = anoHistorico > anoAtualNum || (anoHistorico === anoAtualNum && mesHistorico >= mesAtualNum)

  const [modalProdutos, setModalProdutos] = useState<{
    open: boolean
    contrato: ContratoComVendedor | null
    produtos: IxcContratoProduto[]
    loading: boolean
  }>({ open: false, contrato: null, produtos: [], loading: false })

  const [logsExpanded, setLogsExpanded] = useState(false)

  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      if (busca) {
        const q = busca.toLowerCase()
        const nome = c.cliente_nome?.toLowerCase() ?? ''
        const idContrato = c.codigo_contrato_ixc?.toLowerCase() ?? ''
        if (!nome.includes(q) && !idContrato.includes(q)) return false
      }
      if (vendedorFiltro && c.vendedor?.id !== vendedorFiltro) return false
      if (statusFiltro && c.status_ixc !== statusFiltro) return false
      return true
    })
  }, [contratos, busca, vendedorFiltro, statusFiltro])

  const resumo = useMemo(() => {
    const total = contratosFiltrados.length
    const ativos = contratosFiltrados.filter((c) => c.status_ixc === 'A').length
    const aguardando = contratosFiltrados.filter((c) => c.status_ixc === 'AA' || c.status_ixc === 'P').length
    const mrrTotal = contratosFiltrados
      .filter((c) => c.status_ixc === 'A')
      .reduce((sum, c) => sum + (c.valor_unitario ?? 0), 0)
    const valorZero = contratosFiltrados.filter((c) => !c.valor_unitario || c.valor_unitario === 0).length

    return { total, ativos, aguardando, mrrTotal, valorZero }
  }, [contratosFiltrados])

  async function handleSyncTudo() {
    setSyncing(true)
    setSyncProgress({ msg: 'Iniciando...', pct: 0 })
    try {
      const result = await syncContratosFromIXC((msg, pct) => {
        setSyncProgress({ msg, pct: pct ?? 0 })
      })
      toast('success', `Sync completo: ${result.importados} contratos importados`)
      await refetch()
      await refetchLogs()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro no sync')
    } finally {
      setSyncing(false)
      setSyncProgress({ msg: '', pct: 0 })
    }
  }

  async function handleSyncContrato(contrato: ContratoComVendedor) {
    if (!contrato.codigo_contrato_ixc) return
    setSyncingContrato(contrato.id)
    try {
      const ixcData = await ixcBuscarStatusContrato(contrato.codigo_contrato_ixc)
      toast('success', `Contrato ${contrato.codigo_contrato_ixc}: status ${ixcData.status_code}`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao buscar contrato')
    } finally {
      setSyncingContrato(null)
    }
  }

  async function handleVerProdutos(contrato: ContratoComVendedor) {
    setModalProdutos({ open: true, contrato, produtos: [], loading: true })
    try {
      const idVdContrato = (contrato as any).raw?.id_vd_contrato ?? contrato.codigo_contrato_ixc
      if (idVdContrato) {
        const produtos = await ixcBuscarProdutosPorVdContrato(idVdContrato)
        setModalProdutos((prev) => ({ ...prev, produtos, loading: false }))
      } else {
        setModalProdutos((prev) => ({ ...prev, produtos: [], loading: false }))
      }
    } catch {
      toast('error', 'Erro ao buscar produtos')
      setModalProdutos((prev) => ({ ...prev, loading: false }))
    }
  }

  function fecharModalProdutos() {
    setModalProdutos({ open: false, contrato: null, produtos: [], loading: false })
  }

  async function handleSyncHistorico() {
    setSyncingHistorico(true)
    setSyncHistoricoProgress({ msg: 'Iniciando...', pct: 0 })
    try {
      const result = await syncHistoricoVendedores(
        (msg, pct) => setSyncHistoricoProgress({ msg, pct: pct ?? 0 }),
        { mes: mesHistorico, ano: anoHistorico }
      )
      toast('success', `Histórico sincronizado: ${result.contratosInseridos} contratos inseridos`)
      await refetchLogs()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro no sync histórico')
    } finally {
      setSyncingHistorico(false)
      setSyncHistoricoProgress({ msg: '', pct: 0 })
    }
  }

  const temFiltroAtivo = busca || vendedorFiltro || statusFiltro

  function limparFiltros() {
    setBusca('')
    setVendedorFiltro('')
    setStatusFiltro('')
  }

  const selectStyle = {
    background: '#0f2419',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: '0.75rem',
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench size={20} className="text-cyan-400" />
            Diagnostico IXC
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Contratos sincronizados do IXC
            {temFiltroAtivo && ` · ${contratosFiltrados.length} filtrados`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncTudo}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(0,214,143,0.1)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }}
          >
            {syncing ? <Spinner size="sm" /> : <RefreshCw size={12} />}
            {syncing ? 'Sincronizando...' : 'Sincronizar tudo'}
          </button>
          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <X size={12} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso do sync */}
      {syncing && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Spinner size="sm" style={{ color: '#00d68f' }} />
            <span className="text-sm text-white font-medium">Sincronizando...</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${syncProgress.pct}%`, background: '#00d68f' }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2">{syncProgress.msg}</p>
        </GlassCard>
      )}

      {/* Filtros */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div
          className="flex items-center gap-2 flex-1 min-w-48 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente ou ID contrato..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-white/30 outline-none w-full"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="text-white/30 hover:text-white/60 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} style={selectStyle}>
          <option value="" style={{ background: '#0f2419' }}>
            Todos os vendedores
          </option>
          {vendedoresAutorizados.map((v) => (
            <option key={v.id} value={v.id} style={{ background: '#0f2419' }}>
              {v.nome}
            </option>
          ))}
        </select>

        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={selectStyle}>
          <option value="" style={{ background: '#0f2419' }}>
            Todos os status
          </option>
          <option value="A" style={{ background: '#0f2419' }}>
            Ativo
          </option>
          <option value="AA" style={{ background: '#0f2419' }}>
            Aguardando
          </option>
          <option value="P" style={{ background: '#0f2419' }}>
            Proposta
          </option>
          <option value="B" style={{ background: '#0f2419' }}>
            Bloqueado
          </option>
          <option value="C" style={{ background: '#0f2419' }}>
            Cancelado
          </option>
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total contratos', value: String(resumo.total), color: '#06b6d4' },
          { label: 'Ativos', value: String(resumo.ativos), color: '#00d68f' },
          { label: 'Aguardando', value: String(resumo.aguardando), color: '#f59e0b' },
          { label: 'MRR Total', value: formatBRL(resumo.mrrTotal), color: '#8b5cf6' },
          {
            label: 'Valor R$ 0',
            value: String(resumo.valorZero),
            color: resumo.valorZero > 0 ? '#ef4444' : '#22c55e',
            alert: resumo.valorZero > 0,
          },
        ].map(({ label, value, color, alert }) => (
          <div key={label} className="glass rounded-2xl px-4 py-3" style={{ borderTop: `2px solid ${color}` }}>
            <p className="text-lg font-bold text-white flex items-center gap-1">
              {value}
              {alert && <AlertTriangle size={14} className="text-red-400" />}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela principal */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" style={{ color: '#00d68f' }} />
          </div>
        ) : contratosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Wrench size={40} className="text-white/20" />
            <p className="text-sm text-white/40">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    ID Contrato
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Vendedor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Valor MRR
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Data
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((c, i) => {
                  const statusColor = STATUS_COLORS[c.status_ixc ?? ''] ?? STATUS_COLORS.A
                  const isZero = !c.valor_unitario || c.valor_unitario === 0
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: i < contratosFiltrados.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                        background: isZero ? 'rgba(239,68,68,0.05)' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 text-white/60 font-mono text-xs">{c.codigo_contrato_ixc}</td>
                      <td className="px-4 py-3 text-white font-medium">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-white/60">{c.vendedor?.nome ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background: statusColor.bg,
                            color: statusColor.text,
                            border: `1px solid ${statusColor.border}`,
                          }}
                        >
                          {STATUS_LABELS[c.status_ixc ?? ''] ?? c.status_ixc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={isZero ? 'text-red-400 font-bold' : 'text-white'}>
                          {formatBRL(c.valor_unitario ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">
                        {c.data_venda ? formatDate(c.data_venda) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleVerProdutos(c)}
                            className="p-1.5 rounded-lg transition-all cursor-pointer hover:bg-white/5"
                            title="Ver produtos"
                          >
                            <Eye size={14} className="text-cyan-400" />
                          </button>
                          <button
                            onClick={() => handleSyncContrato(c)}
                            disabled={syncingContrato === c.id}
                            className="p-1.5 rounded-lg transition-all cursor-pointer hover:bg-white/5 disabled:opacity-40"
                            title="Sync contrato"
                          >
                            {syncingContrato === c.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <RefreshCw size={14} className="text-emerald-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Seção: Sincronizar Mês Histórico */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-violet-400" />
          <span className="text-sm font-bold text-white">Sincronizar Mês Histórico</span>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Busca contratos que ativaram neste mês diretamente do IXC e adiciona ao histórico.
          Não afeta os contratos do mês atual.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={String(mesHistorico)}
            onChange={(e) => setMesHistorico(Number(e.target.value))}
            disabled={syncingHistorico}
            options={MESES.map((nome, i) => ({ value: String(i + 1), label: nome }))}
          />
          <Select
            value={String(anoHistorico)}
            onChange={(e) => setAnoHistorico(Number(e.target.value))}
            disabled={syncingHistorico}
            options={ANOS.map((ano) => ({ value: String(ano), label: String(ano) }))}
          />
          <button
            onClick={handleSyncHistorico}
            disabled={syncingHistorico || isMesAtualOuFuturo}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            {syncingHistorico ? <Spinner size="sm" /> : <RefreshCw size={12} />}
            {syncingHistorico ? 'Sincronizando...' : 'Buscar do IXC'}
          </button>
          {isMesAtualOuFuturo && (
            <span className="text-xs" style={{ color: '#f59e0b99' }}>
              Apenas meses anteriores ao mês atual
            </span>
          )}
        </div>
        {syncingHistorico && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-2">
              <Spinner size="sm" style={{ color: '#8b5cf6' }} />
              <span className="text-sm text-white font-medium">Sincronizando histórico...</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${syncHistoricoProgress.pct}%`, background: '#8b5cf6' }}
              />
            </div>
            <p className="text-xs text-white/40 mt-2">{syncHistoricoProgress.msg}</p>
          </div>
        )}
      </GlassCard>

      {/* Logs de sync (colapsavel) */}
      <GlassCard className="p-0 overflow-hidden">
        <button
          onClick={() => setLogsExpanded(!logsExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition-all"
        >
          <span className="text-sm font-semibold text-white">Ultimas sincronizacoes</span>
          {logsExpanded ? (
            <ChevronUp size={16} className="text-white/40" />
          ) : (
            <ChevronDown size={16} className="text-white/40" />
          )}
        </button>

        {logsExpanded && (
          <div className="border-t border-white/5">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : syncLogs.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">Nenhum log encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Status
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Processados
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Atualizados
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Erros
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Duracao
                      </th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Horario
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log, i) => (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: i < syncLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                        }}
                      >
                        <td className="px-4 py-2 text-white/60">{log.tipo}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              log.status === 'sucesso'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : log.status === 'erro'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-white/60">{log.registros_processados ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-white/60">{log.registros_atualizados ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-red-400">{log.registros_erro ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-white/40">
                          {log.duracao_ms ? `${(log.duracao_ms / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-4 py-2 text-white/40">
                          {log.iniciado_em ? new Date(log.iniciado_em).toLocaleString('pt-BR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Modal de produtos */}
      {modalProdutos.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={fecharModalProdutos}>
          <div
            className="glass rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Produtos do Contrato</h2>
              <button onClick={fecharModalProdutos} className="text-white/40 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-white/60 mb-4">
              Contrato: <span className="font-mono text-cyan-400">{modalProdutos.contrato?.codigo_contrato_ixc}</span>
            </p>

            {modalProdutos.loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : modalProdutos.produtos.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">Nenhum produto encontrado</p>
            ) : (
              <>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th className="text-left py-2 text-xs font-semibold text-white/40">Descricao</th>
                      <th className="text-right py-2 text-xs font-semibold text-white/40">Valor</th>
                      <th className="text-right py-2 text-xs font-semibold text-white/40">Qtde</th>
                      <th className="text-right py-2 text-xs font-semibold text-white/40">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalProdutos.produtos.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td className="py-2 text-white">{p.descricao || '—'}</td>
                        <td className="py-2 text-right text-white/60 font-mono">{formatBRL(p.valor_unit)}</td>
                        <td className="py-2 text-right text-white/60">{p.qtde}</td>
                        <td className="py-2 text-right text-white font-mono">{formatBRL(p.valor_bruto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.2)' }}
                >
                  <span className="text-sm font-semibold text-white">Total do Plano</span>
                  <span className="text-lg font-bold" style={{ color: '#00d68f' }}>
                    {formatBRL(modalProdutos.produtos.reduce((sum, p) => sum + p.valor_bruto, 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
