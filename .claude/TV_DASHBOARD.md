# TV Dashboard — Documentação Técnica

## Visão Geral

O TV Dashboard é uma tela de carrossel em modo full-screen destinada a exibição em monitores de equipe.
Rota: `/tv` — renderizado sem `AppShell` (layout próprio).

---

## Arquitetura do Carrossel

**Arquivo principal:** `src/pages/TVDashboard.tsx`

- 4 telas: `Visão Geral · Funil · Alertas · Ranking`
- `SLIDE_INTERVAL = 15000ms` (15s por tela)
- Estado `tela` (0-3) controla a tela ativa
- Ref `intervalRef` guarda o `setInterval`
- `pausado` (boolean state) suspende o carrossel
- Botão play/pause na barra inferior
- Tema (`blue` | `green`) persiste em `localStorage` via chave `tv_theme`
- Transição: `opacity` + `scale` com `transition-all duration-700`

---

## Temas

| Chave    | bg        | primary    | secondary  |
|----------|-----------|------------|------------|
| `green`  | `#0c1e14` | `#00d68f`  | `#06b6d4`  |
| `blue`   | `#080f1e` | `#3b82f6`  | `#60a5fa`  |

Ambas as cores são passadas via prop `t: TVThemeColors` a cada tela.

---

## Telas e Componentes

### Tela 0 — Visão Geral
**Arquivo:** `src/components/tv/TVTelaVisaoGeral.tsx`

**Props:**
```ts
faturamentoReal: number        // soma valor_total onde status_ixc = 'A'
faturamentoPrometido: number   // soma valor_total onde status_ixc = 'AA'
mrrReal: number                // soma valor_total onde mrr=true e status_ixc='A'
mrrProjetado: number           // soma valor_total onde mrr=true (todos)
faturamento12Meses: { mes: string; valor: number }[]  // via dashStats
mrr12Meses: { mes: string; valor: number }[]           // adicionado na Fase 1 Task 1.3
t: TVThemeColors
```

**Layout:** Grid 2 colunas — esquerda (métricas Realidade + Cadastrado), direita (gráfico 12 meses).
**Gráfico:** `BarChartFaturamento` — convertido para `ComposedChart` com linha de MRR (Task 1.3).

---

### Tela 1 — Funil
**Arquivo:** `src/components/tv/TVTelaFunil.tsx`

**Props:**
```ts
funilCounts: FunilCounts   // { A, AA, CM, FA, CN, N }
taxaConversao: number      // (A / (A+AA)) * 100
faturamentoReal: number
faturamentoPrometido: number
vendasPorDiaSemana: { dia: string; qtd: number }[]
t: TVThemeColors
```

**Layout:** Funil visual à esquerda + gráfico de barras da semana à direita.

---

### Tela 2 — Alertas AA
**Arquivo:** `src/components/tv/TVTelaAlertas.tsx`

**Props:**
```ts
alertasAA: AlertaAATv[]  // contratos status='AA', ordenados por dias_em_aa desc
t: TVThemeColors
```

**Interface AlertaAATv:**
```ts
{ id, cliente_nome, dias_em_aa, vendedor: { id, nome } | null, codigo_contrato_ixc }
```

**Regra de urgência (Task 1.1):**
```ts
const verde   = dias >= 1 && dias <= 3   // badge verde "Em dia"
const atencao = dias >= 4 && dias <= 7   // badge amarelo "Atenção"
const urgente = dias > 7                  // badge vermelho "Urgente"
// dias === 0 → sem badge / "Pendente"
```

---

### Tela 3 — Ranking
**Arquivo:** `src/components/tv/TVTelaRanking.tsx`

**Props:**
```ts
rankingVendedores: VendedorRanking[]
t: TVThemeColors
```

**Interface VendedorRanking (Task 1.2 — expandida):**
```ts
{
  id: string
  nome: string
  total: number             // faturamento contratos A
  qtd: number               // qtd contratos A
  ticketMedio: number       // total / qtd
  totalCadastrados: number  // todos os status do mês
  taxaConversao: number     // (qtd / totalCadastrados) * 100
}
```

**Layout:** Lista ordenada por `total` desc. Posições 1-3 têm medalhas emoji. Métricas secundárias (Task 1.2) exibidas abaixo do nome.

---

## Hook de Dados — useTVStats

**Arquivo:** `src/hooks/useTVStats.ts`

**Queries:**
1. `vendasMes` — todas as vendas do mês atual (`gte data_venda inicioMes`)
2. `vendasSemana` — vendas da semana atual para gráfico de barras
3. `vendas12Meses` — últimos 12 meses para gráfico (adicionado Task 1.3)

