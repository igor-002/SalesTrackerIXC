# SalesTracker CRM — Contexto de Sessão

> Última atualização: 2026-04-24
> Use este arquivo no início de qualquer nova sessão para retomar o contexto.

---

## 1. Descrição do Projeto

CRM de gestão de contratos recorrentes (MRR) para provedor de internet, integrado ao **IXC Soft**.  
Empresa: **OpenIT Group** — sistema single-tenant (uma empresa, múltiplos usuários com permissões granulares).

**Fluxo principal:**
1. Vendedores cadastram contratos no CRM
2. Sync IXC atualiza status dos contratos (ativo/aguardando/cancelado) a cada 30 min
3. Sync completo importa toda a base do IXC mensalmente
4. Gestores acompanham MRR, funil, ranking e projeções em Relatórios e TV Dashboard

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React | 19.2.4 |
| Build | Vite | 8.0.1 |
| Linguagem | TypeScript | 5.9.3 |
| CSS | **Tailwind v4** (plugin `@tailwindcss/vite`, **sem** tailwind.config.ts) | 4.2.2 |
| State global | Zustand | 5.0.12 |
| Server state/cache | TanStack React Query | 5.91.2 |
| Banco de dados | Supabase (PostgreSQL, sa-east-1) | — |
| Auth | Supabase Auth | — |
| Forms | React Hook Form + Zod | 7.71.2 / 4.3.6 |
| Gráficos | Recharts | 3.8.0 |
| Ícones | Lucide React | 0.577 |
| Router | React Router | 7.13.1 |
| PDF | jsPDF + html2canvas | — |
| Excel | XLSX (SheetJS) | 0.18.5 |

**Path alias:** `@/` mapeado para `./src` (configurado em `tsconfig.app.json` e `vite.config.ts`).

---

## 3. Estrutura de Arquivos Principais

```
src/
├── pages/
│   ├── Dashboard.tsx          ← Dashboard principal (KPIs, sync, status contratos)
│   ├── NovaVenda.tsx          ← Cadastro de contratos
│   ├── Relatorios.tsx         ← Relatórios (4 abas: Visão Geral, Ranking, Por Vendedor, Projetos)
│   ├── TVDashboard.tsx        ← TV Dashboard carrossel (7 telas)
│   ├── Clientes.tsx           ← Lista/CRUD clientes
│   ├── Vendedores.tsx         ← CRUD vendedores
│   ├── Metas.tsx              ← Meta mensal/semanal do time
│   ├── Produtos.tsx           ← CRUD produtos
│   ├── Usuarios.tsx           ← Admin de usuários e permissões
│   └── DiagnosticoIXC.tsx     ← Debug da integração IXC
│
├── hooks/
│   ├── useRelatoriosRedesign.ts  ← Hook principal dos relatórios redesign (Visão Geral)
│   ├── useRelatoriosIxc.ts       ← Hook legado de relatórios + funções utilitárias (calcKpis, calcForecast, etc.)
│   ├── useDashboardStats.ts      ← Stats do dashboard
│   ├── useTVStats.ts             ← Stats do TV dashboard
│   ├── useIxcSync.ts             ← Hooks de sync (status + full)
│   ├── useVendasUnicas.ts        ← Projetos & serviços (parcelas)
│   ├── useVendasHistorico.ts     ← Histórico mensal de vendedores
│   ├── useSyncStatus.ts          ← Status/histórico do sync_log
│   ├── useVendas.ts / useVendedores.ts / useClientes.ts / useProdutos.ts / useMetas.ts
│   └── useMetasVendedor.ts       ← Metas individuais por vendedor/mês
│
├── services/
│   ├── ixcSync.ts             ← Lógica de sync (sincronizarStatusIxc, syncContratosFromIXC)
│   └── reconciliacao.ts       ← Detecta e corrige divergências CRM vs IXC
│
├── lib/
│   ├── ixc.ts                 ← Cliente HTTP IXC (ixcListarTodosContratos, ixcBuscarCliente, etc.)
│   ├── supabase.ts            ← Cliente Supabase
│   └── formatters.ts          ← formatBRL, formatPercent
│
├── store/
│   └── authStore.ts           ← Zustand: sessão, permissões, vendedorDbId
│
├── components/
│   ├── layout/                ← AppShell, Sidebar, TopBar
│   ├── ui/                    ← GlassCard, Button, Input, Modal, Spinner, ProgressBar
│   ├── tv/                    ← TVTelaVisaoGeral, TVTelaFunil, TVTelaRanking, TVSyncIndicator, etc.
│   └── vendas/                ← Formulários de venda
│
└── types/
    ├── database.types.ts      ← Tipos gerados pelo Supabase (auto-gerado, não editar manualmente)
    └── permissoes.ts          ← Interface Permissoes
```

