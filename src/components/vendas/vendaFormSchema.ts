import { z } from 'zod'

const produtoIxcSchema = z.object({
  id:          z.string(),
  descricao:   z.string(),
  valor_unit:  z.number(),
  qtde:        z.number(),
  valor_bruto: z.number(),
})

export type ProdutoIxcForm = z.infer<typeof produtoIxcSchema>

export const vendaFormSchema = z.object({
  cliente_nome:        z.string().min(2, 'Nome do cliente é obrigatório'),
  cliente_cpf_cnpj:    z.string().optional(),
  cliente_uf:          z.string().length(2, 'Selecione um estado').optional().or(z.literal('')),
  codigo_cliente_ixc:  z.string().optional(),
  codigo_contrato_ixc: z.string().optional(),
  vendedor_id:         z.string().uuid('Selecione um vendedor'),
  segmento_id:         z.string().uuid('Selecione um segmento').optional().or(z.literal('')),
  status_ixc:          z.string().min(1, 'Selecione um status'),
  data_venda:          z.string().min(1, 'Data é obrigatória'),
  mrr:                 z.boolean(),
  quantidade:          z.coerce.number().int().min(1, 'Mínimo 1'),
  valor_unitario:      z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  comissao_pct:        z.coerce.number().min(0).max(100),
  descricao:           z.string().optional(),
  produtos:            z.array(produtoIxcSchema).optional().default([]),
})

export type VendaFormData = z.infer<typeof vendaFormSchema>

// Re-export de compatibilidade — usado em NovaVenda.tsx e Clientes.tsx
export type NovaVendaFormData = VendaFormData
