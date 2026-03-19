import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { MESES } from '@/constants'

const schema = z.object({
  ano: z.coerce.number().min(2020).max(2099),
  mes: z.coerce.number().min(1).max(12),
  meta_mensal: z.coerce.number().min(0, 'Meta deve ser positiva'),
  meta_semanal: z.coerce.number().min(0, 'Meta deve ser positiva'),
})

export type MetaFormData = z.infer<typeof schema>

interface MetaFormProps {
  onSubmit: (data: MetaFormData) => Promise<void>
}

const currentYear = new Date().getFullYear()
const anos = [currentYear - 1, currentYear, currentYear + 1].map((y) => ({ value: String(y), label: String(y) }))
const meses = MESES.map((nome, i) => ({ value: String(i + 1), label: nome }))

export function MetaForm({ onSubmit }: MetaFormProps) {
  const now = new Date()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MetaFormData>({
    resolver: zodResolver(schema) as Resolver<MetaFormData>,
    defaultValues: { ano: now.getFullYear(), mes: now.getMonth() + 1, meta_mensal: 0, meta_semanal: 0 },
  })

  async function onValid(data: MetaFormData) {
    await onSubmit(data)
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="glass rounded-2xl p-6">
      <h3 className="text-base font-semibold text-white mb-5">Definir Meta</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select label="Ano" options={anos} required error={errors.ano?.message} {...register('ano')} />
        <Select label="Mês" options={meses} required error={errors.mes?.message} {...register('mes')} />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Input label="Meta Mensal (R$)" type="number" min={0} step={500} required error={errors.meta_mensal?.message} {...register('meta_mensal')} />
        <Input label="Meta Semanal (R$)" type="number" min={0} step={100} required error={errors.meta_semanal?.message} {...register('meta_semanal')} />
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full">Salvar Meta</Button>
    </form>
  )
}
