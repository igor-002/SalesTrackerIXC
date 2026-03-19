# SalesTracker CRM — Estrutura do Projeto

## Stack & Decisões

| Tech | Versão | Uso |
|------|--------|-----|
| React + Vite + TypeScript | 19 + 8 | SPA principal |
| Tailwind CSS | v4 | Estilização (plugin `@tailwindcss/vite`) |
| Supabase JS | v2 | Auth + Database + Realtime |
| React Router | v7 | Roteamento com lazy loading |
| Zustand | v5 | Estado global (auth) |
| React Hook Form + Zod | — | Formulários |
| Recharts | v2 | Gráficos |
| date-fns | v4 | Datas |
| lucide-react | — | Ícones SVG |

**Design:** Dark mode only, glassmorphism.
- **Admin panel:** fundo `#0c1e14` (dark green), acento primário `#00d68f` (mint green), secundário cyan `#06b6d4`
- **TV Dashboard:** fundo `#080f1e` (dark navy), tema selecionável (azul `#3b82f6` ou verde `#00d68f`) com toggle no header, persistido em `localStorage('tv_theme')`
- **Fonte:** Inter (Google Fonts)

**Tailwind v4 note:** Não usa `tailwind.config.ts`. Configuração via `@theme` em `src/index.css`. Plugin `@tailwindcss/vite` em `vite.config.ts`.

---

## Supabase

- **Project ID:** `phoikjhbtzqxppvxbzvq`
- **URL:** `https://phoikjhbtzqxppvxbzvq.supabase.co`
- **Região:** `sa-east-1`
- **Anon Key:** ver `.env.local`

### Usuários

| Email | Senha | Role |
|-------|-------|------|
| admin@salestracker.com | (definida no projeto) | admin |
| tv@salestracker.com | tv123456 | tv |

---

## Schema do Banco

### Tabelas

```
segmentos      (id uuid PK, nome text)

clientes       (id uuid PK, nome, cpf_cnpj, uf, produto_id→produtos, valor_pacote numeric,
                mrr bool DEFAULT true, vendedor_id→vendedores, ativo bool, created_at)
               ← mrrTotal no TV Dashboard = SUM(valor_pacote) WHERE ativo=true AND mrr=true

produtos       (id uuid PK, nome, descricao, preco_base numeric, ativo bool, recorrente bool DEFAULT false)
               ← recorrente adicionado via migration add_recorrente_to_produtos

status_venda   (id uuid PK, nome text)
  Seeds: Ativo, Cancelado, Pendente, Em análise, Inativo

vendedores     (id uuid PK, nome, email UNIQUE, telefone, meta_mensal numeric, ativo bool, created_at)

metas          (id uuid PK, ano int, mes int, meta_mensal numeric, meta_semanal numeric, UNIQUE(ano,mes))

vendas         (id uuid PK,
                cliente_nome, cliente_cpf_cnpj, cliente_uf char(2),
                vendedor_id → vendedores,
                segmento_id → segmentos,
                produto_id → produtos,
                status_id → status_venda,
                quantidade int,
                valor_unitario numeric,
                valor_total GENERATED (qtd * val_unit),
                comissao_pct numeric,
                comissao_valor GENERATED (total * pct/100),
                mrr bool,
                data_venda date,
                descricao text,
                created_by → auth.users,
                created_at)

cancelamentos  (id uuid PK, venda_id → vendas, motivo, data_cancel, created_by, created_at)

profiles       (id uuid PK → auth.users, role: 'admin'|'tv', nome)
```

### RLS
- Todos com RLS habilitado
- `get_user_role()` SECURITY DEFINER para evitar recursão
- Role `tv`: apenas SELECT em todas as tabelas
- Role `admin`: ALL em todas as tabelas
- `profiles`: SELECT só do próprio usuário; admin vê tudo

### Realtime
- `vendas` e `cancelamentos` adicionadas ao `supabase_realtime` publication

---

## Migrations Rodadas (via MCP)

