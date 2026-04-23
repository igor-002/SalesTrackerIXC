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
          <h1 className="text-xl font-bold text-[#09090b]">Clientes</h1>
          <p className="text-sm text-[#71717a] mt-0.5">
            {filtradas.length} registro{filtradas.length !== 1 ? 's' : ''}
            {temFiltroAtivo && ` filtrado${filtradas.length !== 1 ? 's' : ''}`}
            {' · '}MRR{' '}
            <span className="font-semibold text-[#15803d]">{formatBRL(totalMrr)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {ixcConfigurado() && (
            <button
              onClick={handleSyncIxc}
              disabled={syncing || loading}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe]"
              title="Sincronizar status com IXC"
            >
              {syncing ? <Spinner size="sm" /> : <Zap size={12} />}
              {syncing ? 'Sincronizando...' : 'Sync IXC'}
            </button>
          )}
          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] hover:bg-[#fee2e2]"
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#e4e4e7] rounded-lg p-4 flex flex-wrap gap-3 items-center">
        {/* Busca */}
        <div className="flex items-center gap-2 flex-1 min-w-48 rounded-md px-3 py-2 bg-[#f4f4f5] border border-[#e4e4e7]">
          <Search size={14} className="text-[#a1a1aa] flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente..."
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

        {/* Tipo MRR */}
        <div className="flex items-center gap-1 rounded-md p-1 bg-[#f4f4f5] border border-[#e4e4e7]">
          {(['todos', 'mrr', 'unico'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroTipo(f)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={filtroTipo === f
                ? { background: '#ffffff', color: '#15803d', border: '1px solid #bbf7d0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                : { color: '#71717a', border: '1px solid transparent' }
              }
            >
              {f === 'todos' ? 'Todos' : f === 'mrr' ? 'MRR' : 'Únicos'}
            </button>
          ))}
        </div>

        {/* Vendedor */}
        <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} style={selectStyle}>
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>

        {/* Status */}
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={selectStyle}>
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>

        {/* Mês */}
        <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={selectStyle}>
          <option value="">Todos os meses</option>
          {MESES.map((nome, i) => (
            <option key={i} value={String(i + 1).padStart(2, '0')}>{nome}</option>
          ))}
        </select>

        {/* Ano */}
        <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} style={selectStyle}>
          <option value="">Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Mês de Referência */}
        <div className="flex items-center gap-1 rounded-md p-1 bg-[#f4f4f5] border border-[#e4e4e7]">
          <button
            onClick={() => setFiltroMesRef(null)}
            className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={filtroMesRef === null
              ? { background: '#ffffff', color: '#1d4ed8', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
              : { color: '#71717a', border: '1px solid transparent' }
            }
          >
            Todos
          </button>
          {mesesRefOpcoes.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setFiltroMesRef(idx)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={filtroMesRef === idx
                ? { background: '#ffffff', color: '#1d4ed8', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                : { color: '#71717a', border: '1px solid transparent' }
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
          { label: 'Registros filtrados', value: String(filtradas.length), color: '#1d4ed8' },
          { label: 'Faturamento filtrado', value: formatBRL(totalFaturamento), color: '#15803d' },
          { label: 'MRR total', value: formatBRL(totalMrr), color: '#7c3aed' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#e4e4e7] rounded-lg px-5 py-4" style={{ borderTop: `2px solid ${color}` }}>
            <p className="text-xl font-bold text-[#09090b]">{value}</p>
            <p className="text-xs text-[#71717a] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-[#f4f4f5]">
            <Users size={24} className="text-[#a1a1aa]" />
          </div>
          <p className="text-[#71717a] font-medium">
            {temFiltroAtivo ? 'Nenhum resultado para os filtros aplicados' : 'Nenhuma venda encontrada'}
          </p>
          {temFiltroAtivo && (
            <button onClick={limparFiltros} className="text-sm cursor-pointer text-[#1d4ed8] hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#e4e4e7] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">IXC</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Vendedor</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Produto</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Tipo</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Mês</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Data</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-[#71717a] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v, i) => (
                  <tr
                    key={v.id}
                    className="transition-colors hover:bg-[#fafafa]"
                    style={{ borderBottom: i < filtradas.length - 1 ? '1px solid #f4f4f5' : 'none' }}
                  >
                    <td className="px-5 py-4">
                      <p className="text-[#09090b] font-semibold">{v.cliente_nome}</p>
                      {v.cliente_uf && <p className="text-xs text-[#a1a1aa] mt-0.5">{v.cliente_uf}</p>}
                    </td>
                    <td className="px-4 py-4">
                      {v.codigo_contrato_ixc ? (
                        <div className="text-xs">
                          <p className="text-[#71717a]">Contrato: <span className="font-mono text-[#09090b]">{v.codigo_contrato_ixc}</span></p>
                          {v.codigo_cliente_ixc && <p className="text-[#a1a1aa] mt-0.5">Cliente: <span className="font-mono">{v.codigo_cliente_ixc}</span></p>}
                        </div>
                      ) : (
                        <span className="text-[#a1a1aa] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#71717a]">{v.vendedor?.nome ?? '—'}</td>
                    <td className="px-4 py-4 text-[#71717a]">{v.produto?.nome ?? '—'}</td>
                    <td className="px-4 py-4 text-center">
                      {v.mrr ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                          <RefreshCw size={11} />
                          MRR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">
                          <ShoppingBag size={11} />
                          Único
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {v.mes_referencia && v.ano_referencia ? (
                        <span className="text-xs text-[#71717a]">
                          {MESES_CURTO[v.mes_referencia - 1]}/{v.ano_referencia % 100}
                        </span>
                      ) : (
                        <span className="text-[#a1a1aa] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#71717a]">{formatDate(v.data_venda)}</td>
                    <td className="px-4 py-4 text-right font-bold text-[#09090b]">{formatBRL(v.valor_total)}</td>
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
                        {(v as VendaComJoins & { tags?: string[] | null }).tags?.includes('antigo') && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                            Parado +30d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditando(v)}
                          className="p-1.5 rounded-md transition-colors cursor-pointer text-[#a1a1aa] hover:text-[#09090b] hover:bg-[#f4f4f5]"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleExcluir(v.id)}
                          disabled={excluindoId === v.id}
                          className="p-1.5 rounded-md transition-colors cursor-pointer text-[#a1a1aa] hover:text-[#b91c1c] hover:bg-[#fef2f2] disabled:opacity-40 disabled:cursor-not-allowed"
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
