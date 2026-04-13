import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ProdutosList } from '@/components/produtos/ProdutosList'
import { ProdutoForm, type ProdutoFormData } from '@/components/produtos/ProdutoForm'
import { useProdutos } from '@/hooks/useProdutos'
import { toast } from '@/components/ui/Toast'

export default function Produtos() {
  const { produtos, loading, createProduto, deleteProduto } = useProdutos()
  const [modalOpen, setModalOpen] = useState(false)

  async function handleCreate(data: ProdutoFormData) {
    try {
      await createProduto({
        nome: data.nome,
        descricao: data.descricao || null,
        preco_base: data.preco_base,
        recorrente: data.recorrente,
        ativo: true,
      } as never)
      setModalOpen(false)
      toast('success', 'Produto cadastrado com sucesso!')
    } catch {
      toast('error', 'Erro ao cadastrar produto.')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProduto(id)
      toast('success', 'Produto removido.')
    } catch {
      toast('error', 'Erro ao remover produto.')
    }
  }

  return (
    <>
      <ProdutosList
        produtos={produtos}
        loading={loading}
        onAdd={() => setModalOpen(true)}
        onDelete={handleDelete}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Produto">
        <ProdutoForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          submitLabel="Cadastrar"
        />
      </Modal>
    </>
  )
}
