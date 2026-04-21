# Fase 6 — Sync Automático IXC → Supabase

## Resumo

A Fase 6 implementa o sync completo de contratos do IXC Provedor, eliminando a necessidade
de cadastro manual pelo vendedor. Os dados são importados diretamente do IXC.

---

## O que mudou

### Antes (Fase 1-5)
- Vendedor cadastrava venda manualmente no CRM
- Sync apenas atualizava o `status_ixc` das vendas existentes
- Dependência de input humano para dados entrarem no sistema

### Depois (Fase 6)
- Sistema importa contratos diretamente do IXC
- Dados do cliente, valor (MRR) e status vêm automáticos
- Vendedor não precisa cadastrar nada
- Tabela `vendas` é repovoada a cada sync completo

---

## Endpoints IXC Utilizados

| Endpoint | Uso |
|----------|-----|
| `cliente_contrato` | Lista contratos com paginação, filtro por status |
| `cliente` | Dados do cliente (razao, cnpj_cpf, uf) |
| `fn_areceber` | Boletos do contrato (para calcular MRR quando taxa_instalacao=0) |

---

## Regras de Negócio

1. **Filiais permitidas**: Apenas 1 e 6
2. **Status sincronizados**: A (ativo) e AA (aguardando)
3. **Filtro de data**:
   - Ativos: `data_ativacao` no mês corrente
   - Aguardando: `data_cadastro_sistema` no mês corrente
4. **MRR**: `taxa_instalacao` se > 0, senão valor do boleto não-proporcional
5. **Vendedor**: Mapeado via `ixc_id`; se não existir, cria automaticamente

---

## Arquivos Modificados/Criados

### Novos
- `supabase/migrations/20260421_create_vendas_backup.sql` — Tabela de backup

### Modificados
- `src/lib/ixc.ts` — Funções de API para listar contratos
- `src/services/ixcSync.ts` — Função `syncContratosFromIXC()`
- `src/hooks/useIxcSync.ts` — Hook `useIxcSyncFull()` com progresso
- `src/pages/Dashboard.tsx` — Botão de sync completo, badge de última sync
- `.claude/SYNC.md` — Documentação atualizada

---

## Como usar

### 1. Rodar a migration no Supabase
Copie o conteúdo de `supabase/migrations/20260421_create_vendas_backup.sql`
e execute no SQL Editor do Supabase Dashboard.

### 2. Executar o sync manualmente
No Dashboard, expanda o card "Sincronização IXC" e clique em **"Sync completo IXC"**.

### 3. Configurar agendamento (opcional)
Para sync automático às 18h, configure um dos seguintes:
- Vercel Cron
- Supabase Edge Function schedulada
- Serviço externo de cron

---

## Comportamento do Sync

```
1. Busca todos os contratos A e AA do IXC
2. Filtra por filial (1 ou 6) e data do mês
3. Para cada contrato:
   - Busca dados do cliente
   - Mapeia vendedor
   - Calcula MRR
4. Faz backup das vendas atuais
5. Limpa tabela vendas
6. Insere novos registros
7. Registra resultado em sync_log
```

---

## Rollback

Se precisar reverter:

1. A tabela `vendas_backup` contém todos os registros anteriores
2. Cada backup tem `backup_at` e `sync_tipo` para identificação
3. Para restaurar, copie os registros desejados de volta para `vendas`

---

## Notas importantes

- **Não executar em produção sem testar**: Primeiro teste em ambiente de homologação
- **Backup automático**: Sempre cria backup antes de deletar
- **Idempotência**: Pode executar múltiplas vezes; sempre substitui todos os dados
- **Vendas únicas não são afetadas**: A tabela `vendas_unicas` permanece intacta
