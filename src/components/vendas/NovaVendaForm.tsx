import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatBRL, maskCPFCNPJ } from '@/lib/formatters'
import { UFS } from '@/constants'
import { useVendedores } from '@/hooks/useVendedores'
import { useSegmentos } from '@/hooks/useSegmentos'
import { useIxcFieldLookup } from '@/hooks/useIxcFieldLookup'
import { ixcBuscarContrato, ixcBuscarCliente, IXC_STATUSES } from '@/lib/ixc'
import { vendaFormSchema, type VendaFormData } from './vendaFormSchema'
import { toast } from '@/components/ui/Toast'

export type { NovaVendaFormData } from './vendaFormSchema'
interface NovaVendaFormProps { onSubmit: (data: VendaFormData) => Promise<void> }

const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }))
const STORAGE_KEY = 'salestracker_nova_venda_draft'

function getSavedRecorrenteData(): Partial<VendaFormData> | null {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return parsed.recorrente ?? null
    }
  } catch { /* ignore */ }
  return null
}

function saveRecorrenteData(data: Partial<VendaFormData>) {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    const parsed = saved ? JSON.parse(saved) : {}
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, recorrente: data }))
  } catch { /* ignore */ }
}

function clearRecorrenteData() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      delete parsed.recorrente
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    }
  } catch { /* ignore */ }
}

