import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatBRL, maskCPFCNPJ } from '@/lib/formatters'
import { UFS } from '@/constants'
import { useVendedores } from '@/hooks/useVendedores'
import { useSegmentos } from '@/hooks/useSegmentos'
import { useProdutos } from '@/hooks/useProdutos'
import { useStatusVenda } from '@/hooks/useStatusVenda'

const schema = z.object({
  cliente_nome: z.string().min(2, 'Nome do cliente é obrigatório'),
  cliente_cpf_cnpj: z.string().optional(),
  cliente_uf: z.string().length(2, 'Selecione um estado').optional().or(z.literal('')),
  vendedor_id: z.string().uuid('Selecione um vendedor'),
  segmento_id: z.string().uuid('Selecione um segmento').optional().or(z.literal('')),
  status_id: z.string().uuid('Selecione um status'),
  produto_id: z.string().uuid('Selecione um produto').optional().or(z.literal('')),
  data_venda: z.string().min(1, 'Data é obrigatória'),
  mrr: z.boolean(),
  quantidade: z.coerce.number().int().min(1, 'Mínimo 1'),
  valor_unitario: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  comissao_pct: z.coerce.number().min(0).max(100),
  descricao: z.string().optional(),
})

export type NovaVendaFormData = z.infer<typeof schema>
interface NovaVendaFormProps { onSubmit: (data: NovaVendaFormData) => Promise<void> }

const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }))

export function NovaVendaForm({ onSubmit }: NovaVendaFormProps) {
  const { vendedores } = useVendedores()
  const { segmentos } = useSegmentos()
  const { produtos } = useProdutos()
  const { statuses } = useStatusVenda()
  const today = new Date().toISOString().slice(0, 10)

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<NovaVendaFormData>({
    resolver: zodResolver(schema) as Resolver<NovaVendaFormData>,
    defaultValues: { data_venda: today, mrr: false, quantidade: 1, valor_unitario: 0, comissao_pct: 0 },
  })

  const qtd = watch('quantidade') || 0
  const valUnit = watch('valor_unitario') || 0
  const comPct = watch('comissao_pct') || 0
  const total = qtd * valUnit
  const comissao = total * comPct / 100

  async function onValid(data: NovaVendaFormData) {
    await onSubmit(data)
    reset({ data_venda: today, mrr: false, quantidade: 1, valor_unitario: 0, comissao_pct: 0 })
  }

  return (
    <form onSubmit={handleSubmit(onValid)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 — Cliente */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Cliente</h3>
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
          <Select label="Vendedor" options={vendedores.map((v) => ({ value: v.id, label: v.nome }))} placeholder="Selecione..." required error={errors.vendedor_id?.message} {...register('vendedor_id')} />
          <Select label="Segmento" options={segmentos.map((s) => ({ value: s.id, label: s.nome }))} placeholder="Selecione..." error={errors.segmento_id?.message} {...register('segmento_id')} />
          <Select label="Status" options={statuses.map((s) => ({ value: s.id, label: s.nome }))} placeholder="Selecione..." required error={errors.status_id?.message} {...register('status_id')} />
          <Select label="Produto" options={produtos.map((p) => ({ value: p.id, label: p.nome }))} placeholder="Selecione..." error={errors.produto_id?.message} {...register('produto_id')} />
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
