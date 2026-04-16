import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatBRL, maskCPFCNPJ } from '@/lib/formatters'
import { UFS } from '@/constants'
import { useVendedores } from '@/hooks/useVendedores'
import { useSegmentos } from '@/hooks/useSegmentos'
import { useIxcFieldLookup } from '@/hooks/useIxcFieldLookup'
import { ixcBuscarContrato, ixcBuscarCliente, IXC_STATUSES } from '@/lib/ixc'
import type { VendaComJoins } from '@/hooks/useVendas'
import { toast } from '@/components/ui/Toast'
import { vendaFormSchema, type VendaFormData } from './vendaFormSchema'

type FormData = VendaFormData

interface EditVendaModalProps {
  venda: VendaComJoins
  open: boolean
  onClose: () => void
  onSave: (id: string, data: FormData) => Promise<void>
}

const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }))

export function EditVendaModal({ venda, open, onClose, onSave }: EditVendaModalProps) {
  const { vendedores } = useVendedores()
  const { segmentos } = useSegmentos()
  const [statusViaIxc, setStatusViaIxc] = useState(false)

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(vendaFormSchema) as Resolver<FormData>,
    defaultValues: {
      cliente_nome: venda.cliente_nome,
      cliente_cpf_cnpj: venda.cliente_cpf_cnpj ?? '',
      cliente_uf: venda.cliente_uf ?? '',
      codigo_cliente_ixc: venda.codigo_cliente_ixc ?? '',
      codigo_contrato_ixc: venda.codigo_contrato_ixc ?? '',
      vendedor_id: venda.vendedor?.id ?? '',
      segmento_id: venda.segmento?.id ?? '',
      status_ixc: venda.status_ixc ?? '',
      data_venda: venda.data_venda,
      mrr: venda.mrr ?? false,
      quantidade: venda.quantidade,
      valor_unitario: venda.valor_unitario,
      comissao_pct: venda.comissao_pct ?? 0,
      descricao: venda.descricao ?? '',
      produtos: [],
    },
  })

  const contratoLookup = useIxcFieldLookup({
    fetcher: ixcBuscarContrato,
    onSuccess: (contrato) => {
      if (contrato.status_code) {
        setValue('status_ixc', contrato.status_code)
        setStatusViaIxc(true)
      }
      if (contrato.id_vendedor) {
        const vend = vendedores.find((v) => v.ixc_id === contrato.id_vendedor)
        if (vend) setValue('vendedor_id', vend.id)
      }
      if (contrato.produtos.length > 0) {
        setValue('produtos', contrato.produtos)
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

  async function onValid(data: FormData) {
    await onSave(venda.id, data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Venda" size="xl">
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-5">
        {/* Linha 1 — Cliente */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35">Cliente</p>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          <div className="grid grid-cols-3 gap-3">
            <Input label="Nome do Cliente" required error={errors.cliente_nome?.message} {...register('cliente_nome')} />
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
          </div>
        </div>

        {/* Linha 2 — Venda */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35 mb-3">Venda</p>
          <div className="grid grid-cols-3 gap-3">
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
            <div className="flex items-end pb-2 col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded cursor-pointer accent-emerald-500" {...register('mrr')} />
                <span className="text-sm text-white/70">MRR (Receita Recorrente)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Linha 3 — Financeiro */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/35 mb-3">Financeiro</p>
          <div className="grid grid-cols-4 gap-3">
            <Input label="Quantidade" type="number" min={1} required error={errors.quantidade?.message} {...register('quantidade')} />
            <Input label="Valor Unitário (R$)" type="number" min={0} step={0.01} required error={errors.valor_unitario?.message} {...register('valor_unitario')} />
            <Input label="Comissão (%)" type="number" min={0} max={100} step={0.5} error={errors.comissao_pct?.message} {...register('comissao_pct')} />
            <div className="rounded-xl p-3 flex flex-col justify-center gap-1.5" style={{ background: 'rgba(0,214,143,0.05)', border: '1px solid rgba(0,214,143,0.12)' }}>
              <div className="flex justify-between text-xs">
                <span className="text-white/45">Total</span>
                <span className="font-bold text-white">{formatBRL(total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/45">Comissão</span>
                <span className="font-bold" style={{ color: '#00d68f' }}>{formatBRL(comissao)}</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Input label="Descrição" placeholder="Observações opcionais..." error={errors.descricao?.message} {...register('descricao')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Salvar alterações</Button>
        </div>
      </form>
    </Modal>
  )
}
