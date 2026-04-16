# Relatórios Gerenciais — Documentação Técnica

## Visão geral

Rota: `/relatorios` — dentro do AppShell, protegida por `permissao: 'relatorios'`.
**Arquivo principal:** `src/pages/Relatorios.tsx`

### Controle de acesso
- **Gestor** (`permissoes.relatorios = true` e sem `vendedorDbId`): vê as 3 abas completas, com filtro de vendedor em todas as abas e dados de todo o time.
- **Vendedor** (`vendedorDbId` definido): vê apenas Visão Geral e Por Vendedor, filtrado ao próprio ID. Aba Ranking oculta.

---

## Aba 1 — Visão Geral

**Componente:** `TabVisaoGeral`

### Filtros disponíveis
- Seletor de mês/ano (`MesAnoSelect`)
- Filtro de vendedor (apenas gestor — dropdown para todos ou indivíduo)

### Hooks utilizados
| Hook | Dados |
|------|-------|
| `useRelatoriosMes(mes, ano, vendedorEfetivo)` | Contratos do mês selecionado |
| `useRelatoriosRange(meses6, vendedorEfetivo)` | Últimos 6 meses para gráfico |
| `useMetas()` | Meta mensal do time (`meta_mensal`) |

### Seções e métricas

#### KPI Cards (5 cards)
Calculados via `calcKpis(contratos)`:
- Total Cadastrados, Aguardando Assinatura, Contratos Ativos
- Ticket Médio (`valor_total ativos / qtd ativos`)
- Taxa de Conversão (`ativos / total × 100`)

#### Meta do Time + Projeção de Fechamento (Fase 3 — Tarefa 3.1)
Grid 2 colunas visível apenas para gestor com meta definida:

**Meta do Time:** barra de progresso mostrando `ativos / meta_mensal`.

**Projeção de fechamento (Forecast):**
- Calculado via `calcForecast(contratos, mes, ano)` em `useRelatoriosIxc.ts`
- Lógica: conta dias úteis passados e totais do mês (excluindo sáb/dom)
- `forecast = (valorAtivos / diasUteisPassados) × diasUteisTotal`
- Retorna `null` se `diasUteisPassados === 0` (primeiro dia do mês)
- Semáforo: verde (≥100% da meta) · amarelo (50-99%) · vermelho (<50%)

#### Tempo Médio de Ativação + ARPU por Segmento (Fase 3 — Tarefas 3.2 e 3.3)
Grid 2 colunas:

**Tempo médio de ativação:**
- Calculado via `calcTempoAtivacao(contratos)` em `useRelatoriosIxc.ts`
- `daysDiff = status_atualizado_em − created_at` para contratos `status_ixc='A'`
- `status_atualizado_em` é uma aproximação da data de ativação no IXC
- Exibe: média do time em dias, melhor caso, pior caso, tamanho da amostra
- Consistente com a lógica de `TVTelaVelocidade` (TV Dashboard Fase 2)

**ARPU por segmento:**
- Calculado via `calcArpuPorSegmento(contratos)` em `useRelatoriosIxc.ts`
- Filtra `status_ixc='A'`, agrupa por `segmento.nome`
- `ARPU = receita_total / qtd_contratos` por segmento
- Ordenado do maior ARPU para o menor; badge "mais rentável" no 1º
- Requer join `segmento:segmentos(id,nome)` na query (adicionado na Fase 3)

#### Gráfico de Evolução (6 meses)
- Dados: `agruparPorMes(contratosRange, meses6)`
- Recharts `BarChart` com 3 séries: Total, Ativos, Aguardando

---

## Aba 2 — Ranking de Vendedores

**Componente:** `TabRanking` · somente gestor

### Hooks utilizados
| Hook | Dados |
|------|-------|
| `useRelatoriosMes(mes, ano, null)` | Todos os contratos do mês |
| `useMetasVendedor(mes, ano)` | Metas individuais por mês (`metas_vendedor`) |

### Seções e métricas
- Tabela ordenada por ativos desc
- Colunas: Pos, Vendedor, Ativos, Aguardando, Meta (editável inline), % Atingimento
- Meta editável via ícone lápis → input → salvar/cancelar (`upsertMeta`)
- Barra de progresso na coluna % Atingimento com `emptyLabel="Mês iniciando"`

---

## Aba 3 — Por Vendedor

**Componente:** `TabPorVendedor`

### Filtros disponíveis
- Seletor de vendedor (gestor pode escolher, vendedor está fixo no próprio)
- Seletor de mês/ano

