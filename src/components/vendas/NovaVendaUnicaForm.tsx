/**
 * Formulário de Nova Venda Única (Projeto / Serviço)
 *
 * Dois modos de operação:
 * MODO 1 — Buscar do IXC: busca vendas avulsas do cliente
 * MODO 2 — Cadastro manual: preenche os campos manualmente
 */
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Search, Package, FileText, DollarSign, Check, AlertTriangle, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from '@/components/ui/Toast'
import { formatBRL } from '@/lib/formatters'
import { useVendedores } from '@/hooks/useVendedores'
import { useVendasUnicas, syncParcelasFromIxc, type VendaUnicaInsert } from '@/hooks/useVendasUnicas'
import { useAuthStore } from '@/store/authStore'
import { ixcBuscarVendasCliente, ixcBuscarCliente, type IxcVendaSaida } from '@/lib/ixc'

interface NovaVendaUnicaFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

type FormMode = 'select' | 'ixc' | 'manual'

/** Parcela parseada do ids_areceber da vd_saida */
interface ParcelaLocal {
  id: string
  valor: number
  data_vencimento: string
}

interface FormData {
  cliente_nome: string
  codigo_cliente_ixc: string
  id_venda_ixc: string
  descricao: string
  valor_total: number
  data_venda: string
  parcelas: number
  ids_areceber: string
  vendedor_id: string
}

const STORAGE_KEY = 'salestracker_nova_venda_draft'

interface SavedUnicaState {
  mode: FormMode
  formData: Partial<FormData>
  codigoClienteBusca: string
  clienteNomeIxc: string
}

function getSavedUnicaState(): SavedUnicaState | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.unica ?? null
    }
  } catch { /* ignore */ }
  return null
}

function saveUnicaState(state: SavedUnicaState) {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : {}
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, unica: state }))
  } catch { /* ignore */ }
}

function clearUnicaState() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      delete parsed.unica
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch { /* ignore */ }
}