**Cálculos:**
- `faturamentoReal`: soma `valor_total` onde `status_ixc = 'A'`
- `faturamentoPrometido`: soma `valor_total` onde `status_ixc = 'AA'`
- `mrrReal`: soma `valor_total` onde `mrr=true` e `status_ixc='A'`
- `taxaConversao`: `A / (A + AA) * 100`
- `alertasAA`: filtrado por `status_ixc='AA'`, ordenado por `dias_em_aa desc`
- `rankingVendedores`: agrupado por vendedor, apenas `status_ixc='A'`, + métricas secundárias (Task 1.2)

---

## Gráfico de Faturamento

**Arquivo:** `src/components/charts/BarChartFaturamento.tsx`

- Biblioteca: **Recharts**
- Props: `data: { mes: string; valor: number; mrr?: number }[]`, `accentHex?: string`
- Convertido de `BarChart` para `ComposedChart` na Task 1.3
- Linha de MRR: `stroke="#06b6d4"` (ciano — cor `secondary` do tema)

---

## Componentes UI Compartilhados

### ProgressBar
**Arquivo:** `src/components/ui/ProgressBar.tsx`

Props: `value`, `color`, `size`, `animated`, `className`, `showLabel`, `emptyLabel?` (Task 1.4)

**Estado "Mês iniciando" (Task 1.4):**
Quando `value < 5` e `emptyLabel` está definido: renderiza borda tracejada em vez de barra sólida.

### TVMetaBar
**Arquivo:** `src/components/tv/TVMetaBar.tsx`

Passa `emptyLabel="Mês iniciando"` ao `ProgressBar` quando `pct < 5` (Task 1.4).

---

---

## Tela 4 — Planos mais vendidos
**Arquivo:** `src/components/tv/TVTelaPlanos.tsx`

**Props:**
```ts
planosMes: PlanoStat[]   // { nome, qtd, total, ticketMedio } ordenado por qtd desc
t: TVThemeColors
```

**Dados de:** `useTVStats.ts` — filtra `status_ixc='A'` do mês, agrupa por `segmento.nome`.
**Layout:** Header + lista com barra proporcional ao líder em qtd + rodapé com ticket médio geral.

---

## Tela 5 — Cancelamentos e churn
**Arquivo:** `src/components/tv/TVTelaChurn.tsx`

**Props:**
```ts
churn: ChurnStats   // { canceladosMes, canceladosMesAnterior, bloqueadosMes, bloqueadosMesAnterior }
t: TVThemeColors
```

**Dados de:** `useTVStats.ts` — duas queries separadas filtradas por `status_atualizado_em` (não `data_venda`).
Status: `C` = cancelado, `B` = bloqueado.
**Layout:** 2 cards grandes (vermelho/amarelo) com delta vs. mês anterior + banner de alerta se cancelamentos aumentaram.
**Nota:** campo `motivo_cancelamento` não existe no schema — seção de motivos omitida.

---

## Tela 6 — Velocidade de ativação
**Arquivo:** `src/components/tv/TVTelaVelocidade.tsx`

**Props:**
```ts
velocidadeVendedores: VelocidadeVendedor[]   // { id, nome, mediaDias, melhorCaso, piorCaso, totalContratos }
mediaVelocidadeTime: number
t: TVThemeColors
```

**Dados de:** `useTVStats.ts` — calcula `daysDiff = status_atualizado_em - created_at` para contratos `A`.
`status_atualizado_em` é usada como aproximação da data de ativação no IXC (ver comentário no hook).
**Layout:** Ranking do mais rápido ao mais lento. Badge "verificar operação" quando `mediaDias > 2× mediaVelocidadeTime`.
Rodapé com média do time.

---

## Log de Mudanças

### Fase 1 (2026-04-15)

| Task | Mudança |
|------|---------|
| 1.1  | Cor progressiva alertas AA: verde (1-3d) / amarelo (4-7d) / vermelho (>7d) |
| 1.2  | Métricas secundárias no ranking: contratos, ticket médio, taxa de conversão individual |
| 1.3  | Linha de MRR ciano sobreposta no gráfico de 12 meses (ComposedChart) |
| 1.4  | Estado "Mês iniciando" com barra tracejada no ProgressBar quando < 5% |

### Fase 2 (2026-04-15)

| Task | Mudança |
|------|---------|
| 2.1  | Nova tela: Planos mais vendidos (agrupado por segmento, contratos A do mês) |
| 2.2  | Nova tela: Cancelamentos e churn (status B/C via status_atualizado_em, delta vs. mês anterior) |
| 2.3  | Nova tela: Velocidade de ativação por vendedor (dias created_at → status_atualizado_em) |
| 2.4  | Carrossel expandido de 4 para 7 telas; useTVStats extendido com novos selects e queries |
