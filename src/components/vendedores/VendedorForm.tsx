import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório (mín. 2 caracteres)'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  meta_mensal: z.coerce.number().min(0, 'Meta deve ser positiva'),
})

export type VendedorFormData = z.infer<typeof schema>

interface VendedorFormProps {
  onSubmit: (data: VendedorFormData) => Promise<void>
  onCancel: () => void
  defaultValues?: Partial<VendedorFormData>
  submitLabel?: string
}

export function VendedorForm({ onSubmit, onCancel, defaultValues, submitLabel = 'Salvar' }: VendedorFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<VendedorFormData>({
    resolver: zodResolver(schema) as Resolver<VendedorFormData>,
    defaultValues: { meta_mensal: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Nome"
        placeholder="João da Silva"
        required
        error={errors.nome?.message}
        {...register('nome')}
      />
      <Input
        label="Email"
        type="email"
        placeholder="joao@empresa.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Telefone"
        type="tel"
        placeholder="(11) 99999-9999"
        error={errors.telefone?.message}
        {...register('telefone')}
      />
      <Input
        label="Meta Mensal (R$)"
        type="number"
        min={0}
        step={100}
        placeholder="10000"
        required
        error={errors.meta_mensal?.message}
        {...register('meta_mensal')}
      />
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
