import { useState, useMemo } from 'react'
import { RefreshCw, Users, Search, History } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { useVendedores } from '@/hooks/useVendedores'
import { syncHistoricoVendedores } from '@/services/ixcSync'

export default function Vendedores() {
  const { vendedores, loading, updateVendedor, toggleIncluirHistorico, refetch } = useVendedores()
  const [syncing, setSyncing] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [syncingHistorico, setSyncingHistorico] = useState(false)
  const [progressHistorico, setProgressHistorico] = useState({ message: '', percent: 0 })
  const [togglingHistorico, setTogglingHistorico] = useState<string | null>(null)

  const vendedoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return vendedores
    return vendedores.filter(
      (v) => v.nome.toLowerCase().includes(termo) || (v.ixc_id ?? '').includes(termo)
    )
  }, [vendedores, busca])

  async function handleToggleAtivo(vendedorId: string, nome: string, checked: boolean) {
    setSyncing(vendedorId)
    try {
      await updateVendedor(vendedorId, { ativo: checked })
      toast('success', checked ? `${nome} ativado no CRM` : `${nome} desativado`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSyncing(null)
    }
  }

  async function handleToggleHistorico(vendedorId: string, checked: boolean) {
    setTogglingHistorico(vendedorId)
    try {
      await toggleIncluirHistorico(vendedorId, checked)
      toast('success', checked ? 'Incluído no histórico' : 'Removido do histórico')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setTogglingHistorico(null)
    }
  }

  async function handleSyncHistorico() {
    setSyncingHistorico(true)
    setProgressHistorico({ message: 'Iniciando...', percent: 0 })
    try {
      const result = await syncHistoricoVendedores((msg, pct) => {
        setProgressHistorico({ message: msg, percent: pct ?? 0 })
      })
      toast('success', `Histórico sincronizado — ${result.contratosInseridos} contratos`)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro no sync')
    } finally {
      setSyncingHistorico(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#09090b]">Vendedores</h1>
          <p className="text-sm text-[#71717a] mt-0.5">
            Selecione quais vendedores do IXC aparecem no CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSyncHistorico}
            disabled={syncingHistorico}
            className="bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#dbeafe]"
          >
            <History size={15} className={syncingHistorico ? 'animate-spin' : ''} />
            Sync Histórico
          </Button>
          <Button variant="secondary" onClick={() => refetch()} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Barra de progresso do sync histórico */}
      {syncingHistorico && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Spinner size="sm" />
            <span className="text-sm text-[#09090b] font-medium">Sincronizando histórico...</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-[#e4e4e7]">
            <div
              className="h-full rounded-full transition-all duration-300 bg-[#1d4ed8]"
              style={{ width: `${progressHistorico.percent}%` }}
            />
          </div>
          <p className="text-xs text-[#71717a] mt-2">{progressHistorico.message}</p>
        </GlassCard>
      )}

      {vendedores.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou ID IXC..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg text-[#09090b] placeholder-[#a1a1aa] outline-none focus:ring-2 focus:ring-[#09090b]/10 bg-white border border-[#e4e4e7]"
          />
        </div>
      )}

      <GlassCard className="p-0 overflow-hidden">
        {loading && !vendedores.length ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : !vendedores.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={40} className="text-[#a1a1aa]" />
            <p className="text-sm text-[#71717a]">Nenhum vendedor cadastrado</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                  Vendedor
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                  ID IXC
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                  Ativo no CRM
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                  Histórico
                </th>
              </tr>
            </thead>
            <tbody>
              {vendedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#71717a]">
                    Nenhum resultado para "{busca}"
                  </td>
                </tr>
              ) : vendedoresFiltrados.map((v, i) => (
                  <tr
                    key={v.id}
                    className="hover:bg-[#fafafa] transition-colors"
                    style={{
                      borderBottom:
                        i < vendedoresFiltrados.length - 1
                          ? '1px solid #f4f4f5'
                          : undefined,
                    }}
                  >
                    <td className="px-5 py-3.5 text-sm text-[#09090b] font-medium">
                      <span className="flex items-center gap-2">
                        {v.nome}
                        {v.incluir_historico && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                            HIST
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#71717a] font-mono">{v.ixc_id ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      {syncing === v.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={v.ativo ?? false}
                            onChange={(e) => handleToggleAtivo(v.id, v.nome, e.target.checked)}
                          />
                          <div
                            className="w-10 h-5 rounded-full transition-all duration-200
                              bg-[#e4e4e7] peer-checked:bg-[#15803d]
                              after:content-[''] after:absolute after:top-0.5 after:left-0.5
                              after:bg-white after:rounded-full after:h-4 after:w-4
                              after:transition-all after:duration-200
                              peer-checked:after:translate-x-5 after:shadow-sm"
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {!v.ativo ? (
                        <span className="text-xs text-[#a1a1aa]">—</span>
                      ) : togglingHistorico === v.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={v.incluir_historico ?? false}
                            onChange={(e) => handleToggleHistorico(v.id, e.target.checked)}
                          />
                          <div
                            className="w-10 h-5 rounded-full transition-all duration-200
                              bg-[#e4e4e7] peer-checked:bg-[#1d4ed8]
                              after:content-[''] after:absolute after:top-0.5 after:left-0.5
                              after:bg-white after:rounded-full after:h-4 after:w-4
                              after:transition-all after:duration-200
                              peer-checked:after:translate-x-5 after:shadow-sm"
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>

          </table>
        )}
      </GlassCard>

      {vendedores.length > 0 && (
        <p className="text-xs text-[#a1a1aa] text-center">
          {vendedores.filter((v) => v.ativo).length} de {vendedores.length} vendedores ativos no CRM
        </p>
      )}
    </div>
  )
}
