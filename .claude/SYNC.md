# Sincronização IXC — Documentação Técnica

## Visão Geral

O sistema sincroniza contratos do IXCSoft de duas formas:

1. **Sync Completo (Fase 6)**: Importa todos os contratos do mês diretamente do IXC, substituindo
   os dados da tabela `vendas`. Elimina necessidade de cadastro manual.

2. **Sync de Status**: Atualiza apenas o `status_ixc` dos contratos já cadastrados (polling a cada 30min).

Toda execução é registrada na tabela `sync_log`.

---

## Tabela `sync_log`

| Coluna                  | Tipo      | Descrição |
|-------------------------|-----------|-----------|
| `id`                    | uuid      | PK gerado automaticamente |
| `empresa_id`            | uuid      | Preenchido por trigger RLS |
| `tipo`                  | text      | Identificador do processo (ver abaixo) |
| `status`                | text      | `em_andamento` · `sucesso` · `erro` |
| `registros_processados` | integer   | Total de contratos analisados |
| `registros_atualizados` | integer   | Contratos que tiveram `status_ixc` alterado |
| `registros_erro`        | integer   | Contratos que falharam individualmente |
| `erro_mensagem`         | text      | Mensagem do erro fatal (nulo se sucesso) |
| `iniciado_em`           | timestamptz | Início da execução |
| `finalizado_em`         | timestamptz | Fim da execução (nulo se em andamento) |
| `duracao_ms`            | integer   | `finalizado_em - iniciado_em` em ms |

### Tipos de sync (`tipo`)

| Valor            | Descrição |
|------------------|-----------|
| `ixc_contratos`  | Sync normal — atualiza `status_ixc` e `dias_em_aa` de todos os contratos vinculados ao IXC |
| `reconciliacao`  | Detecta e corrige divergências pontuais entre CRM e IXC |

---

## Fluxo de Sincronização Normal (`ixc_contratos`)

**Arquivo:** `src/services/ixcSync.ts`
**Disparado por:** `useIxcSync` (React Query, polling a cada 30 min) ou botão "Sincronizar agora"

```
1. Insere sync_log { tipo: 'ixc_contratos', status: 'em_andamento' }
2. Busca todas as vendas WHERE codigo_contrato_ixc IS NOT NULL
3. Para cada venda (paralelo):
   a. Chama ixcBuscarStatusContrato(codigo_contrato_ixc)
   b. Se statusChanged: atualiza status_ixc + status_atualizado_em
   c. Se status = 'AA': recalcula dias_em_aa a partir do campo 'data' do IXC
4. Atualiza sync_log com status='sucesso', contadores e duracao_ms
5. Dispara runReconciliacao() automaticamente (não-fatal)
```

**Comportamento de falha:**
- Falha individual de contrato: registrada em `registros_erro`, não interrompe os demais
- Falha fatal (ex: query Supabase): atualiza sync_log com `status='erro'` e re-lança o erro

---

## Reconciliação CRM vs. IXC

**Arquivo:** `src/services/reconciliacao.ts`
**Função:** `runReconciliacao(empresaId: string): Promise<ReconciliacaoResult>`

### Quando é disparada

1. **Automática:** ao final de cada sync normal (`ixc_contratos`) — não-fatal, falha silenciosa
2. **Manual:** botão "Reconciliar agora" no painel de histórico do Dashboard

### Divergências detectadas e corrigidas

| Situação | CRM | IXC | Ação |
|----------|-----|-----|------|
| Contrato ativado | `AA` | `A` | Atualiza para `A` + `status_atualizado_em = now()` |
| Contrato bloqueado sem update | `A` | `B` | Atualiza para `B` + `status_atualizado_em = now()` |
| Contrato cancelado sem update | `A` | `C` | Atualiza para `C` + `status_atualizado_em = now()` |

Outros pares de status (ex: `AA→B`, `A→AA`) são ignorados — apenas os casos acima representam
divergências operacionais críticas.

