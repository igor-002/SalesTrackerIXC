import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RefreshCw, ShoppingBag } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useProdutos } from '@/hooks/useProdutos'
import { useVendedores } from '@/hooks/useVendedores'
import { UFS } from '@/constants'

const schema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório (mín. 2 caracteres)'),
  cpf_cnpj: z.string().optional(),
  uf: z.string().optional(),
  produto_id: z.string().optional(),
  valor_pacote: z.coerce.number().min(0, 'Valor deve ser positivo'),
  mrr: z.boolean(),
  vendedor_id: z.string().optional(),
})

export type ClienteFormData = z.infer<typeof schema>

interface ClienteFormProps {
  onSubmit: (data: ClienteFormData) => Promise<void>
  onCancel: () => void
  defaultValues?: Partial<ClienteFormData>
  submitLabel?: string
}

export function ClienteForm({ onSubmit, onCancel, defaultValues, submitLabel = 'Salvar' }: ClienteFormProps) {
  const { produtos } = useProdutos()
  const { vendedores } = useVendedores()

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ClienteFormData>({
    resolver: zodResolver(schema) as Resolver<ClienteFormData>,
    defaultValues: { valor_pacote: 0, mrr: true, ...defaultValues },
  })

  const mrr = watch('mrr')

  const produtoOptions = produtos
    .filter((p) => p.ativo !== false)
    .map((p) => ({ value: p.id, label: p.nome }))

  const vendedorOptions = vendedores
    .filter((v) => v.ativo !== false)
    .map((v) => ({ value: v.id, label: v.nome }))

  const ufOptions = UFS.map((uf) => ({ value: uf, label: uf }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Nome do cliente"
        placeholder="Ex: Empresa XYZ"
        required
        error={errors.nome?.message}
        {...register('nome')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="CPF / CNPJ"
          placeholder="000.000.000-00"
          error={errors.cpf_cnpj?.message}
          {...register('cpf_cnpj')}
        />
        <Select
          label="UF"
          options={ufOptions}
          placeholder="—"
          {...register('uf')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Produto"
          options={produtoOptions}
          placeholder="Selecione..."
          {...register('produto_id')}
        />
        <Select
          label="Vendedor"
          options={vendedorOptions}
          placeholder="Selecione..."
          {...register('vendedor_id')}
        />
      </div>

      <Input
        label="Valor do pacote (R$)"
        type="number"
        min={0}
        step={0.01}
        placeholder="499.90"
        required
        error={errors.valor_pacote?.message}
        {...register('valor_pacote')}
      />

      {/* Tipo: MRR ou único */}
      <div>
        <p className="text-xs font-medium text-white/60 mb-2">Tipo de contrato</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue('mrr', true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer text-left"
            style={mrr
              ? { background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            <RefreshCw size={15} />
            <div>
              <p className="text-sm font-semibold leading-tight">Recorrente</p>
              <p className="text-xs opacity-70">MRR mensal</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setValue('mrr', false)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer text-left"
            style={!mrr
              ? { background: 'rgba(0,214,143,0.1)', borderColor: 'rgba(0,214,143,0.4)', color: '#00d68f' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            <ShoppingBag size={15} />
            <div>
              <p className="text-sm font-semibold leading-tight">Único</p>
              <p className="text-xs opacity-70">Sem recorrência</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting} className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
