import { MetaForm, type MetaFormData } from '@/components/metas/MetaForm'
import { MetasHistorico } from '@/components/metas/MetasHistorico'
import { useMetas } from '@/hooks/useMetas'
import { toast } from '@/components/ui/Toast'

export default function Metas() {
  const { metas, loading, upsertMeta, deleteMeta } = useMetas()

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

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <MetaForm onSubmit={handleSubmit} />
      <MetasHistorico metas={metas} loading={loading} onDelete={handleDelete} />
    </div>
  )
}
