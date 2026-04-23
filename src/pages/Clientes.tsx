import { useState, useMemo } from 'react'
import { RefreshCw, ShoppingBag, Users, Search, X, Pencil, Trash2, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, statusToBadgeVariant } from '@/components/ui/Badge'
import { useVendas, type VendaComJoins } from '@/hooks/useVendas'
import { useVendedores } from '@/hooks/useVendedores'
import { useStatusVenda } from '@/hooks/useStatusVenda'
import { useIxcSync } from '@/hooks/useIxcSync'
import { ixcConfigurado, ixcStatusLabel } from '@/lib/ixc'
import { formatBRL, formatDate } from '@/lib/formatters'
import { EditVendaModal } from '@/components/vendas/EditVendaModal'
import { toast } from '@/components/ui/Toast'
import type { VendaFormData as NovaVendaFormData } from '@/components/vendas/vendaFormSchema'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function get3MesesRef(): { mes: number; ano: number; label: string }[] {
  const now = new Date()
  const result: { mes: number; ano: number; label: string }[] = []
  for (let i = 0; i <= 2; i++) {
    let m = now.getMonth() + 1 - i
    let a = now.getFullYear()
    while (m <= 0) { m += 12; a-- }
    const label = i === 0 ? 'Mês atual' : i === 1 ? 'Mês anterior' : '2 meses atrás'
    result.push({ mes: m, ano: a, label })
  }
  return result
}