### Resultado (`ReconciliacaoResult`)

```ts
{
  total: number         // total de contratos analisados
  divergencias: number  // divergências encontradas (com ou sem atualização)
  atualizadas: number   // divergências corrigidas com sucesso no DB
  erros: number         // divergências que falharam ao atualizar
}
```

---

## Hook `useSyncStatus` / `useHistoricoSync`

**Arquivo:** `src/hooks/useSyncStatus.ts`

### `useSyncStatus()`
- Busca o **último** registro de `sync_log` (qualquer tipo)
- `refetchInterval: 60s` — atualização automática
- Usado pelo `TVSyncIndicator` no TV Dashboard

### `useHistoricoSync()`
- Busca os **últimos 10** registros de `sync_log` ordenados por `iniciado_em desc`
- Expõe `refetchTudo()` para invalidar ambas as queries após sync/reconciliação manual
- Usado pelo painel "Sincronização IXC" no Dashboard principal

---

## Indicador no TV Dashboard (`TVSyncIndicator`)

**Arquivo:** `src/components/tv/TVSyncIndicator.tsx`
**Posição:** footer do carrossel, à esquerda dos dots de navegação

| Cor | Condição |
|-----|----------|
| 🟢 Verde | `status = 'sucesso'` e `finalizado_em` há < 30 min |
| 🟡 Amarelo | `status = 'sucesso'` e `finalizado_em` há 30–60 min |
| 🔴 Vermelho | `status = 'sucesso'` e `finalizado_em` há > 60 min |
| 🔴 Vermelho | `status = 'erro'` |

---

## Painel no Dashboard principal

**Componente:** `SyncHistoricoCard` em `src/pages/Dashboard.tsx`
**Visível:** apenas quando `ixcConfigurado()` retorna `true`

### Layout (colapsável)
- **Header:** sempre visível — badge status + horário do último sync + registro count
- **Último sync em destaque:** status, horário, contadores, erro se houver
- **Lista dos 10 registros:** horário, tipo, status badge, contratos processados/atualizados, duração
- **Botão "Sincronizar agora":** dispara `useIxcSync.sincronizarAgora()`
- **Botão "Reconciliar agora":** chama `runReconciliacao('')` diretamente

### Interpretação dos status

| Badge | Significa |
|-------|-----------|
| `sucesso` (verde) | Sync concluído sem erros fatais. `registros_erro > 0` indica falhas individuais toleradas. |
| `em andamento` (amarelo) | Processo em execução. Se persistir > 5min, pode indicar travamento. |
| `erro` (vermelho) | Falha fatal antes de processar todos os contratos. Ver `erro_mensagem`. |

---

## Log de Mudanças

### Fase 4 (2026-04-16)

| Tarefa | Mudança |
|--------|---------|
| 4.1 | `ixcSync.ts` registra início/fim/erro em `sync_log` a cada execução |
| 4.2 | `TVSyncIndicator` no footer do TV Dashboard com semáforo temporal (30/60 min) |
| 4.3 | Card colapsável "Sincronização IXC" no Dashboard com histórico e botão de sync manual |
| 4.4 | `reconciliacao.ts` detecta e corrige AA→A, A→B/C; disparada automaticamente após sync e por botão manual |

---

## Sync Completo de Contratos (Fase 6)

### Fluxo `syncContratosFromIXC()`

**Arquivo:** `src/services/ixcSync.ts`
**Hook:** `useIxcSyncFull()` em `src/hooks/useIxcSync.ts`