### Hooks utilizados
| Hook | Dados |
|------|-------|
| `useRelatoriosMes(mes, ano, vendedorEfetivo)` | Contratos do vendedor no mês |
| `useRelatoriosMes(mes, ano, null)` | Dados do time para badges comparativos |
| `useRelatoriosRange(meses4, vendedorEfetivo)` | Últimos 4 meses para gráfico |
| `useMetasVendedor(mes, ano)` | Meta mensal do vendedor (tabela `metas_vendedor`) |

### Seções e métricas

#### KPI Cards (4 cards)
- Contratos Ativos, Aguardando Assinatura, % da Meta (`metas_vendedor`), Ticket Médio

#### Perfil de desempenho (Fase 3 — Tarefa 3.4)
Painel expandido com:
- **Taxa de conversão individual:** `ativos / total_cadastrados × 100`
- **Tempo médio de ativação:** via `calcTempoAtivacao(contratos)` — média, melhor e pior caso
- **Cancelamentos no período:** contratos com `status_ixc='C'`
- **Meta individual:** `vendedores.meta_mensal` (campo da tabela vendedores), com barra de progresso

**Badges comparativos** (requer dados do time):
- `★ Melhor conversão do time` — vendedor com maior `ativos/total` no mês
- `⚠ Mais cancelamentos do time` — vendedor com mais `status_ixc='C'` no mês

#### Barra de meta (metas_vendedor)
- Progresso vs. meta definida em `metas_vendedor` (editável na aba Ranking)

#### Gráfico de Evolução (4 meses)
- Recharts `BarChart` com 2 séries: Ativos, Aguardando

---

## Hook principal de dados — useRelatoriosIxc.ts

**Arquivo:** `src/hooks/useRelatoriosIxc.ts`
**Padrão:** React Query, `staleTime: 30min`, `gcTime: 35min`

### Select da query (todos os campos)
```
id, cliente_nome, valor_total, status_ixc, mrr, data_venda, dias_em_aa,
created_at, status_atualizado_em,
vendedor:vendedores(id, nome),
segmento:segmentos(id, nome)
```

### Funções utilitárias exportadas

| Função | Descrição |
|--------|-----------|
| `calcKpis(contratos)` | KPIs básicos: total, ativos, aguardando, ticketMedio, taxaConversao |
| `calcForecast(contratos, mes, ano)` | Projeção de fechamento por dias úteis |
| `calcArpuPorSegmento(contratos)` | ARPU por segmento, ordenado desc |
| `calcTempoAtivacao(contratos)` | Tempo médio/melhor/pior de ativação |
| `agruparPorMes(contratos, meses)` | Agrupa por mês para gráfico |
| `ultimosMeses(n, refMes, refAno)` | Gera array dos últimos N meses |

### Lógica do Forecast
```
diasUteisPassados = contar dias úteis de 1 até hoje (mês corrente)
                  = totalDiasUteisDoMes se mês já encerrou
diasUteisTotais   = contar todos os dias úteis do mês
forecast          = (valorAtivos / diasUteisPassados) × diasUteisTotais
retorna null      se diasUteisPassados === 0
```
Dias úteis excluem sábado (dow=6) e domingo (dow=0). Feriados não são considerados.

### Lógica do Tempo Médio de Ativação
```
daysDiff = Math.round((new Date(status_atualizado_em) - new Date(created_at)) / 86400000)
Filtros:
  - status_ixc === 'A'
  - status_atualizado_em IS NOT NULL
  - created_at IS NOT NULL
  - daysDiff >= 0 (sanity check)
```
`status_atualizado_em` é uma aproximação da data de ativação no IXC — representa o momento em que o status foi atualizado para 'A'. Esta é a mesma lógica usada em `TVTelaVelocidade` (TV Dashboard Fase 2).

---

## Log de mudanças

### Fase 4 (inicial)
- Criação da página com 3 abas: Visão Geral, Ranking, Por Vendedor
- KPIs, gráfico 6/4 meses, meta do time, meta por vendedor editável

### Fase 3 (2026-04-15)
| Tarefa | Mudança |
|--------|---------|
| 3.1 | Card de forecast com semáforo de ritmo |
| 3.2 | Tabela de ARPU por segmento com badge "mais rentável" |
| 3.3 | Card de tempo médio de ativação (consistente com TVTelaVelocidade) |
| 3.4 | Perfil expandido por vendedor: conversão, ativação, cancelamentos, meta individual, badges |
