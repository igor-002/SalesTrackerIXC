import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ClientesTable } from '@/components/clientes/ClientesTable'
import { ClienteForm, type ClienteFormData } from '@/components/clientes/ClienteForm'
import { useClientes, type ClienteComJoins } from '@/hooks/useClientes'
import { toast } from '@/components/ui/Toast'

export default function Clientes() {
  const { clientes, loading, createCliente, updateCliente, deleteCliente } = useClientes()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClienteComJoins | null>(null)

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(cliente: ClienteComJoins) {
    setEditing(cliente)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSubmit(data: ClienteFormData) {
    try {
      const payload = {
        nome: data.nome,
        cpf_cnpj: data.cpf_cnpj || null,
        uf: data.uf || null,
        produto_id: data.produto_id || null,
        valor_pacote: data.valor_pacote,
        mrr: data.mrr,
        vendedor_id: data.vendedor_id || null,
      }

      if (editing) {
        await updateCliente(editing.id, payload)
        toast('success', 'Cliente atualizado!')
      } else {
        await createCliente({ ...payload, ativo: true })
        toast('success', 'Cliente cadastrado!')
      }
      closeModal()
    } catch {
      toast('error', 'Erro ao salvar cliente.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCliente(id)
      toast('success', 'Cliente removido.')
    } catch {
      toast('error', 'Erro ao remover cliente.')
    }
  }

  const defaultValues = editing ? {
    nome: editing.nome,
    cpf_cnpj: editing.cpf_cnpj ?? '',
    uf: editing.uf ?? '',
    produto_id: editing.produto_id ?? '',
    valor_pacote: editing.valor_pacote,
    mrr: editing.mrr,
    vendedor_id: editing.vendedor_id ?? '',
  } : undefined

  return (
    <>
      <ClientesTable
        clientes={clientes}
        loading={loading}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <ClienteForm
          key={editing?.id ?? 'new'}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          defaultValues={defaultValues}
          submitLabel={editing ? 'Salvar alterações' : 'Cadastrar'}
        />
      </Modal>
    </>
  )
}