export function NovaVendaUnicaForm({ onSuccess, onCancel }: NovaVendaUnicaFormProps) {
  const { vendedores } = useVendedores()
  const { createVendaUnica } = useVendasUnicas()
  const { user } = useAuthStore()
  const today = new Date().toISOString().slice(0, 10)
  const isRestoring = useRef(true)

  // Restaurar estado salvo
  const savedState = getSavedUnicaState()

  const [mode, setMode] = useState<FormMode>(savedState?.mode ?? 'select')
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Dados do IXC
  const [codigoClienteBusca, setCodigoClienteBusca] = useState(savedState?.codigoClienteBusca ?? '')
  const [vendasIxc, setVendasIxc] = useState<IxcVendaSaida[]>([])
  const [vendaSelecionada, setVendaSelecionada] = useState<IxcVendaSaida | null>(null)
  const [parcelasLocal, setParcelasLocal] = useState<ParcelaLocal[]>([])
  const [semBoletos, setSemBoletos] = useState(false)
  const [clienteNomeIxc, setClienteNomeIxc] = useState(savedState?.clienteNomeIxc ?? '')

  const defaultValues: Partial<FormData> = {
    data_venda: today,
    parcelas: 1,
    valor_total: 0,
    ...savedState?.formData,
  }

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues,
  })

  // Auto-salvar mudanças no sessionStorage
  const formValues = watch()
  useEffect(() => {
    // Não salvar durante a restauração inicial
    if (isRestoring.current) {
      isRestoring.current = false
      return
    }
    saveUnicaState({
      mode,
      formData: formValues,
      codigoClienteBusca,
      clienteNomeIxc,
    })
  }, [mode, formValues, codigoClienteBusca, clienteNomeIxc])

  const valorTotal = watch('valor_total') || 0

  // ── Buscar vendas do cliente no IXC ────────────────────────────────────────

  async function handleBuscarVendasIxc() {
    if (!codigoClienteBusca.trim()) {
      toast('warning', 'Informe o código do cliente IXC')
      return
    }

    setBuscando(true)
    setVendasIxc([])
    setVendaSelecionada(null)
    setParcelasLocal([])
    setSemBoletos(false)
    setClienteNomeIxc('')

    try {
      // Buscar dados do cliente
      const cliente = await ixcBuscarCliente(codigoClienteBusca.trim())
      setClienteNomeIxc(cliente.razao)
      setValue('cliente_nome', cliente.razao)
      setValue('codigo_cliente_ixc', codigoClienteBusca.trim())

      // Buscar vendas avulsas
      const vendas = await ixcBuscarVendasCliente(codigoClienteBusca.trim())
      setVendasIxc(vendas)

      if (vendas.length === 0) {
        toast('info', 'Nenhuma venda avulsa encontrada para este cliente')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar no IXC'
      toast('error', msg)
    } finally {
      setBuscando(false)
    }
  }

  // ── Selecionar venda do IXC ────────────────────────────────────────────────

  function handleSelecionarVenda(venda: IxcVendaSaida) {
    setVendaSelecionada(venda)
    setParcelasLocal([])
    setSemBoletos(false)
    setValue('id_venda_ixc', venda.id)
    setValue('valor_total', venda.valor_total)
    setValue('ids_areceber', venda.ids_areceber ?? '')
    setValue('data_venda', venda.data_saida?.slice(0, 10) ?? venda.data_emissao?.slice(0, 10) ?? today)
  }

  // ── Carregar parcelas do ids_areceber da vd_saida ───────────────────────────

  function handleCarregarParcelas() {
    if (!vendaSelecionada) return

    const idsStr = vendaSelecionada.ids_areceber?.trim() ?? ''
    const datasStr = vendaSelecionada.data_vencimento_areceber?.trim() ?? ''

    // Se não tem IDs de boletos, marcar como sem boletos
    if (!idsStr) {
      setParcelasLocal([])
      setSemBoletos(true)
      setValue('parcelas', 1)
      return
    }

    // Parsear os IDs (separados por vírgula)
    const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean)
    const datas = datasStr.split(',').map(s => s.trim())

    // Calcular valor de cada parcela
    const valorParcela = vendaSelecionada.valor_total / ids.length

    // Criar lista de parcelas
    const parcelas: ParcelaLocal[] = ids.map((id, i) => ({
      id,
      valor: valorParcela,
      data_vencimento: datas[i] ?? '—',
    }))

    setParcelasLocal(parcelas)
    setSemBoletos(false)
    setValue('parcelas', parcelas.length)
    toast('success', `${parcelas.length} parcela(s) carregada(s) da venda`)
  }

  // ── Salvar venda única ─────────────────────────────────────────────────────

  async function onSubmit(data: FormData) {
    if (!data.cliente_nome.trim()) {
      toast('warning', 'Informe o nome do cliente')
      return
    }
    if (!data.vendedor_id) {
      toast('warning', 'Selecione o vendedor')
      return
    }
    if (data.valor_total <= 0) {
      toast('warning', 'Informe o valor total')
      return
    }

    setSalvando(true)
    try {
      const payload: VendaUnicaInsert = {
        cliente_nome: data.cliente_nome.trim(),
        codigo_cliente_ixc: data.codigo_cliente_ixc || null,
        id_venda_ixc: data.id_venda_ixc || null,
        descricao: data.descricao || null,
        valor_total: data.valor_total,
        data_venda: data.data_venda,
        status: 'ativo',
        parcelas: data.parcelas || 1,
        ids_areceber: data.ids_areceber || null,
        vendedor_id: data.vendedor_id,
        created_by: user?.id ?? null,
      }

      const vendaId = await createVendaUnica(payload)

      // Se tem vínculo com IXC, sincronizar parcelas
      if (data.id_venda_ixc || data.ids_areceber) {
        try {
          await syncParcelasFromIxc(vendaId)
        } catch {
          toast('warning', 'Venda salva, mas houve erro ao sincronizar parcelas do IXC')
        }
      }

      toast('success', 'Projeto/Serviço cadastrado com sucesso!')
      clearUnicaState()
      reset()
      setMode('select')
      setVendasIxc([])
      setVendaSelecionada(null)
      setParcelasLocal([])
      setSemBoletos(false)
      setCodigoClienteBusca('')
      setClienteNomeIxc('')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast('error', msg)
    } finally {
      setSalvando(false)
    }
  }

  // ── Render: Seleção de modo ────────────────────────────────────────────────

  if (mode === 'select') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Nova Venda Única</h3>
            <p className="text-xs text-white/40 mt-1">Projetos e serviços avulsos (não entra na meta)</p>
          </div>
          {onCancel && (
            <button
              onClick={() => { clearUnicaState(); onCancel() }}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('ixc')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl transition-all cursor-pointer hover:scale-[1.02]"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
              <Search size={24} className="text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Buscar do IXC</p>
              <p className="text-xs text-white/40 mt-1">Importar venda avulsa do sistema</p>
            </div>
          </button>

          <button
            onClick={() => setMode('manual')}
            className="flex flex-col items-center gap-4 p-6 rounded-2xl transition-all cursor-pointer hover:scale-[1.02]"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <FileText size={24} className="text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Cadastro Manual</p>
              <p className="text-xs text-white/40 mt-1">Preencher dados manualmente</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Modo IXC ───────────────────────────────────────────────────────

  if (mode === 'ixc') {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setMode('select'); setVendasIxc([]); setVendaSelecionada(null); setParcelasLocal([]); setSemBoletos(false) }}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-lg font-bold text-white">Importar do IXC</h3>
              <p className="text-xs text-white/40 mt-0.5">Buscar venda avulsa pelo código do cliente</p>
            </div>
          </div>
          <Badge variant="info" className="text-xs">Modo IXC</Badge>
        </div>

        {/* Busca do cliente */}
        <GlassCard className="p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Código do Cliente IXC"
                placeholder="Ex: 1234"
                value={codigoClienteBusca}
                onChange={(e) => setCodigoClienteBusca(e.target.value)}
                disabled={buscando}
              />
            </div>
            <Button
              type="button"
              onClick={handleBuscarVendasIxc}
              loading={buscando}
              disabled={buscando || !codigoClienteBusca.trim()}
            >
              <Search size={14} />
              Buscar
            </Button>
          </div>

          {clienteNomeIxc && (
            <div className="mt-3 flex items-center gap-2">
              <Check size={14} className="text-emerald-400" />
              <span className="text-sm text-white">{clienteNomeIxc}</span>
            </div>
          )}
        </GlassCard>

        {/* Lista de vendas encontradas */}
        {vendasIxc.length > 0 && (
          <GlassCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-3">
              Vendas avulsas encontradas ({vendasIxc.length})
            </p>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {vendasIxc.map((venda) => {
                const isSelected = vendaSelecionada?.id === venda.id
                const statusLabel = venda.status === 'F' ? 'Finalizado' : venda.status === 'A' ? 'Aberto' : 'Cancelado'
                const statusColor = venda.status === 'F' ? '#00d68f' : venda.status === 'A' ? '#f59e0b' : '#ef4444'

                return (
                  <button
                    key={venda.id}
                    type="button"
                    onClick={() => handleSelecionarVenda(venda)}
                    className="flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left"
                    style={{
                      background: isSelected ? 'rgba(0,214,143,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(0,214,143,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-white/30" />
                      <div>
                        <p className="text-sm text-white font-medium">Venda #{venda.id}</p>
                        <p className="text-xs text-white/40">{venda.data_saida?.slice(0, 10) ?? venda.data_emissao?.slice(0, 10) ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{formatBRL(venda.valor_total)}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>
                        {statusLabel}
                      </span>
                      {isSelected && <Check size={16} className="text-emerald-400" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </GlassCard>
        )}

        {/* Venda selecionada — buscar parcelas */}
        {vendaSelecionada && (
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Venda selecionada</p>
                <p className="text-lg font-bold text-white mt-1">#{vendaSelecionada.id} — {formatBRL(vendaSelecionada.valor_total)}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCarregarParcelas}
              >
                <DollarSign size={14} />
                Carregar Parcelas
              </Button>
            </div>

            {/* Aviso: sem boletos vinculados */}
            {semBoletos && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-200 font-medium">Esta venda não possui boletos vinculados no IXC.</p>
                    <p className="text-xs text-white/40 mt-1">As parcelas serão controladas manualmente.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Parcelas carregadas */}
            {parcelasLocal.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-2">
                  Parcelas ({parcelasLocal.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {parcelasLocal.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-white/50">Parcela {i + 1}</span>
                      <span className="text-white/40">{p.data_vencimento}</span>
                      <span className="text-white font-medium">{formatBRL(p.valor)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,214,143,0.1)', color: '#00d68f' }}>
                        ID {p.id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Campos finais */}
        {vendaSelecionada && (
          <GlassCard className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Vendedor"
                options={vendedores.filter(v => v.ativo).map(v => ({ value: v.id, label: v.nome }))}
                placeholder="Selecione..."
                required
                error={errors.vendedor_id?.message}
                {...register('vendedor_id', { required: true })}
              />
              <Input
                label="Descrição"
                placeholder="Ex: Instalação de equipamentos"
                {...register('descricao')}
              />
            </div>

            <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-xs text-white/40">Projeto não entra na meta de contratos</span>
              </div>
              <Button type="submit" loading={salvando} disabled={salvando}>
                Cadastrar Projeto
              </Button>
            </div>
          </GlassCard>
        )}
      </form>
    )
  }

  // ── Render: Modo Manual ────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMode('select')}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
          <div>
            <h3 className="text-lg font-bold text-white">Cadastro Manual</h3>
            <p className="text-xs text-white/40 mt-0.5">Preencha os dados do projeto/serviço</p>
          </div>
        </div>
        <Badge variant="warning" className="text-xs">Modo Manual</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1 — Cliente e Projeto */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Cliente & Projeto</h4>

          <Input
            label="Nome do Cliente"
            placeholder="Empresa XYZ"
            required
            error={errors.cliente_nome?.message}
            {...register('cliente_nome', { required: true })}
          />

          <Input
            label="Código Cliente IXC"
            placeholder="Ex: 1234 (opcional)"
            {...register('codigo_cliente_ixc')}
          />

          <Input
            label="Descrição do Serviço"
            placeholder="Ex: Instalação de câmeras"
            {...register('descricao')}
          />

          <Select
            label="Vendedor"
            options={vendedores.filter(v => v.ativo).map(v => ({ value: v.id, label: v.nome }))}
            placeholder="Selecione..."
            required
            error={errors.vendedor_id?.message}
            {...register('vendedor_id', { required: true })}
          />
        </GlassCard>

        {/* Coluna 2 — Financeiro */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Financeiro</h4>

          <Input
            label="Valor Total (R$)"
            type="number"
            min={0}
            step={0.01}
            required
            error={errors.valor_total?.message}
            {...register('valor_total', { required: true, valueAsNumber: true })}
          />

          <Input
            label="Número de Parcelas"
            type="number"
            min={1}
            max={48}
            {...register('parcelas', { valueAsNumber: true })}
          />

          <Input
            label="Data da Venda"
            type="date"
            required
            {...register('data_venda', { required: true })}
          />

          <Input
            label="IDs dos Boletos IXC"
            placeholder="Ex: 123,456,789 (opcional)"
            hint="IDs separados por vírgula para sync automático"
            {...register('ids_areceber')}
          />

          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-white/45">Valor Total</span>
              <span className="font-bold text-white">{formatBRL(valorTotal)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
              <AlertTriangle size={12} />
              <span>Não entra na meta de contratos</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => setMode('select')}>
          Cancelar
        </Button>
        <Button type="submit" loading={salvando} disabled={salvando}>
          Cadastrar Projeto
        </Button>
      </div>
    </form>
  )
}