```
1. Registra início em sync_log (tipo='ixc_contratos_full')
2. Carrega lista de vendedores do Supabase para mapeamento
3. Busca contratos com status 'A' (ativos) do IXC (paginado, rp=200)
4. Busca contratos com status 'AA' (aguardando) do IXC (paginado, rp=200)
5. Filtra apenas filiais permitidas (1 e 6)
6. Filtra apenas contratos do mês corrente:
   - Ativos: data_ativacao no mês
   - Aguardando: data_cadastro_sistema no mês
7. Para cada contrato (em lotes de 10):
   a. Busca dados do cliente via /cliente
   b. Mapeia id_vendedor → vendedor_id (cria "Vendedor IXC {id}" se não existir)
   c. Calcula MRR (taxa_instalacao ou valor do boleto não-proporcional)
8. Faz backup da tabela vendas → vendas_backup
9. Limpa tabela vendas
10. Insere novos registros com mapeamento de campos
11. Atualiza sync_log com resultado
```

### Mapeamento de Campos IXC → Supabase

| Campo IXC | Campo Supabase | Observação |
|-----------|----------------|------------|
| `cliente.razao` | `cliente_nome` | Via busca /cliente |
| `cliente.cnpj_cpf` | `cliente_cpf_cnpj` | Via busca /cliente |
| `cliente.uf` | `cliente_uf` | Via busca /cliente |
| `id_cliente` | `codigo_cliente_ixc` | ID do cliente no IXC |
| `id` (contrato) | `codigo_contrato_ixc` | ID do contrato no IXC |
| `id_vendedor` ou `id_vendedor_ativ` | `vendedor_id` | Mapeado via `ixc_id` da tabela vendedores |
| `taxa_instalacao` ou `fn_areceber.valor` | `valor_total`, `valor_unitario` | MRR calculado |
| `status` | `status_ixc` | 'A' ou 'AA' |
| `data_ativacao` | `data_venda` | Se status='A' |
| `data_cadastro_sistema` | `data_venda` | Se status='AA' |
| — | `mrr` | Sempre `true` (contratos são recorrentes) |
| — | `quantidade` | Sempre `1` |

### Regras de Negócio

1. **Filiais**: Apenas filiais 1 e 6 são sincronizadas
2. **Período**: Apenas contratos com data no mês corrente
3. **Ativos (A)**: Conta na "Realidade" (meta real do mês)
4. **Aguardando (AA)**: Conta na "Promessa" (pipeline)
5. **MRR**: Prioriza `taxa_instalacao`; se zero, busca `fn_areceber` ignorando `parcela_proporcional='S'`
6. **Vendedores**: Se `ixc_id` não encontrado, cria registro automático

### Tabela `vendas_backup`

**Migration:** `supabase/migrations/20260421_create_vendas_backup.sql`

Guarda histórico de todas as vendas antes de cada sync completo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `backup_id` | uuid | PK do registro de backup |
| `backup_at` | timestamptz | Momento do backup |
| `sync_tipo` | text | Tipo do sync (ex: 'ixc_contratos_full') |
| _demais_ | — | Todos os campos da tabela `vendas` |

### Botão no Dashboard

- **"Sync completo IXC"** (ciano): Executa `syncContratosFromIXC()`
- Exibe barra de progresso com percentual e mensagem
- Após conclusão: mostra quantidade importada, backup realizado, erros

### Cron / Agendamento

O sync automático às 18h (21h UTC) deve ser configurado via:

1. **Vercel Cron** (recomendado para deploy Vercel):
   - Criar arquivo `vercel.json` com cron job
   - Criar API route que chama `syncContratosFromIXC()`

2. **Supabase Edge Functions** (alternativa):
   - Criar função schedulada que chama a API IXC

3. **Serviço externo** (cron-job.org, etc.):
   - Configurar webhook para chamar endpoint de sync

### Fase 6 (2026-04-21)

| Tarefa | Mudança |
|--------|---------|
| 6.1 | `syncContratosFromIXC()` - sync completo de contratos do IXC |
| 6.2 | Migration `vendas_backup` para histórico pré-sync |
| 6.3 | Hook `useIxcSyncFull()` com estado de progresso e botão no Dashboard |
| 6.4 | Documentação de opções de cron/agendamento |
| 6.5 | Badge "Última sync" no header do Dashboard |
| 6.6 | Atualização da documentação SYNC.md e FASE6.md |
