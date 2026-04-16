# Sincronização IXC — Documentação Técnica

## Visão Geral

O sistema mantém o `status_ixc` dos contratos sincronizado com o IXCSoft via polling ativo
e reconciliação automática. Toda execução é registrada na tabela `sync_log`.

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