export function NovaVendaForm({ onSubmit }: NovaVendaFormProps) {
  const { vendedores } = useVendedores()
  const { segmentos } = useSegmentos()
  const today = new Date().toISOString().slice(0, 10)
  const [statusViaIxc, setStatusViaIxc] = useState(false)
  const isRestoring = useRef(true)

  // Restaurar dados salvos ou usar defaults
  const savedData = getSavedRecorrenteData()
  const defaultValues: Partial<VendaFormData> = {
    data_venda: today,
    mrr: false,
    quantidade: 1,
    valor_unitario: 0,
    comissao_pct: 0,
    produtos: [],
    ...savedData,
  }

  const { register, handleSubmit, control, watch, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<VendaFormData>({
    resolver: zodResolver(vendaFormSchema) as Resolver<VendaFormData>,
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
    saveRecorrenteData(formValues)
  }, [formValues])

  const produtosWatch = watch('produtos') ?? []

  const contratoLookup = useIxcFieldLookup({
    fetcher: ixcBuscarContrato,
    onSuccess: (contrato) => {
      // Status — armazena o código IXC bruto (ex: "A", "FA")
      if (contrato.status_code) {
        setValue('status_ixc', contrato.status_code)
        setStatusViaIxc(true)
      }

      // Vendedor — match pelo ixc_id salvo no Supabase
      if (contrato.id_vendedor) {
        const vend = vendedores.find((v) => v.ixc_id === contrato.id_vendedor)
        if (vend) setValue('vendedor_id', vend.id)
      }

      // Produtos do contrato
      if (contrato.produtos.length > 0) {
        setValue('produtos', contrato.produtos)
        // valor_unitario = soma de todos os valor_bruto (MRR total do contrato)
        const totalBruto = contrato.produtos.reduce((acc, p) => acc + p.valor_bruto, 0)
        if (!getValues('valor_unitario')) setValue('valor_unitario', totalBruto)
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar contrato no IXC'
      toast('error', msg)
    },
  })

  const clienteLookup = useIxcFieldLookup({
    fetcher: ixcBuscarCliente,
    onSuccess: (cliente) => {
      if (!getValues('cliente_nome'))     setValue('cliente_nome', cliente.razao)
      if (!getValues('cliente_cpf_cnpj')) setValue('cliente_cpf_cnpj', cliente.cnpj_cpf)
      if (!getValues('cliente_uf'))       setValue('cliente_uf', cliente.uf)
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar cliente no IXC'
      toast('error', msg)
    },
  })

  const qtd = watch('quantidade') || 0
  const valUnit = watch('valor_unitario') || 0
  const comPct = watch('comissao_pct') || 0
  const total = qtd * valUnit
  const comissao = total * comPct / 100

  async function onValid(data: VendaFormData) {
    await onSubmit(data)
    clearRecorrenteData()
    reset({ data_venda: today, mrr: false, quantidade: 1, valor_unitario: 0, comissao_pct: 0, produtos: [] })
    setStatusViaIxc(false)
  }

  return (
    <form onSubmit={handleSubmit(onValid)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 — Cliente */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Cliente</h3>

          {/* Códigos IXC primeiro — disparam o auto-preenchimento */}
          <div className="relative">
            <Input
              label="Cód. Cliente IXC"
              placeholder="Ex: 1234"
              hint="Auto-preenche nome, CPF e estado"
              error={errors.codigo_cliente_ixc?.message}
              disabled={clienteLookup.loading}
              {...register('codigo_cliente_ixc', { onBlur: clienteLookup.handleBlur })}
            />
            {clienteLookup.loading && <Spinner size="sm" className="absolute right-3 top-[34px]" style={{ color: '#00d68f' }} />}
          </div>
          <div className="relative">
            <Input
              label="Cód. Contrato IXC"
              placeholder="Ex: 5678"
              hint="Auto-preenche status, vendedor e produtos"
              error={errors.codigo_contrato_ixc?.message}
              disabled={contratoLookup.loading}
              {...register('codigo_contrato_ixc', { onBlur: contratoLookup.handleBlur })}
            />
            {contratoLookup.loading && <Spinner size="sm" className="absolute right-3 top-[34px]" style={{ color: '#00d68f' }} />}
          </div>

          {/* Produtos do contrato IXC */}
          {produtosWatch.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                Produtos do contrato
              </p>
              <div
                className="flex flex-col gap-1 rounded-xl p-3 max-h-40 overflow-y-auto"
                style={{ background: 'rgba(0,214,143,0.04)', border: '1px solid rgba(0,214,143,0.1)' }}
              >
                {produtosWatch.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-white/70 leading-tight flex-1 min-w-0 truncate">
                      {p.descricao || `Produto ${p.id}`}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 shrink-0">
                      {formatBRL(p.valor_bruto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Dados pessoais — preenchidos manualmente ou via IXC */}
          <Input label="Nome do Cliente" placeholder="Empresa XYZ" required error={errors.cliente_nome?.message} {...register('cliente_nome')} />
          <Controller
            name="cliente_cpf_cnpj"
            control={control}
            render={({ field }) => (
              <Input
                label="CPF / CNPJ"
                placeholder="000.000.000-00"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskCPFCNPJ(e.target.value))}
                error={errors.cliente_cpf_cnpj?.message}
              />
            )}
          />
          <Select label="Estado (UF)" options={ufOptions} placeholder="Selecione..." error={errors.cliente_uf?.message} {...register('cliente_uf')} />
        </GlassCard>

        {/* Coluna 2 — Venda */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Venda</h3>
          <Select label="Vendedor" options={vendedores.filter((v) => v.ativo).map((v) => ({ value: v.id, label: v.nome }))} placeholder="Selecione..." required error={errors.vendedor_id?.message} {...register('vendedor_id')} />
          <Select label="Segmento" options={segmentos.map((s) => ({ value: s.id, label: s.nome }))} placeholder="Selecione..." error={errors.segmento_id?.message} {...register('segmento_id')} />
          <div>
            <Select
              label="Status"
              options={IXC_STATUSES.map((s) => ({ value: s.code, label: s.label }))}
              placeholder="Selecione..."
              required
              error={errors.status_ixc?.message}
              disabled={contratoLookup.loading}
              {...register('status_ixc', { onChange: () => setStatusViaIxc(false) })}
            />
            {statusViaIxc && <Badge variant="info" className="mt-1 text-[10px]">via IXC</Badge>}
          </div>
          <Input label="Data da Venda" type="date" required error={errors.data_venda?.message} {...register('data_venda')} />
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-emerald-500" {...register('mrr')} />
            <span className="text-sm text-white/70">MRR (Receita Recorrente)</span>
          </label>
        </GlassCard>

        {/* Coluna 3 — Financeiro */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Financeiro</h3>
          <Input label="Quantidade" type="number" min={1} required error={errors.quantidade?.message} {...register('quantidade')} />
          <Input label="Valor Unitário (R$)" type="number" min={0} step={0.01} required error={errors.valor_unitario?.message} {...register('valor_unitario')} />
          <Input label="Comissão (%)" type="number" min={0} max={100} step={0.5} error={errors.comissao_pct?.message} {...register('comissao_pct')} />

          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'rgba(0,214,143,0.05)', border: '1px solid rgba(0,214,143,0.12)' }}>
            <div className="flex justify-between text-sm">
              <span className="text-white/45">Subtotal</span>
              <span className="font-bold text-white">{formatBRL(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/45">Comissão</span>
              <span className="font-bold" style={{ color: '#00d68f' }}>{formatBRL(comissao)}</span>
            </div>
          </div>

          <Input label="Descrição" placeholder="Observações opcionais..." error={errors.descricao?.message} {...register('descricao')} />
        </GlassCard>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" loading={isSubmitting} size="lg">Registrar Venda</Button>
      </div>
    </form>
  )
}
