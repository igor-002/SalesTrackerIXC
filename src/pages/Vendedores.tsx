import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { VendedoresList } from '@/components/vendedores/VendedoresList'
import { VendedorForm, type VendedorFormData } from '@/components/vendedores/VendedorForm'
import { useVendedores } from '@/hooks/useVendedores'
import { toast } from '@/components/ui/Toast'

export default function Vendedores() {
  const { vendedores, loading, createVendedor, deleteVendedor } = useVendedores()
  const [modalOpen, setModalOpen] = useState(false)

  async function handleCreate(data: VendedorFormData) {
    try {
      await createVendedor({
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        meta_mensal: data.meta_mensal,
        ativo: true,
      } as never)
      setModalOpen(false)
      toast('success', 'Vendedor cadastrado com sucesso!')
    } catch (err) {
      toast('error', 'Erro ao cadastrar vendedor.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVendedor(id)
      toast('success', 'Vendedor removido.')
    } catch {
      toast('error', 'Erro ao remover vendedor.')
    }
  }

  return (
    <>
      <VendedoresList
        vendedores={vendedores}
        loading={loading}
        onAdd={() => setModalOpen(true)}
        onDelete={handleDelete}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Vendedor">
        <VendedorForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          submitLabel="Cadastrar"
        />
      </Modal>
    </>
  )
}