| Migration | O que faz |
|-----------|-----------|
| `001_schema` | Criação inicial das tabelas |
| `002_rls_policies` | Políticas RLS |
| `003_seed_data` | Seeds parcial |
| `004_drop_and_recreate` | DROP de tudo + recriação completa + RLS + seeds + realtime |
| `add_recorrente_to_produtos` | `ALTER TABLE produtos ADD COLUMN recorrente boolean NOT NULL DEFAULT false` |
| `create_clientes_table` | Tabela `clientes` com RLS (admin: all, tv: select) |

---

## Progresso por Fase

### ✅ Fase 1 — Foundation (Setup + Auth)
- `vite.config.ts`, `tsconfig.app.json`, `.env.local`, `.env.example`
- `src/lib/supabase.ts` — singleton `createClient<Database>`
- `src/store/authStore.ts` — Zustand: session, user, role, loading, fetchRole, signOut
- `src/components/layout/ProtectedRoute.tsx`
- `src/router/index.tsx` — lazy loading, rotas admin + tv
- `src/pages/auth/LoginPage.tsx`, `TVLoginPage.tsx`
- `src/App.tsx`, `src/main.tsx`
- `src/types/database.types.ts`
- `src/constants/index.ts` — UFs, AVATAR_COLORS, MESES, DIAS_SEMANA
- `src/lib/formatters.ts` — formatBRL, formatDate, maskCPFCNPJ, formatNumber

### ✅ Fase 2 — Design System + Layout
- `src/index.css` — Tailwind v4 `@theme`, tokens dark green, classes `.glass`, `.glass-strong`, `.gradient-primary`, `.glow-primary`, `.bg-ambient`
- `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`
- `src/components/ui/`: GlassCard, Button, Input, Select, Badge, Modal, ProgressBar, Avatar, Spinner, Toast

### ✅ Fase 3 — Data Layer (Hooks)
- `useVendedores.ts` — list, create, update, delete
- `useSegmentos.ts` — list only
- `useProdutos.ts` — list (todos), create, deleteProduto (soft: ativo=false)
- `useStatusVenda.ts` — list only
- `useMetas.ts` — list, upsert (UNIQUE ano+mes), delete, getMetaAtual
- `useVendas.ts` — list com joins, create
- `useDashboardStats.ts` — faturamento mês/semana/hoje, `faturamentoSemRecorrencia` (= faturamentoMes - mrrTotal), MRR, comissões, ticket médio, cancelamentos, turn-over, 12 meses, por dia da semana, diário do mês (`faturamentoPorDiaMes`), diário MRR (`mrrPorDiaMes`), últimas 5 vendas
- `useRealtime.ts` — canal Supabase Realtime vendas + cancelamentos

### ✅ Fase 4 — Módulo Vendedores
- `src/components/vendedores/VendedorForm.tsx`, `VendedorCard.tsx`, `VendedoresList.tsx`
- `src/pages/Vendedores.tsx`

### ✅ Fase 5 — Módulo Metas
- `src/components/metas/MetaForm.tsx`, `MetasHistorico.tsx`
- `src/pages/Metas.tsx`

### ✅ Fase 6 — Módulo Nova Venda
- `src/components/vendas/NovaVendaForm.tsx` — 14 campos, CPF/CNPJ mask, live preview subtotal + comissão
- `src/components/vendas/VendasTable.tsx`, `VendaStatusBadge.tsx`
- `src/pages/NovaVenda.tsx`

### ✅ Fase 7 — Dashboard Principal
- `src/pages/Dashboard.tsx` — 5 KPI cards + tabela últimas vendas + skeleton

### ✅ Fase 8 — TV Dashboard (reformulado)
Layout fullscreen `#080f1e`, sem AppShell:
- `src/components/tv/TVClock.tsx` — hora + data, setInterval 1s
- `src/components/tv/TVCard.tsx` — card grande, aceita prop `accent` (nome de classe Tailwind), resolve hex via `accentHexMap`
- `src/components/tv/TVLogo.tsx` — upload de logo via localStorage, aceita `accentHex` prop
- `src/components/tv/TVVendasCarousel.tsx` — carousel hoje/semana/mês, aceita `accentHex` prop
- `src/components/tv/TVMetaCarousel.tsx` — carousel meta mês/semana, aceita `accentColors: [string, string]` prop
- `src/components/tv/TVMetaAreaChart.tsx` — gráfico de área diário do mês com ReferenceLine na meta diária, aceita `accentHex` prop
- `src/components/charts/BarChartFaturamento.tsx` — Recharts 12 meses, aceita `accentHex` prop
- `src/pages/TVDashboard.tsx` — toggle Verde/Azul no header (salvo em `localStorage('tv_theme')`), propaga cores para todos os componentes TV