export default function Clientes() {
  const { permissoes, vendedorDbId } = useAuthStore()
  const vendaFilter = !permissoes?.admin && vendedorDbId ? { vendedorId: vendedorDbId } : undefined
  const { vendas, loading, refetch, updateVenda, deleteVenda } = useVendas(vendaFilter)
  const { vendedores } = useVendedores()
  const { statuses } = useStatusVenda()
  const { sincronizando: syncing, sincronizarAgora } = useIxcSync({ onSyncComplete: refetch })

  const [editando, setEditando] = useState<VendaComJoins | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'mrr' | 'unico'>('todos')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroMesRef, setFiltroMesRef] = useState<number | null>(null)

  const mesesRefOpcoes = useMemo(() => get3MesesRef(), [])

  // anos disponíveis a partir das vendas
  const anos = useMemo(() => {
    const set = new Set(vendas.map((v) => v.data_venda.slice(0, 4)))
    return Array.from(set).sort().reverse()
  }, [vendas])

  const filtradas = useMemo(() => {
    return vendas.filter((v) => {
      if (filtroTipo === 'mrr' && !v.mrr) return false
      if (filtroTipo === 'unico' && v.mrr) return false
      if (filtroVendedor && v.vendedor?.id !== filtroVendedor) return false
      if (filtroStatus && v.status?.id !== filtroStatus) return false
      if (filtroAno && !v.data_venda.startsWith(filtroAno)) return false
      if (filtroMes && v.data_venda.slice(5, 7) !== filtroMes) return false
      if (filtroMesRef !== null) {
        const opt = mesesRefOpcoes[filtroMesRef]
        if (v.mes_referencia !== opt.mes || v.ano_referencia !== opt.ano) return false
      }
      if (busca) {
        const q = busca.toLowerCase()
        const nome = v.cliente_nome?.toLowerCase() ?? ''
        const uf = v.cliente_uf?.toLowerCase() ?? ''
        if (!nome.includes(q) && !uf.includes(q)) return false
      }
      return true
    })
  }, [vendas, filtroTipo, filtroVendedor, filtroStatus, filtroAno, filtroMes, filtroMesRef, mesesRefOpcoes, busca])

  const totalFaturamento = filtradas.reduce((s, v) => s + (v.valor_total ?? 0), 0)
  const totalMrr = vendas.filter((v) => v.mrr).reduce((s, v) => s + (v.valor_total ?? 0), 0)

  const temFiltroAtivo = filtroTipo !== 'todos' || filtroVendedor || filtroStatus || filtroMes || filtroAno || filtroMesRef !== null || busca

  function limparFiltros() {
    setBusca('')
    setFiltroTipo('todos')
    setFiltroVendedor('')
    setFiltroStatus('')
    setFiltroMes('')
    setFiltroAno('')
    setFiltroMesRef(null)
  }

  async function handleSalvarEdicao(id: string, data: NovaVendaFormData) {
    try {
      await updateVenda(id, {
        cliente_nome: data.cliente_nome,
        cliente_cpf_cnpj: data.cliente_cpf_cnpj || null,
        cliente_uf: data.cliente_uf || null,
        codigo_cliente_ixc: data.codigo_cliente_ixc || null,
        codigo_contrato_ixc: data.codigo_contrato_ixc || null,
        vendedor_id: data.vendedor_id,
        segmento_id: data.segmento_id || null,
        status_ixc: data.status_ixc || null,
        data_venda: data.data_venda,
        mrr: data.mrr,
        quantidade: data.quantidade,
        valor_unitario: data.valor_unitario,
        comissao_pct: data.comissao_pct,
        descricao: data.descricao || null,
      })
      toast('success', 'Venda atualizada com sucesso!')
    } catch {
      toast('error', 'Erro ao atualizar venda.')
      throw new Error()
    }
  }

  function handleSyncIxc() {
    sincronizarAgora()
    toast('success', 'Sincronização IXC iniciada...')
  }

  async function handleExcluir(id: string) {
    setExcluindoId(id)
    try {
      await deleteVenda(id)
      toast('success', 'Venda excluída.')
    } catch {
      toast('error', 'Erro ao excluir venda.')
    } finally {
      setExcluindoId(null)
    }
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
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}
            {temFiltroAtivo && ` filtrado${filtradas.length !== 1 ? 's' : ''}`}
            {' · '}MRR{' '}
            <span className="font-semibold" style={{ color: '#00d68f' }}>{formatBRL(totalMrr)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {ixcConfigurado() && (
            <button
              onClick={handleSyncIxc}
              disabled={syncing || loading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
              title="Sincronizar status com IXC"
            >
              {syncing ? <Spinner size="sm" /> : <Zap size={12} />}
              {syncing ? 'Sincronizando...' : 'Sync IXC'}
            </button>
          )}
          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        {/* Busca */}
        <div className="flex items-center gap-2 flex-1 min-w-48 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente..."
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

        {/* Tipo MRR */}
        <div
          className="flex items-center gap-1 rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['todos', 'mrr', 'unico'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={filtroTipo === f
                ? { background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.3)' }
                : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
              }
            >
              {f === 'todos' ? 'Todos' : f === 'mrr' ? 'MRR' : 'Únicos'}
            </button>
          ))}
        </div>

        {/* Vendedor */}
        <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} style={selectStyle}>
          <option value="" style={{ background: '#0f2419' }}>Todos os vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id} style={{ background: '#0f2419' }}>{v.nome}</option>
          ))}
        </select>

        {/* Status */}
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={selectStyle}>
          <option value="" style={{ background: '#0f2419' }}>Todos os status</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id} style={{ background: '#0f2419' }}>{s.nome}</option>
          ))}
        </select>

        {/* Mês */}
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={selectStyle}>
          <option value="" style={{ background: '#0f2419' }}>Todos os meses</option>
          {MESES.map((nome, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')} style={{ background: '#0f2419' }}>{nome}</option>
          ))}
        </select>

        {/* Ano */}
        <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} style={selectStyle}>
          <option value="" style={{ background: '#0f2419' }}>Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={a} style={{ background: '#0f2419' }}>{a}</option>
          ))}
        </select>

        {/* Mês de Referência */}
        <div
          className="flex items-center gap-1 rounded-full p-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setFiltroMesRef(null)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={filtroMesRef === null
              ? { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }
              : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
            }
          >
            Todos
          </button>
          {mesesRefOpcoes.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setFiltroMesRef(idx)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={filtroMesRef === idx
                ? { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }
                : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
              }
            >
              {MESES_CURTO[opt.mes - 1]}/{opt.ano % 100}
            </button>
          ))}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registros filtrados', value: String(filtradas.length), color: '#06b6d4' },
          { label: 'Faturamento filtrado', value: formatBRL(totalFaturamento), color: '#00d68f' },
          { label: 'MRR total', value: formatBRL(totalMrr), color: '#8b5cf6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-2xl px-5 py-4" style={{ borderTop: `2px solid ${color}` }}>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" style={{ color: '#00d68f' }} />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Users size={24} className="text-white/25" />
          </div>
          <p className="text-white/50 font-medium">
            {temFiltroAtivo ? 'Nenhum resultado para os filtros aplicados' : 'Nenhuma venda encontrada'}
          </p>
          {temFiltroAtivo && (
            <button onClick={limparFiltros} className="text-sm cursor-pointer" style={{ color: '#00d68f' }}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">IXC</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Vendedor</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Produto</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Tipo</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Mês</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Data</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-white/35 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v, i) => (
                  <tr
                    key={v.id}
                    className="transition-colors hover:bg-white/3"
                    style={{ borderBottom: i < filtradas.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-white font-semibold">{v.cliente_nome}</p>
                      {v.cliente_uf && <p className="text-xs text-white/35 mt-0.5">{v.cliente_uf}</p>}
                    </td>
                    <td className="px-4 py-4">
                      {v.codigo_contrato_ixc ? (
                        <div className="text-xs">
                          <p className="text-white/60">Contrato: <span className="font-mono text-white/80">{v.codigo_contrato_ixc}</span></p>
                          {v.codigo_cliente_ixc && <p className="text-white/35 mt-0.5">Cliente: <span className="font-mono">{v.codigo_cliente_ixc}</span></p>}
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-white/60">{v.vendedor?.nome ?? '—'}</td>
                    <td className="px-4 py-4 text-white/60">{v.produto?.nome ?? '—'}</td>
                    <td className="px-4 py-4 text-center">
                      {v.mrr ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                          <RefreshCw size={11} />
                          MRR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,214,143,0.12)', color: '#00d68f' }}>
                          <ShoppingBag size={11} />
                          Único
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {v.mes_referencia && v.ano_referencia ? (
                        <span className="text-xs text-white/50">
                          {MESES_CURTO[v.mes_referencia - 1]}/{v.ano_referencia % 100}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-white/45">{formatDate(v.data_venda)}</td>
                    <td className="px-4 py-4 text-right font-bold text-white">{formatBRL(v.valor_total)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {v.status_ixc
                          ? <Badge variant={statusToBadgeVariant(v.status_ixc)}>{ixcStatusLabel(v.status_ixc)}</Badge>
                          : <Badge variant={statusToBadgeVariant(v.status?.nome ?? '')}>{v.status?.nome ?? '—'}</Badge>
                        }
                        {v.status_ixc === 'AA' && (v.dias_em_aa ?? 0) > 7 && (
                          <Badge
                            variant={(v.dias_em_aa ?? 0) > 15 ? 'danger' : 'warning'}
                            className="text-[10px]"
                          >
                            {(v.dias_em_aa ?? 0) > 15 ? 'Urgente' : 'Atenção'} · {v.dias_em_aa}d
                          </Badge>
                        )}
                        {(v as VendaComJoins & { tags?: string | null }).tags === 'antigo' && (
                          <span
                            className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}
                          >
                            Parado +30d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditando(v)}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer text-white/30 hover:text-white hover:bg-white/8"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleExcluir(v.id)}
                          disabled={excluindoId === v.id}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer text-white/30 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Excluir"
                        >
                          {excluindoId === v.id ? <Spinner size="sm" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editando && (
        <EditVendaModal
          venda={editando}
          open={true}
          onClose={() => setEditando(null)}
          onSave={handleSalvarEdicao}
        />
      )}
    </div>
  )
}
