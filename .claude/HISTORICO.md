# Histórico de Vendedores — Documentação Técnica

## Visão Geral

Sistema que armazena contratos históricos dos últimos 3 meses para vendedores selecionados, permitindo análise de evolução e projeções futuras.

**Problema:** A tabela `vendas` é substituída integralmente a cada sync completo (apenas mês corrente), impedindo análise histórica.

**Solução:** Nova tabela `vendas_historico` armazena snapshots mensais dos contratos por vendedor.

---

## Tabela `vendas_historico`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK gerado automaticamente |
| `empresa_id` | uuid | Preenchido por trigger RLS |
| `vendedor_id` | uuid | FK para vendedores |
| `ixc_vendedor_id` | text | ID do vendedor no IXC |
| `cliente_nome` | text | Nome do cliente |
| `cliente_cpf_cnpj` | text | CPF/CNPJ do cliente |
| `codigo_cliente_ixc` | text | ID do cliente no IXC |
| `codigo_contrato_ixc` | text | ID do contrato no IXC |
| `plano` | text | Nome do plano/contrato |
| `valor_unitario` | numeric | MRR do contrato |
| `quantidade` | integer | Sempre 1 |
| `mrr` | boolean | Sempre true |
| `status_ixc` | text | Status no IXC (A, AA, etc) |
| `data_ativacao` | date | Data de ativação do contrato |
| `mes_referencia` | integer | Mês do registro (1-12) |
| `ano_referencia` | integer | Ano do registro |
| `filial_id` | text | ID da filial no IXC |
| `created_at` | timestamp | Data de criação do registro |
| `ultima_atualizacao` | timestamp | Última atualização no IXC |

---

## Configuração de Vendedores

### Campo `incluir_historico`

- Localização: tabela `vendedores`, campo `incluir_historico` (boolean)
- Default: `false`
- Toggle disponível na página `/vendedores`

### Vendedores pré-configurados

| ixc_id | Nome |
|--------|------|
| 137 | Cesar Augusto Nascimento de Oliveira |
| 133 | Marinho Barbosa Neto |
| 143 | Giovanni Medeiros Bernardes |
| 150 | Thaiane Barros Estevam |

### UI de configuração

**Página:** `/vendedores`

- Coluna "Histórico" com toggle cyan
- Badge "HIST" ao lado do nome quando ativo
- Toggle só visível para vendedores ativos no CRM
- Botão "Sync Histórico" no header com barra de progresso

---

## Sync de Histórico

### Função principal

**Arquivo:** `src/services/ixcSync.ts`
**Função:** `syncHistoricoVendedores(onProgress?)`

### Fluxo

1. Buscar vendedores com `incluir_historico = true`
2. Calcular os 3 meses anteriores ao mês atual
3. Para cada vendedor:
   - Buscar todos os contratos via `ixcListarContratosPorVendedor(ixc_id)`
   - Filtrar: status='A', filiais 1 ou 6
4. Para cada mês:
   - Filtrar contratos com `data_ativacao` no range do mês
   - Deletar registros existentes do mesmo vendedor/mês/ano
   - Inserir novos registros em `vendas_historico`
5. Registrar em `sync_log` com tipo `historico_vendedores`

### Integração com sync completo

O `syncHistoricoVendedores()` é chamado automaticamente ao final do `syncContratosFromIXC()` de forma não-fatal (erros não interrompem o sync principal).

### Tipos de sync em `sync_log`

| Valor | Descrição |
|-------|-----------|
| `historico_vendedores` | Sync de histórico dos 3 meses anteriores |

---

## Hook de Dados

### `useVendasHistorico()`

**Arquivo:** `src/hooks/useVendasHistorico.ts`

Busca todos os registros de `vendas_historico` com join de vendedor.

```typescript
const { data, isLoading } = useVendasHistorico()
```

### `useHistoricoAgrupado()`

Agrupa dados por mês+vendedor, retornando totais e valores.

### `useEvolucao6Meses(vendedorIdFiltro?)`

Calcula evolução de 6 meses:

| Posição | Tipo | Dados |
|---------|------|-------|
| 1-3 | `real` | Dados de `vendas_historico` (3 meses anteriores) |
| 4 | `atual` | Dados de `vendas` (mês corrente) |
| 5-6 | `projecao` | Média dos 3 meses reais |

**Retorno:**
```typescript
{
  porVendedor: Evolucao6MesesVendedor[]  // Por vendedor
  totalTime: Evolucao6MesesRow[]         // Total do time
  loading: boolean
}
```

---

## Cálculo de Projeção

### Fórmula

```
projecao_contratos = média(meses_1_a_3)
projecao_valor = média(valores_meses_1_a_3)
```

### Considerações

- Projeção simples baseada na média aritmética
- Não considera sazonalidade (pode ser adicionado futuramente)
- Projeção individual por vendedor disponível na tabela de performance

---

## UI na Página de Relatórios

### Gráfico de Evolução

- 6 barras com cores diferenciadas:
  - Verde sólido (`#00d68f`): dados reais (meses anteriores)
  - Cyan (`#06b6d4`): mês atual
  - Verde translúcido (`#00d68f40`): projeção
- Legenda visual no header do gráfico

### Tabela de Performance

**Visível apenas para gestores**

- Colunas: Vendedor + 6 meses
- Valores: quantidade de contratos + valor em R$
- Headers com indicação de tipo (proj para projeções)
- Linha de total do time na última linha
- Filtrável por vendedor via dropdown

---

## Arquivos Relacionados

| Arquivo | Função |
|---------|--------|
| `src/services/ixcSync.ts` | `syncHistoricoVendedores()` |
| `src/lib/ixc.ts` | `ixcListarContratosPorVendedor()` |
| `src/hooks/useVendasHistorico.ts` | Hooks de dados |
| `src/hooks/useVendedores.ts` | `toggleIncluirHistorico()` |
| `src/pages/Vendedores.tsx` | UI de configuração |
| `src/pages/Relatorios.tsx` | Gráfico e tabela |

---

## Log de Mudanças

### Fase 7 (2026-04-22)

| Tarefa | Mudança |
|--------|---------|
| 7.1 | `syncHistoricoVendedores()` e `ixcListarContratosPorVendedor()` |
| 7.2 | Toggle "Histórico" e botão "Sync Histórico" em Vendedores |
| 7.3 | Hooks `useVendasHistorico`, `useEvolucao6Meses` |
| 7.4 | Gráfico com cores por tipo e tabela de performance |
| 7.5 | Integração no sync completo (já na 7.1) |
| 7.6 | Documentação HISTORICO.md |