**Tabelas Supabase principais:**

| Tabela | Descrição |
|--------|-----------|
| `vendas` | Contratos recorrentes do mês corrente (dados vivos) |
| `vendas_historico` | Snapshot mensal consolidado por vendedor |
| `vendas_unicas` | Projetos/serviços (não contam na meta nem no MRR) |
| `vendas_unicas_parcelas` | Parcelas das vendas únicas |
| `vendas_backup` | Cópia de segurança antes de cada sync completo |
| `sync_log` | Log de todas as execuções de sync |
| `vendedores` | Inclui campo `ixc_id` (ID no IXC) e `incluir_historico` |
| `metas` / `metas_vendedor` | Meta do time e metas individuais por mês |

**Campos críticos em `vendas`:**
- `valor_total` e `comissao_valor` são **GENERATED ALWAYS** — **nunca incluir em INSERT/UPDATE**
- `status_ixc`: `'A'`=ativo, `'AA'`=aguardando assinatura, `'P'`=proposta, `'B'`=bloqueado, `'C'`/`'CN'`=cancelado
- `status_atualizado_em`: timestamp da última mudança de status (setado pelo sync)
- `dias_aguardando`: dias em status AA/P (calculado pelo IXC sync via campo `data` do IXC)
- `mes_referencia` / `ano_referencia`: mês de referência do contrato

---

## 4. Estado Atual — O Que Está Implementado

### Módulos completos
- **Autenticação** — Supabase Auth + profiles + permissões JSONB granulares por usuário
- **Multi-tenant** — RLS em todas as tabelas filtrado por `empresa_id` via `get_empresa_id()`
- **Cadastro de contratos** — formulário completo com segmento, produto, comissão, vinculo IXC
- **Clientes, Vendedores, Produtos, Segmentos, Metas** — CRUDs completos
- **Admin de Usuários** — gerenciamento de permissões, vínculo com vendedor IXC
- **Sync IXC (status)** — polling a cada 30min, atualiza `status_ixc` + `status_atualizado_em` + reconciliação automática
- **Sync IXC (full)** — importa todos os contratos do mês diretamente do IXC, faz backup antes
- **Histórico de Vendedores** — snapshots mensais em `vendas_historico` (últimos 3 meses, populado pelo sync full)
- **Vendas Únicas** — projetos/serviços com parcelas, sync de boletos do IXC (`fn_areceber`)
- **TV Dashboard** — carrossel 7 telas (Visão Geral, Funil, Alertas, Ranking, Planos, Cancelamentos, Velocidade de Ativação), 2 temas (verde/azul), 15s por tela
- **Diagnóstico IXC** — página de debug da integração

### Relatórios (redesign completo — estado atual)
Arquivo: `src/pages/Relatorios.tsx` + hook: `src/hooks/useRelatoriosRedesign.ts`

**Aba Visão Geral** (`TabVisaoGeral`):
- Filtro de período: últimos 3 meses ou mês específico (com fallback para `vendas_historico`)
- Filtro de vendedor (gestor)
- KPI cards: Total, Aguardando, Ativos, Ticket Médio, Taxa de Conversão
- Gráfico evolução + projeção 6 meses (ComposedChart: barras verde/âmbar + linha MRR)
  - Barras: `ativos` (verde `#00d68f`) + `aguardando_ativacao` (âmbar `#f59e0b`) com `maxBarSize={60}`
  - Projeção: média ponderada + fator de tendência com decaimento, intervalo ±15%
  - Labels de valor no topo de cada barra não-projetada
  - Tooltip rico com frases contextuais em pt-BR (`EvolucaoTooltip`)
- Cards de projeção (3 meses futuros)
- Funil de vendas (barras horizontais + métricas: taxa conversão, taxa perda, tempo médio ativação)
- **Seção "Contratos Aguardando há Mais Tempo"** (colapsada por padrão):
  - Grid 3 colunas de cards kanban com: nome, vendedor, badge dias, data cadastro
  - Badges: vermelho >30d, âmbar 8-30d, ciano <8d
  - "Ver todos" se > 12; limite do hook: 50 registros
- Gráficos de pizza: distribuição de ativos e MRR por vendedor
- Linha de tendência MRR (por vendedor + total)
- Tabela performance por vendedor (com ordenação e badge de destaque)

**Aba Ranking** (`TabRanking`): ranking com meta editável inline por vendedor/mês

