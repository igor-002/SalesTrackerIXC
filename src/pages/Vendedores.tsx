import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Users, Search, History } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { ixcListarVendedores, ixcConfigurado, type IxcVendedor } from '@/lib/ixc'
import { useVendedores } from '@/hooks/useVendedores'
import { syncHistoricoVendedores } from '@/services/ixcSync'

export default function Vendedores() {
  const { vendedores, loading: loadingSupabase, syncVendedorIxc, disableVendedorIxc, toggleIncluirHistorico } = useVendedores()
  const [ixcVendedores, setIxcVendedores] = useState<IxcVendedor[]>([])
  const [loadingIxc, setLoadingIxc] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [syncingHistorico, setSyncingHistorico] = useState(false)
  const [progressHistorico, setProgressHistorico] = useState({ message: '', percent: 0 })
  const [togglingHistorico, setTogglingHistorico] = useState<string | null>(null)

  const vendedoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return ixcVendedores
    return ixcVendedores.filter(
      (v) => v.nome.toLowerCase().includes(termo) || v.id.includes(termo)
    )
  }, [ixcVendedores, busca])

  async function fetchFromIxc() {
    if (!ixcConfigurado()) {
      toast('error', 'Proxy IXC não configurado (VITE_IXC_PROXY_URL)')
      return
    }
    setLoadingIxc(true)
    try {
      const data = await ixcListarVendedores()
      setIxcVendedores(data)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao buscar vendedores do IXC')
    } finally {
      setLoadingIxc(false)
    }
  }

  useEffect(() => { fetchFromIxc() }, [])

  async function handleToggle(ixcVend: IxcVendedor, checked: boolean) {
    setSyncing(ixcVend.id)
    try {
      if (checked) {
        await syncVendedorIxc(ixcVend)
        toast('success', `${ixcVend.nome} ativado no CRM`)
      } else {
        await disableVendedorIxc(ixcVend.id)
        toast('success', `${ixcVend.nome} desativado`)
      }
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSyncing(null)
    }
  }

  function isAtivo(ixcId: string): boolean {
    return vendedores.some((v) => v.ixc_id === ixcId && v.ativo === true)
  }

  function getVendedorByIxcId(ixcId: string) {
    return vendedores.find((v) => v.ixc_id === ixcId)
  }

  function incluiHistorico(ixcId: string): boolean {
    const v = getVendedorByIxcId(ixcId)
    return v?.incluir_historico === true
  }

  async function handleToggleHistorico(ixcId: string, checked: boolean) {
    const vendedor = getVendedorByIxcId(ixcId)
    if (!vendedor) return
    setTogglingHistorico(ixcId)
    try {
      await toggleIncluirHistorico(vendedor.id, checked)
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

  const isLoading = loadingIxc || loadingSupabase

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendedores</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Selecione quais vendedores do IXC aparecem no CRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSyncHistorico}
            disabled={syncingHistorico}
            style={{ background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.3)', color: '#06b6d4' }}
          >
            <History size={15} className={syncingHistorico ? 'animate-spin' : ''} />
            Sync Histórico
          </Button>
          <Button variant="secondary" onClick={fetchFromIxc} disabled={loadingIxc}>
            <RefreshCw size={15} className={loadingIxc ? 'animate-spin' : ''} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Barra de progresso do sync histórico */}
      {syncingHistorico && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Spinner size="sm" style={{ color: '#06b6d4' }} />
            <span className="text-sm text-white font-medium">Sincronizando histórico...</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressHistorico.percent}%`, background: '#06b6d4' }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2">{progressHistorico.message}</p>
        </GlassCard>
      )}

      {ixcVendedores.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou ID IXC..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-emerald-500/50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
      )}

      <GlassCard className="p-0 overflow-hidden">
        {isLoading && !ixcVendedores.length ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" style={{ color: '#00d68f' }} />
          </div>
        ) : !ixcVendedores.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={40} className="text-white/20" />
            <p className="text-sm text-white/40">Nenhum vendedor ativo encontrado no IXC</p>
            <Button variant="secondary" size="sm" onClick={fetchFromIxc}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Vendedor
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  ID IXC
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Ativo no CRM
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Histórico
                </th>
              </tr>
            </thead>
            <tbody>
              {vendedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-white/30">
                    Nenhum resultado para "{busca}"
                  </td>
                </tr>
              ) : vendedoresFiltrados.map((v, i) => {
                const ativo = isAtivo(v.id)
                const historico = incluiHistorico(v.id)
                return (
                  <tr
                    key={v.id}
                    style={{
                      borderBottom:
                        i < vendedoresFiltrados.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : undefined,
                    }}
                  >
                    <td className="px-5 py-3.5 text-sm text-white font-medium">
                      <span className="flex items-center gap-2">
                        {v.nome}
                        {historico && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
                          >
                            HIST
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-white/40 font-mono">{v.id}</td>
                    <td className="px-5 py-3.5 text-center">
                      {syncing === v.id ? (
                        <Spinner size="sm" style={{ color: '#00d68f' }} />
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={ativo}
                            onChange={(e) => handleToggle(v, e.target.checked)}
                          />
                          <div
                            className="w-10 h-5 rounded-full transition-all duration-200
                              bg-white/10 peer-checked:bg-emerald-500
                              after:content-[''] after:absolute after:top-0.5 after:left-0.5
                              after:bg-white after:rounded-full after:h-4 after:w-4
                              after:transition-all after:duration-200
                              peer-checked:after:translate-x-5"
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {!ativo ? (
                        <span className="text-xs text-white/20">—</span>
                      ) : togglingHistorico === v.id ? (
                        <Spinner size="sm" style={{ color: '#06b6d4' }} />
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={historico}
                            onChange={(e) => handleToggleHistorico(v.id, e.target.checked)}
                          />
                          <div
                            className="w-10 h-5 rounded-full transition-all duration-200
                              bg-white/10 peer-checked:bg-cyan-500
                              after:content-[''] after:absolute after:top-0.5 after:left-0.5
                              after:bg-white after:rounded-full after:h-4 after:w-4
                              after:transition-all after:duration-200
                              peer-checked:after:translate-x-5"
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>

          </table>
        )}
      </GlassCard>

      {ixcVendedores.length > 0 && (
        <p className="text-xs text-white/25 text-center">
          {vendedores.filter((v) => v.ativo && v.ixc_id).length} de {ixcVendedores.length} vendedores ativos no CRM
        </p>
      )}
    </div>
  )
}
