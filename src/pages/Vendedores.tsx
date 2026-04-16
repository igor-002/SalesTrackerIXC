import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Users, Search } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { ixcListarVendedores, ixcConfigurado, type IxcVendedor } from '@/lib/ixc'
import { useVendedores } from '@/hooks/useVendedores'

export default function Vendedores() {
  const { vendedores, loading: loadingSupabase, syncVendedorIxc, disableVendedorIxc } = useVendedores()
  const [ixcVendedores, setIxcVendedores] = useState<IxcVendedor[]>([])
  const [loadingIxc, setLoadingIxc] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

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

  const isLoading = loadingIxc || loadingSupabase

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendedores</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Selecione quais vendedores do IXC aparecem no CRM
          </p>
        </div>
        <Button variant="secondary" onClick={fetchFromIxc} disabled={loadingIxc}>
          <RefreshCw size={15} className={loadingIxc ? 'animate-spin' : ''} />
          Sincronizar
        </Button>
      </div>

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
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  Ativo no CRM
                </th>
              </tr>
            </thead>
            <tbody>
              {vendedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-sm text-white/30">
                    Nenhum resultado para "{busca}"
                  </td>
                </tr>
              ) : vendedoresFiltrados.map((v, i) => (
                <tr
                  key={v.id}
                  style={{
                    borderBottom:
                      i < vendedoresFiltrados.length - 1
                        ? '1px solid rgba(255,255,255,0.04)'
                        : undefined,
                  }}
                >
                  <td className="px-5 py-3.5 text-sm text-white font-medium">{v.nome}</td>
                  <td className="px-5 py-3.5 text-sm text-white/40 font-mono">{v.id}</td>
                  <td className="px-5 py-3.5 text-right">
                    {syncing === v.id ? (
                      <Spinner size="sm" style={{ color: '#00d68f' }} />
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isAtivo(v.id)}
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
                </tr>
              ))}
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
