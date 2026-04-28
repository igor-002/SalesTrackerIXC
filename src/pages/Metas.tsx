import { useState } from 'react'
import { MetaForm, type MetaFormData } from '@/components/metas/MetaForm'
import { MetasHistorico } from '@/components/metas/MetasHistorico'
import { useMetas } from '@/hooks/useMetas'
import { useMetasVendedor } from '@/hooks/useMetasVendedor'
import { useVendedores } from '@/hooks/useVendedores'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/components/ui/Toast'
import { MESES } from '@/constants'

const now = new Date()
const ANOS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

export default function Metas() {
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})

  const { metas, loading, upsertMeta, deleteMeta } = useMetas()
  const { vendedores } = useVendedores()
  const { loading: loadingMV, upsertMeta: upsertMetaVendedor, getMetaVendedor } = useMetasVendedor(mes, ano)

  async function handleSubmit(data: MetaFormData) {
    try {
      await upsertMeta(data)
      toast('success', 'Meta salva com sucesso!')
    } catch {
      toast('error', 'Erro ao salvar meta.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMeta(id)
      toast('success', 'Meta removida.')
    } catch {
      toast('error', 'Erro ao remover meta.')
    }
  }

  async function handleSalvarVendedor(vendedorId: string) {
    const val = parseInt(inputs[vendedorId] ?? '0', 10)
    if (isNaN(val) || val < 0) return
    setSalvando(s => ({ ...s, [vendedorId]: true }))
    try {
      await upsertMetaVendedor(vendedorId, val)
      setInputs(s => { const n = { ...s }; delete n[vendedorId]; return n })
      toast('success', 'Meta salva!')
    } catch {
      toast('error', 'Erro ao salvar meta.')
    } finally {
      setSalvando(s => ({ ...s, [vendedorId]: false }))
    }
  }

  const vendedoresAtivos = (vendedores ?? []).filter(v => v.ativo !== false)

  const selectStyle = 'text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 focus:outline-none focus:border-emerald-500/40 cursor-pointer'

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <MetaForm onSubmit={handleSubmit} />
      <MetasHistorico metas={metas} loading={loading} onDelete={handleDelete} />

      {/* Metas por Vendedor */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Metas por Vendedor</h3>
            <p className="text-xs text-white/40 mt-0.5">Meta de contratos ativos por vendedor</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={mes}
              onChange={e => { setMes(Number(e.target.value)); setInputs({}) }}
              className={selectStyle}
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1} className="bg-[#0d1f12]">{m}</option>
              ))}
            </select>
            <select
              value={ano}
              onChange={e => { setAno(Number(e.target.value)); setInputs({}) }}
              className={selectStyle}
            >
              {ANOS.map(a => (
                <option key={a} value={a} className="bg-[#0d1f12]">{a}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingMV ? (
          <div className="flex justify-center py-6">
            <Spinner style={{ color: '#00d68f' }} />
          </div>
        ) : vendedoresAtivos.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">Nenhum vendedor ativo cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {vendedoresAtivos.map(v => {
              const metaAtual = getMetaVendedor(v.id)
              const inputVal = inputs[v.id] ?? (metaAtual > 0 ? String(metaAtual) : '')
              const isSaving = salvando[v.id] ?? false
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{v.nome}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {metaAtual > 0 ? `Meta atual: ${metaAtual} contratos` : 'Sem meta definida'}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={inputVal}
                    onChange={e => setInputs(s => ({ ...s, [v.id]: e.target.value }))}
                    placeholder={metaAtual > 0 ? String(metaAtual) : '0'}
                    className="w-20 text-sm text-center rounded-lg px-2 py-1.5 text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button
                    onClick={() => handleSalvarVendedor(v.id)}
                    disabled={isSaving}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    style={{ background: 'rgba(0,214,143,0.15)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.25)' }}
                  >
                    {isSaving ? '…' : 'Salvar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
