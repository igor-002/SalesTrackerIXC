import { useState, useMemo } from 'react'
import { Search, RefreshCw, Wrench, Eye, ChevronDown, ChevronUp, X, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { useDiagnosticoIXC, useVendedoresAutorizados, type ContratoComVendedor } from '@/hooks/useDiagnosticoIXC'
import { syncContratosFromIXC } from '@/services/ixcSync'
import { ixcBuscarProdutosPorVdContrato, ixcBuscarStatusContrato, type IxcContratoProduto } from '@/lib/ixc'
import { formatBRL, formatDate } from '@/lib/formatters'

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
  A: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  AA: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  P: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  B: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  CM: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  C: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  CN: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  FA: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  N: { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff' },
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

  const temFiltroAtivo = busca || vendedorFiltro || statusFiltro

  function limparFiltros() {
    setBusca('')
    setVendedorFiltro('')
    setStatusFiltro('')
  }

  const selectStyle = {
    background: '#ffffff',
    border: '1px solid #e4e4e7',
    color: '#71717a',
    borderRadius: '0.5rem',
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
          <h1 className="text-xl font-bold text-[#09090b] flex items-center gap-2">
            <Wrench size={20} className="text-[#1d4ed8]" />
            Diagnóstico IXC
          </h1>
          <p className="text-sm text-[#71717a] mt-0.5">
            Contratos sincronizados do IXC
            {temFiltroAtivo && ` · ${contratosFiltrados.length} filtrados`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncTudo}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] hover:bg-[#dcfce7]"
          >
            {syncing ? <Spinner size="sm" /> : <RefreshCw size={12} />}
            {syncing ? 'Sincronizando...' : 'Sincronizar tudo'}
          </button>
          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] hover:bg-[#fee2e2]"
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
            <Spinner size="sm" />
            <span className="text-sm text-[#09090b] font-medium">Sincronizando...</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-[#e4e4e7]">
            <div
              className="h-full rounded-full transition-all duration-300 bg-[#15803d]"
              style={{ width: `${syncProgress.pct}%` }}
            />
          </div>
          <p className="text-xs text-[#71717a] mt-2">{syncProgress.msg}</p>
        </GlassCard>
      )}

      {/* Filtros */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48 rounded-md px-3 py-2 bg-[#f4f4f5] border border-[#e4e4e7]">
          <Search size={14} className="text-[#a1a1aa] flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente ou ID contrato..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-transparent text-xs text-[#09090b] placeholder-[#a1a1aa] outline-none w-full"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="text-[#a1a1aa] hover:text-[#71717a] cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <select value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} style={selectStyle}>
          <option value="">Todos os vendedores</option>
          {vendedoresAutorizados.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>

        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={selectStyle}>
          <option value="">Todos os status</option>
          <option value="A">Ativo</option>
          <option value="AA">Aguardando</option>
          <option value="P">Proposta</option>
          <option value="B">Bloqueado</option>
          <option value="C">Cancelado</option>
        </select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total contratos', value: String(resumo.total), color: '#1d4ed8' },
          { label: 'Ativos', value: String(resumo.ativos), color: '#15803d' },
          { label: 'Aguardando', value: String(resumo.aguardando), color: '#b45309' },
          { label: 'MRR Total', value: formatBRL(resumo.mrrTotal), color: '#7c3aed' },
          {
            label: 'Valor R$ 0',
            value: String(resumo.valorZero),
            color: resumo.valorZero > 0 ? '#b91c1c' : '#15803d',
            alert: resumo.valorZero > 0,
          },
        ].map(({ label, value, color, alert }) => (
          <div key={label} className="bg-white border border-[#e4e4e7] rounded-lg px-4 py-3" style={{ borderTop: `2px solid ${color}` }}>
            <p className="text-lg font-bold text-[#09090b] flex items-center gap-1">
              {value}
              {alert && <AlertTriangle size={14} className="text-[#b91c1c]" />}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#71717a] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela principal */}
      <GlassCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : contratosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Wrench size={40} className="text-[#a1a1aa]" />
            <p className="text-sm text-[#71717a]">Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    ID Contrato
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    Vendedor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    Valor MRR
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    Data
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    Ações
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
                      className="hover:bg-[#fafafa] transition-colors"
                      style={{
                        borderBottom: i < contratosFiltrados.length - 1 ? '1px solid #f4f4f5' : undefined,
                        background: isZero ? '#fef2f2' : undefined,
                      }}
                    >
                      <td className="px-4 py-3 text-[#71717a] font-mono text-xs">{c.codigo_contrato_ixc}</td>
                      <td className="px-4 py-3 text-[#09090b] font-medium">{c.cliente_nome}</td>
                      <td className="px-4 py-3 text-[#71717a]">{c.vendedor?.nome ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-md"
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
                        <span className={isZero ? 'text-[#b91c1c] font-bold' : 'text-[#09090b]'}>
                          {formatBRL(c.valor_unitario ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#71717a] text-xs">
                        {c.data_venda ? formatDate(c.data_venda) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleVerProdutos(c)}
                            className="p-1.5 rounded-md transition-all cursor-pointer hover:bg-[#eff6ff] text-[#1d4ed8]"
                            title="Ver produtos"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleSyncContrato(c)}
                            disabled={syncingContrato === c.id}
                            className="p-1.5 rounded-md transition-all cursor-pointer hover:bg-[#f0fdf4] text-[#15803d] disabled:opacity-40"
                            title="Sync contrato"
                          >
                            {syncingContrato === c.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <RefreshCw size={14} />
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

      {/* Logs de sync (colapsavel) */}
      <GlassCard className="p-0 overflow-hidden">
        <button
          onClick={() => setLogsExpanded(!logsExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-all"
        >
          <span className="text-sm font-semibold text-[#09090b]">Últimas sincronizações</span>
          {logsExpanded ? (
            <ChevronUp size={16} className="text-[#71717a]" />
          ) : (
            <ChevronDown size={16} className="text-[#71717a]" />
          )}
        </button>

        {logsExpanded && (
          <div className="border-t border-[#e4e4e7]">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : syncLogs.length === 0 ? (
              <p className="text-sm text-[#71717a] text-center py-8">Nenhum log encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Status
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Processados
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Atualizados
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Erros
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Duração
                      </th>
                      <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
                        Horário
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log, i) => (
                      <tr
                        key={log.id}
                        className="hover:bg-[#fafafa] transition-colors"
                        style={{
                          borderBottom: i < syncLogs.length - 1 ? '1px solid #f4f4f5' : undefined,
                        }}
                      >
                        <td className="px-4 py-2 text-[#71717a]">{log.tipo}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              log.status === 'sucesso'
                                ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]'
                                : log.status === 'erro'
                                  ? 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]'
                                  : 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-[#71717a]">{log.registros_processados ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-[#71717a]">{log.registros_atualizados ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-[#b91c1c]">{log.registros_erro ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-[#71717a]">
                          {log.duracao_ms ? `${(log.duracao_ms / 1000).toFixed(1)}s` : '—'}
                        </td>
                        <td className="px-4 py-2 text-[#71717a]">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={fecharModalProdutos}>
          <div
            className="bg-white border border-[#e4e4e7] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#09090b]">Produtos do Contrato</h2>
              <button onClick={fecharModalProdutos} className="text-[#a1a1aa] hover:text-[#09090b] cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-[#71717a] mb-4">
              Contrato: <span className="font-mono text-[#1d4ed8]">{modalProdutos.contrato?.codigo_contrato_ixc}</span>
            </p>

            {modalProdutos.loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : modalProdutos.produtos.length === 0 ? (
              <p className="text-sm text-[#71717a] text-center py-8">Nenhum produto encontrado</p>
            ) : (
              <>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-[#e4e4e7]">
                      <th className="text-left py-2 text-xs font-semibold text-[#71717a]">Descrição</th>
                      <th className="text-right py-2 text-xs font-semibold text-[#71717a]">Valor</th>
                      <th className="text-right py-2 text-xs font-semibold text-[#71717a]">Qtde</th>
                      <th className="text-right py-2 text-xs font-semibold text-[#71717a]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalProdutos.produtos.map((p) => (
                      <tr key={p.id} className="border-b border-[#f4f4f5]">
                        <td className="py-2 text-[#09090b]">{p.descricao || '—'}</td>
                        <td className="py-2 text-right text-[#71717a] font-mono">{formatBRL(p.valor_unit)}</td>
                        <td className="py-2 text-right text-[#71717a]">{p.qtde}</td>
                        <td className="py-2 text-right text-[#09090b] font-mono">{formatBRL(p.valor_bruto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-4 py-3 rounded-md bg-[#f0fdf4] border border-[#bbf7d0]">
                  <span className="text-sm font-semibold text-[#09090b]">Total do Plano</span>
                  <span className="text-lg font-bold text-[#15803d]">
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