**Aba Por Vendedor** (`TabPorVendedor`): perfil completo (conversão, tempo ativação, cancelamentos, meta individual, badges comparativos)

**Aba Projetos & Serviços** (`TabProjetos`): vendas únicas com filtro de status

### Pendências conhecidas
- **Tempo médio de ativação** pode aparecer `—` se `status_atualizado_em` for null nos contratos (depende de dados do sync). Log de debug em `console.log('[tempo-ativacao] ...')` disponível para diagnóstico.
- **Sync automático às 18h** não está configurado — requer Vercel Cron, Supabase Edge Function ou cron-job.org apontando para endpoint de sync.
- **dias_aguardando** é calculado via sync IXC (campo `data` do contrato no IXC), não pelo frontend — pode aparecer null em contratos sem sincronização.
- **Phase 10 (Polish & QA)** ainda pendente — melhorias de UX, testes de carga, revisão geral.

### Quirks críticos (não esquecer)
- `valor_total` e `comissao_valor` são `GENERATED ALWAYS` — **nunca inserir** esses campos
- Tailwind v4: sem `tailwind.config.ts`, usa `@tailwindcss/vite` plugin direto
- IXC response: `registros` pode ser array **ou** objeto indexado — sempre usar `normalizeRegistros()`
- Recharts `<Bar shape>`: o tipo de `value` é `number | [number, number]` — usar `payload?.ativos` para pegar o valor real
- `ProgressBar` com meta que pode iniciar zerada: sempre passar `emptyLabel="Mês iniciando"`
- CRLF em variáveis de ambiente no servidor corrompem o fetch do bundle

---

## 5. Variáveis de Ambiente (sem valores)

```plaintext
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_SERVICE_ROLE_KEY=     # opcional, para operações admin

# IXC Soft — integração principal
VITE_IXC_BASE_URL=                  # ex: https://central.openitgroup.com.br
VITE_IXC_TOKEN=                     # formato: Basic <base64(usuario:senha)>

# IXC Soft — proxy externo (contorna CORS em produção, opcional)
VITE_IXC_PROXY_URL=                 # ex: http://<ip_vps>:3001

# IXC Soft — campo de status do contrato (opcional, padrão: status_internet)
VITE_IXC_CAMPO_STATUS_CONTRATO=
```

**Formato do token IXC:** `Basic <base64("usuario:senha")>` — gerado uma vez, não expira.

**Headers obrigatórios em toda requisição IXC:**
```
Authorization: <VITE_IXC_TOKEN>
Content-Type: application/json
ixcsoft: listar
```

---

## 6. Deploy

### App principal (VPS com nginx)

```bash
# 1. Atualizar código
cd /var/www/salestraker
git pull origin main

# 2. Build
npm run build

# 3. Os arquivos estáticos ficam em dist/
# Se nginx já aponta para dist/, apenas reload:
sudo nginx -s reload

# Ou, se precisar reiniciar:
sudo systemctl restart nginx
```

**Configuração mínima nginx:**
```nginx
server {
    listen 80;
    server_name <dominio>;

    root /var/www/salestraker/dist;
    index index.html;

    # SPA — todas as rotas redirecionam para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Proxy IXC (Node.js na VPS, porta 3001)

```bash
# Gerenciado via PM2
pm2 restart ixc-proxy   # ou o nome configurado
# ou
cd /var/www/ixc-proxy-server
pm2 start server.js --name ixc-proxy
```

### Variáveis de ambiente em produção

Criar `/var/www/salestraker/.env.production` com os valores reais antes do build.  
**Atenção:** não usar quebras de linha dentro dos valores (CRLF corrompe o bundle).

### Comandos úteis

```bash
npm run build          # TypeScript check + Vite build
npm run dev            # Dev server local (porta 5173)
npm run lint           # ESLint
```

---

## 7. Integração IXC — Resumo

- **Sync de status** (`ixc_contratos`): polling 30min, atualiza `status_ixc` + `status_atualizado_em`
- **Sync completo** (`ixc_contratos_full`): importa todos contratos do mês, faz backup, limpa e reinsere
- **Reconciliação**: detecta AA→A, A→B, A→C que o sync de status perdeu
- **Filiais permitidas:** `['1', '2', '6']` — hardcoded em `ixcSync.ts`
- **Vendedores sincronizados:** apenas aqueles com `incluir_historico = true` na tabela `vendedores`
- **MRR:** usa `fn_areceber`, ignora boletos com `parcela_proporcional = 'S'` (primeiro boleto proporcional)
- **Log:** toda execução registrada em `sync_log` com contadores e duração

---

*Gerado em 2026-04-24 para uso em novas sessões Claude Code.*
