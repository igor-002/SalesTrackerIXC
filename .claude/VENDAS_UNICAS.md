# Vendas Unicas (Projetos & Servicos)

Documentacao da feature de vendas unicas implementada na Fase 5.

## Regras de Negocio Criticas

1. **NAO contam na meta mensal/semanal** - Vendas unicas sao separadas das vendas recorrentes
2. **NAO contam no MRR** - Sao receitas pontuais, nao recorrentes
3. **Receita real = soma de parcelas pagas** - O campo `valor_total` e apenas referencia; o que importa e `status_pagamento = 'pago'` nas parcelas
4. **Aparecam SEPARADAS** - Em Dashboard, TV e Relatorios, vendas unicas tem secao propria

## Tabelas no Supabase

### `vendas_unicas`
```sql
id                   uuid PRIMARY KEY
cliente_nome         text NOT NULL
codigo_cliente_ixc   text          -- vinculo com cliente IXC
id_venda_ixc         text          -- ID da venda no vd_saida
descricao            text
valor_total          numeric       -- valor de referencia
parcelas             integer       -- quantidade de parcelas
data_venda           date
vendedor_id          uuid REFERENCES vendedores(id)
status               text          -- 'ativo' | 'cancelado'
created_at           timestamptz
created_by           uuid
```

### `vendas_unicas_parcelas`
```sql
id                   uuid PRIMARY KEY
venda_unica_id       uuid REFERENCES vendas_unicas(id)
id_areceber_ixc      text          -- ID no fn_areceber
numero_parcela       integer
valor                numeric
data_vencimento      date
data_pagamento       date
status_pagamento     text          -- 'a_receber' | 'pago' | 'em_atraso' | 'cancelado'
created_at           timestamptz
```

## Hooks Disponiveis

### `useVendasUnicas()`
```ts
import { useVendasUnicas } from '@/hooks/useVendasUnicas'

const { vendas, isLoading, createVendaUnica, updateVendaUnica, deleteVendaUnica } = useVendasUnicas()

// vendas inclui campos calculados:
// - valor_recebido: soma das parcelas pagas
// - valor_pendente: soma das parcelas a_receber
// - valor_em_atraso: soma das parcelas em_atraso
// - progresso_pct: (valor_recebido / valor_total) * 100
// - status_geral: 'pago' | 'a_receber' | 'em_atraso' | 'cancelado'
```

### `useVendaUnicaById(id)`
```ts
const { venda, isLoading } = useVendaUnicaById('uuid-aqui')
```

### `useVendasUnicasMes()`
```ts
// Retorna vendas do mes atual com stats agregadas
const { data, isLoading } = useVendasUnicasMes()

// data.vendas - lista de vendas
// data.stats - { total_projetos, valor_vendido, valor_recebido, valor_pendente, valor_em_atraso }
```

### `syncParcelasFromIxc(idVendaUnica)`
```ts
// Sincroniza parcelas de uma venda com o IXC
await syncParcelasFromIxc('uuid-da-venda')
```

### `syncAllVendasUnicas()`
```ts
// Sincroniza todas as vendas que tem vinculo IXC
// Chamada automaticamente no sync geral (ixcSync.ts)
const result = await syncAllVendasUnicas()
// result: { atualizadas, erros, total }
```

## Componentes

### `NovaVendaUnicaForm`
Formulario com dois modos:
- **Modo IXC**: Busca vendas avulsas do cliente no IXC (vd_saida), seleciona, importa parcelas (fn_areceber)
- **Modo Manual**: Preenchimento manual com campos opcionais de vinculo IXC

### `TVTelaProjetoServico`
Tela do TV Dashboard com:
- Cards de resumo (total, recebido, pendente, atraso)
- Lista de projetos com barra de progresso

## Integracao IXC

### Endpoints usados:
- `GET /cliente/{id}` - Dados do cliente
- `GET /vd_saida` - Vendas avulsas (filtro por id_cliente)
- `GET /fn_areceber` - Titulos a receber (parcelas)

### Mapeamento de status:
```ts
IXC status -> status_pagamento local
'A'        -> 'a_receber'
'R'        -> 'pago'
'C', 'E'   -> 'cancelado'
vencido    -> 'em_atraso' (calculado pela data)
```

## Fluxo de Sync

1. `sincronizarStatusIxc()` roda (manual ou scheduled)
2. Apos sync de contratos, chama `syncAllVendasUnicas()`
3. Para cada venda com `id_venda_ixc`:
   - Busca parcelas no IXC via `fn_areceber`
   - Atualiza status_pagamento local
   - Calcula campos derivados (valor_recebido, etc)

## Onde aparecem

| Local         | Componente/Secao              | Cor      |
|---------------|-------------------------------|----------|
| Dashboard     | Secao "Projetos & Servicos"   | Roxo     |
| TV Dashboard  | Tela 7 do carrossel           | Roxo     |
| Relatorios    | Aba "Projetos & Servicos"     | Roxo     |
| Nova Venda    | Toggle "Venda Unica (Projeto)"| Roxo     |

## Arquivos principais

- `src/hooks/useVendasUnicas.ts` - Hook com CRUD e sync
- `src/components/vendas/NovaVendaUnicaForm.tsx` - Formulario
- `src/components/tv/TVTelaProjetoServico.tsx` - Tela TV
- `src/pages/Dashboard.tsx` - Secao de projetos
- `src/pages/Relatorios.tsx` - Aba de projetos
- `src/pages/NovaVenda.tsx` - Toggle para venda unica
- `src/services/ixcSync.ts` - Integracao no sync automatico