Grid layout TV:
```
[ BarChartFaturamento (2fr) ] [ TVVendasCarousel (1fr) ]   ← row 1
[ TVCard Receita s/Rec (1fr)] [ TVCard MRR (1fr)       ]   ← row 2
[ TVMetaAreaChart MRR (1fr) ] [ TVMetaCarousel (2fr)    ]   ← row 3  (meta preenchida só por vendas MRR)
```

### ✅ Fase 9 — Realtime
- `useRealtime.ts` integrado no TVDashboard e Dashboard
- Realtime habilitado na migration 004

### ✅ Módulo Clientes (extra)
- `src/hooks/useClientes.ts` — list (com joins produto+vendedor), create, update, delete (soft)
- `src/components/clientes/ClienteForm.tsx` — RHF + Zod, seletor MRR/Único, selects produto/vendedor/UF
- `src/components/clientes/ClientesTable.tsx` — tabela com editar + excluir, rodapé MRR total
- `src/pages/Clientes.tsx` — modal único para criar e editar
- `useDashboardStats` — `mrrTotal` agora vem de `SUM(clientes.valor_pacote)` onde ativo+mrr=true; fallback para vendas MRR se nenhum cliente cadastrado
- Rota `/clientes`, item "Clientes" no Sidebar

### ✅ Módulo Produtos (extra)
- `src/components/produtos/ProdutoForm.tsx` — RHF + Zod, seletor visual recorrente/único
- `src/components/produtos/ProdutoCard.tsx` — card com badge de tipo, soft delete
- `src/components/produtos/ProdutosList.tsx` — grid separado por seção (Recorrentes / Sem recorrência)
- `src/pages/Produtos.tsx`
- Rota `/produtos` no router, item "Produtos" no Sidebar

### 🔲 Fase 10 — Polish & QA
Não iniciada.

---

## Rotas

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | LoginPage | público |
| `/` | Dashboard | admin |
| `/nova-venda` | NovaVenda | admin |
| `/vendedores` | Vendedores | admin |
| `/metas` | Metas | admin |
| `/produtos` | Produtos | admin |
| `/tv` | TVDashboard | admin |

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://phoikjhbtzqxppvxbzvq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Como Rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
```

---

## Convenções de Código

- Imports absolutos via `@/` (ex: `@/lib/supabase`)
- Componentes UI: named exports
- Pages: default exports (lazy loading)
- Tailwind v4: tokens via `@theme` no CSS, sem config file
- BRL: sempre `formatBRL()` de `@/lib/formatters`
- Datas: `YYYY-MM-DD` no banco, exibir com `formatDate()`
- Toast: `toast('success' | 'error', 'msg')` de `@/components/ui/Toast`
- Focus states em Input/Select: inline `onFocus`/`onBlur` handlers (Tailwind v4 ring pouco confiável para theming dinâmico)
- Zodresolver cast: `zodResolver(schema) as Resolver<FormType>` para evitar erro TS com `z.coerce`

---

## Notas Importantes

1. **Tailwind v4** — sem `tailwind.config.ts`, sem `postcss.config.js`. Plugin `@tailwindcss/vite` no `vite.config.ts`
2. **GENERATED ALWAYS** — `valor_total` e `comissao_valor` nunca enviados no INSERT
3. **RLS recursão** — `get_user_role()` SECURITY DEFINER evita loop em `profiles`
4. **TV Dashboard isolado** — sem AppShell, sem sidebar; acesso por role `admin` mas layout fullscreen próprio
5. **TV theming** — todos os componentes TV aceitam `accentHex` / `accentColors` como prop; TVDashboard é o único source of truth das cores
6. **useProdutos** — busca todos os produtos (não filtra `ativo=true`) para exibir na lista, filtra no componente; `deleteProduto` faz soft delete (`ativo=false`)
7. **Migration 004** — havia schema pré-existente diferente; migration fez DROP CASCADE e recriou tudo
