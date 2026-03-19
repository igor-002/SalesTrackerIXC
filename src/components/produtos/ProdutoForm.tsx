import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RefreshCw, ShoppingBag } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório (mín. 2 caracteres)'),
  descricao: z.string().optional(),
  preco_base: z.coerce.number().min(0, 'Preço deve ser positivo'),
  recorrente: z.boolean(),
})

export type ProdutoFormData = z.infer<typeof schema>

interface ProdutoFormProps {
  onSubmit: (data: ProdutoFormData) => Promise<void>
  onCancel: () => void
  defaultValues?: Partial<ProdutoFormData>
  submitLabel?: string
}

export function ProdutoForm({ onSubmit, onCancel, defaultValues, submitLabel = 'Salvar' }: ProdutoFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProdutoFormData>({
    resolver: zodResolver(schema) as Resolver<ProdutoFormData>,
    defaultValues: { preco_base: 0, recorrente: false, ...defaultValues },
  })

  const recorrente = watch('recorrente')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Nome do produto"
        placeholder="Ex: Plano Premium"
        required
        error={errors.nome?.message}
        {...register('nome')}
      />
      <Input
        label="Descrição"
        placeholder="Descrição opcional"
        error={errors.descricao?.message}
        {...register('descricao')}
      />
      <Input
        label="Preço base (R$)"
        type="number"
        min={0}
        step={0.01}
        placeholder="99.90"
        required
        error={errors.preco_base?.message}
        {...register('preco_base')}
      />

      {/* Recorrente toggle */}
      <div>
        <p className="text-xs font-medium text-white/60 mb-2">Tipo de produto</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue('recorrente', false)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer text-left"
            style={!recorrente
              ? { background: 'rgba(0,214,143,0.1)', borderColor: 'rgba(0,214,143,0.4)', color: '#00d68f' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            <ShoppingBag size={16} />
            <div>
              <p className="text-sm font-semibold leading-tight">Sem recorrência</p>
              <p className="text-xs opacity-70">Venda única</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setValue('recorrente', true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer text-left"
            style={recorrente
              ? { background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.4)', color: '#06b6d4' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            <RefreshCw size={16} />
            <div>
              <p className="text-sm font-semibold leading-tight">Recorrente</p>
              <p className="text-xs opacity-70">Cobrança mensal</p>
            </div>
          </button>
        </div>
        <input type="hidden" {...register('recorrente', { setValueAs: (v) => Boolean(v) })} />
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
