# SalesTracker CRM - Documentacao Tecnica Completa

> Documentacao para recriacao do sistema do zero.
> Gerado em: 2026-04-22

---

## 1. VARIAVEIS DE AMBIENTE

### Arquivo `.env` (ou `.env.production`)

```plaintext
# SUPABASE (Frontend)
VITE_SUPABASE_URL=https://phoikjhbtzqxppvxbzvq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SUPABASE (Backend/Admin - opcional)
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# IXC SOFT - Integracao Principal
VITE_IXC_BASE_URL=https://central.openitgroup.com.br
VITE_IXC_TOKEN=Basic MzI5OmVjNzFhMzY4NjEwYWI4YTkwZjY3MGZiMGM1NWRlZTM1NTcwMzAxMDhkODI4YmVmMjY3ZTFkMDUzNmVhOTQ5MGY=

# IXC SOFT - Proxy Externo (VPS - opcional)
VITE_IXC_PROXY_URL=http://104.234.186.129:3001

# IXC SOFT - Campo de Status (opcional, padrao: "status_internet")
VITE_IXC_CAMPO_STATUS_CONTRATO=status_internet
```

### Formato do Token IXC

| Tipo | Formato |
|------|---------|
| Basic Auth | `Basic <base64(usuario:senha)>` |
| Token Direto | Token gerado pelo painel IXC |

**Headers de Requisicao:**
```
Authorization: <VITE_IXC_TOKEN>
Content-Type: application/json
ixcsoft: listar  (para operacoes de listagem)
```

---

## 2. STACK TECNOLOGICA

| Camada | Tecnologia | Versao |
|--------|------------|--------|
| Frontend | React | 19.2.4 |
| Build | Vite | 8.0.1 |
| State | Zustand | 5.0.12 |
| API/Cache | TanStack React Query | 5.91.2 |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth | - |
| CSS | Tailwind CSS | 4.2.2 |
| Forms | React Hook Form + Zod | 7.71.2 / 4.3.6 |
| Charts | Recharts | 3.8.0 |
| Icons | Lucide React | 0.577 |
| PDF | jsPDF + html2canvas | - |
| Excel | XLSX (SheetJS) | 0.18.5 |
| Router | React Router | 7.13.1 |

---

## 3. ESTRUTURA DE PASTAS

```
src/
├── pages/              # Paginas (Dashboard, NovaVenda, Vendedores, etc)
├── components/
│   ├── layout/         # AppShell, Sidebar, TopBar
│   ├── ui/             # Componentes reutilizaveis (Button, Input, Modal)
│   ├── charts/         # Graficos (BarChart, etc)
│   ├── vendas/         # Formularios/tabelas de vendas
│   ├── vendedores/     # CRUD vendedores
│   ├── clientes/       # CRUD clientes
│   ├── produtos/       # CRUD produtos
│   ├── metas/          # Formularios/historico de metas
│   └── tv/             # Componentes TV Dashboard
├── hooks/              # Custom hooks (useVendas, useIxcSync, etc)
├── services/           # Logica de negocio (ixcSync, reconciliacao)
├── lib/
│   ├── ixc.ts          # Integracao IXC
│   ├── supabase.ts     # Cliente Supabase
│   └── formatters.ts   # Funcoes de formatacao
├── store/              # Zustand stores (authStore)
├── types/
│   ├── database.types.ts      # Types Supabase auto-gerados
│   └── permissoes.ts          # Tipos de permissoes
├── router/             # React Router config
├── constants/          # Constantes globais
└── App.tsx / main.tsx
```

---

## 4. SCHEMA DO BANCO DE DADOS (SUPABASE)

### 4.1 Tabela: `empresas`
```sql
CREATE TABLE empresas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```
> Raiz da arquitetura multi-tenant.

### 4.2 Tabela: `profiles` (Usuarios Supabase Auth)
```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  empresa_id      UUID REFERENCES empresas(id),
  nome            TEXT,
  role            TEXT  -- 'admin' | 'tv' | NULL
);
```

### 4.3 Tabela: `usuarios` (Permissoes de Negocio)
```sql
CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  email           TEXT NOT NULL,
  nome            TEXT NOT NULL,
  ativo           BOOLEAN DEFAULT true,
  id_vendedor_ixc TEXT,
  permissoes      JSONB,
  criado_em       TIMESTAMPTZ DEFAULT now()
);
```

**Estrutura de `permissoes` (JSONB):**
```json
{
  "dashboard": true,
  "nova_venda": true,
  "clientes": true,
  "vendedores": true,
  "metas": true,
  "produtos": true,
  "tv_dashboard": true,
  "relatorios": true,
  "admin": false
}
```

### 4.4 Tabela: `vendedores`
```sql
CREATE TABLE vendedores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID REFERENCES empresas(id),
  nome              TEXT NOT NULL,
  email             TEXT,
  telefone          TEXT,
  ixc_id            TEXT,              -- ID do vendedor no IXC
  incluir_historico BOOLEAN DEFAULT false,  -- Controla sync historico
  meta_mensal       DECIMAL,
  ativo             BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### 4.5 Tabela: `produtos`
```sql
CREATE TABLE produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  preco_base      DECIMAL,
  recorrente      BOOLEAN,  -- TRUE = MRR, FALSE = venda unica
  ativo           BOOLEAN DEFAULT true
);
```

### 4.6 Tabela: `clientes`
```sql
CREATE TABLE clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id),
  nome            TEXT NOT NULL,
  cpf_cnpj        TEXT,
  uf              CHAR(2),
  valor_pacote    DECIMAL,
  mrr             BOOLEAN,
  produto_id      UUID REFERENCES produtos(id),
  vendedor_id     UUID REFERENCES vendedores(id),
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 4.7 Tabela: `segmentos`
```sql
CREATE TABLE segmentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id),
  nome            TEXT NOT NULL
);
```

### 4.8 Tabela: `status_venda`
```sql
CREATE TABLE status_venda (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id),
  nome            TEXT NOT NULL
);
```

### 4.9 Tabela: `vendas` (Contratos Recorrentes + MRR)
```sql
CREATE TABLE vendas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID REFERENCES empresas(id),
  vendedor_id             UUID REFERENCES vendedores(id),
  codigo_cliente_ixc      TEXT,
  codigo_contrato_ixc     TEXT,
  cliente_nome            TEXT NOT NULL,
  cliente_cpf_cnpj        TEXT,
  cliente_uf              CHAR(2),
  descricao               TEXT,
  produto_id              UUID REFERENCES produtos(id),
  quantidade              INT DEFAULT 1,
  valor_unitario          DECIMAL NOT NULL,
  valor_total             DECIMAL GENERATED ALWAYS AS (valor_unitario * quantidade) STORED,
  comissao_pct            DECIMAL,
  comissao_valor          DECIMAL,
  segmento_id             UUID REFERENCES segmentos(id),
  status_id               UUID REFERENCES status_venda(id),
  status_ixc              TEXT,            -- 'A' | 'AA' | 'B' | 'C' | etc
  status_atualizado_em    TIMESTAMPTZ,
  dias_em_aa              INT,             -- Dias em "Aguardando Assinatura"
  mrr                     BOOLEAN DEFAULT true,
  produtos                JSONB,
  created_at              TIMESTAMPTZ DEFAULT now(),
  created_by              UUID REFERENCES usuarios(id),
  data_venda              DATE
);
```

**Mapeamento de `status_ixc`:**

| Codigo | Label | UUID status_id |
|--------|-------|----------------|
| A | Ativo | 02d9280f-39dd-4e9f-9866-a2c442c74544 |
| AA | Aguardando Assinatura | 3ab54213-e70b-435d-b707-1140b9f26e69 |
| P | Proposta | 3ab54213-e70b-435d-b707-1140b9f26e69 |
| B | Bloqueado | b191728e-56ac-435f-8777-723473ec7cce |
| CM | Bloqueado Manual | b191728e-56ac-435f-8777-723473ec7cce |
| C | Cancelado | 641cba2c-09c9-468e-a303-8be54b999998 |
| CN | Cancelado | 641cba2c-09c9-468e-a303-8be54b999998 |
| FA | Financeiro em Atraso | - |
| N | Negativado | - |

### 4.10 Tabela: `metas`
```sql
CREATE TABLE metas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id),
  mes             INT CHECK (mes BETWEEN 1 AND 12),
  ano             INT,
  meta_mensal     DECIMAL,
  meta_semanal    DECIMAL
);
```

### 4.11 Tabela: `metas_vendedor`
```sql
CREATE TABLE metas_vendedor (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID REFERENCES empresas(id),
  vendedor_id     UUID REFERENCES vendedores(id),
  mes             INT CHECK (mes BETWEEN 1 AND 12),
  ano             INT,
  meta_contratos  INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 4.12 Tabela: `vendas_historico`
```sql
CREATE TABLE vendas_historico (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID REFERENCES empresas(id),
  vendedor_id             UUID REFERENCES vendedores(id),
  ixc_vendedor_id         TEXT,
  cliente_nome            TEXT NOT NULL,
  cliente_cpf_cnpj        TEXT,
  codigo_cliente_ixc      TEXT,
  codigo_contrato_ixc     TEXT,
  plano                   TEXT,
  valor_unitario          DECIMAL,
  quantidade              INT DEFAULT 1,
  mrr                     BOOLEAN DEFAULT true,
  status_ixc              TEXT,
  data_ativacao           DATE,
  mes_referencia          INT,
  ano_referencia          INT,
  filial_id               TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  ultima_atualizacao      TIMESTAMPTZ
);
```

### 4.13 Tabela: `vendas_unicas`
```sql
CREATE TABLE vendas_unicas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID REFERENCES empresas(id),
  vendedor_id             UUID REFERENCES vendedores(id),
  cliente_nome            TEXT NOT NULL,
  codigo_cliente_ixc      TEXT,
  id_venda_ixc            TEXT,
  descricao               TEXT,
  valor_total             DECIMAL NOT NULL,
  data_venda              DATE NOT NULL,
  status                  TEXT DEFAULT 'pending',  -- pending | pago | em_atraso | cancelado
  parcelas                INT DEFAULT 1,
  ids_areceber            TEXT,
  created_by              UUID REFERENCES usuarios(id),
  created_at              TIMESTAMPTZ DEFAULT now()
);
```

### 4.14 Tabela: `vendas_unicas_parcelas`
```sql
CREATE TABLE vendas_unicas_parcelas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_unica_id          UUID REFERENCES vendas_unicas(id) ON DELETE CASCADE,
  id_areceber_ixc         TEXT,
  numero_parcela          INT,
  valor                   DECIMAL NOT NULL,
  data_vencimento         DATE NOT NULL,
  status_pagamento        TEXT DEFAULT 'a_receber',  -- a_receber | pago | em_atraso | cancelado
  valor_pago              DECIMAL,
  data_pagamento          DATE,
  ultima_atualizacao      TIMESTAMPTZ
);
```

### 4.15 Tabela: `cancelamentos`
```sql
CREATE TABLE cancelamentos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID REFERENCES empresas(id),
  venda_id                UUID REFERENCES vendas(id),
  data_cancel             DATE,
  motivo                  TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  created_by              UUID REFERENCES usuarios(id)
);
```

### 4.16 Tabela: `sync_log`
```sql
CREATE TABLE sync_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID REFERENCES empresas(id),
  tipo                    TEXT,  -- ixc_contratos | ixc_contratos_full | historico_vendedores | reconciliacao | vendas_unicas
  status                  TEXT,  -- em_andamento | sucesso | erro
  iniciado_em             TIMESTAMPTZ,
  finalizado_em           TIMESTAMPTZ,
  duracao_ms              INT,
  registros_processados   INT,
  registros_atualizados   INT,
  registros_erro          INT,
  erro_mensagem           TEXT
);
```

---

## 5. FUNCOES PL/pgSQL

```sql
-- Retorna empresa_id do usuario autenticado
CREATE OR REPLACE FUNCTION get_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Alias
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT get_empresa_id()
$$ LANGUAGE sql;

-- Retorna role do usuario
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 6. RLS (Row Level Security)

Todas as tabelas principais usam RLS com filtro por `empresa_id`:

```sql
-- Exemplo para tabela vendas
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_select" ON vendas
  FOR SELECT USING (empresa_id = get_empresa_id());

CREATE POLICY "vendas_insert" ON vendas
  FOR INSERT WITH CHECK (empresa_id = get_empresa_id());

CREATE POLICY "vendas_update" ON vendas
  FOR UPDATE USING (empresa_id = get_empresa_id());

CREATE POLICY "vendas_delete" ON vendas
  FOR DELETE USING (empresa_id = get_empresa_id());
```

---

## 7. INTEGRACAO IXC SOFT

### 7.1 Endpoints Utilizados

| Endpoint | Tabela IXC | Uso |
|----------|------------|-----|
| `/webservice/v1/cliente_contrato` | cliente_contrato | Listar/buscar contratos |
| `/webservice/v1/cliente` | cliente | Buscar dados do cliente |
| `/webservice/v1/vendedor` | vendedor | Listar vendedores ativos |
| `/webservice/v1/vd_saida` | vd_saida | Vendas avulsas |
| `/webservice/v1/vd_contratos_produtos` | vd_contratos_produtos | Produtos de contrato |
| `/webservice/v1/fn_areceber` | fn_areceber | Boletos/parcelas |

### 7.2 Formato de Request

Todas as requisicoes usam POST com body JSON:

```json
{
  "qtype": "cliente_contrato.id",
  "query": "1234",
  "oper": "=",
  "page": "1",
  "rp": "200",
  "sortname": "cliente_contrato.id",
  "sortorder": "desc"
}
```

**Operadores `oper`:**
- `=` : igual
- `>=` : maior ou igual
- `<=` : menor ou igual
- `>` : maior
- `<` : menor
- `like` : contem

### 7.3 Formato de Response

```json
{
  "total": "150",
  "registros": [
    { "id": "1", "campo1": "valor1", ... },
    { "id": "2", "campo1": "valor2", ... }
  ]
}
```

**ATENCAO:** `registros` pode vir como:
- Array: `[{ }, { }]`
- Objeto indexado: `{ "0": { }, "1": { } }`

Usar funcao `normalizeRegistros()` para normalizar.

### 7.4 Campos Importantes

**cliente_contrato:**
- `id` - ID do contrato
- `id_cliente` - ID do cliente
- `id_vendedor` - ID do vendedor
- `id_vendedor_ativ` - ID vendedor ativacao (alternativo)
- `status` - Status do contrato (A, AA, B, C, etc)
- `status_internet` - Status internet (pode ser diferente)
- `contrato` - Nome do plano
- `data_ativacao` - Data de ativacao
- `data_cadastro_sistema` - Data de cadastro
- `taxa_instalacao` - Taxa de instalacao (NAO E MRR)
- `id_filial` - Filial (1, 2, 6 sao permitidas)

**fn_areceber:**
- `id` - ID do boleto
- `id_contrato` - ID do contrato
- `id_venda` - ID da venda
- `valor` - Valor do boleto
- `valor_baixado` - Valor pago
- `data_vencimento` - Data vencimento
- `data_pagamento` - Data pagamento (null se nao pago)
- `status` - Status do boleto
- `parcela_proporcional` - 'S' ou 'N' (primeiro boleto e proporcional)

---

## 8. LOGICA DE NEGOCIO CRITICA

### 8.1 Calculo de MRR

**Fonte:** `fn_areceber` do IXC (NAO usar `taxa_instalacao`)

```typescript
async function calcularMRR(contrato: IxcContratoFull): Promise<number> {
  const boletos = await ixcBuscarAreceberPorContrato(contrato.id)
  
  // Ignorar boletos proporcionais (primeiro boleto)
  const boletosNaoProp = boletos.filter(b => 
    b.raw.parcela_proporcional !== 'S' && b.valor > 0
  )
  
  // Se existe nao-proporcional, pegar o mais recente
  if (boletosNaoProp.length > 0) {
    return boletosNaoProp[0].valor
  }
  
  // Se so tem proporcionais, pegar maior valor
  return Math.max(...boletos.map(b => b.valor))
}
```

### 8.2 Filtro de Filiais

Filiais permitidas: `['1', '2', '6']` (hardcoded)

```typescript
const filiaisPermitidas = ['1', '2', '6']
contratos.filter(c => filiaisPermitidas.includes(c.id_filial))
```

### 8.3 Filtro de Vendedores Autorizados

Apenas vendedores com `incluir_historico = true` sao sincronizados:

```typescript
const { data: vendedoresList } = await supabase
  .from('vendedores')
  .select('id, nome, ixc_id')
  .eq('incluir_historico', true)
  .not('ixc_id', 'is', null)

const ixcIdsAutorizados = new Set(vendedoresList.map(v => v.ixc_id))

const contratosFiltrados = contratosIXC.filter(c => {
  const vendedorId = c.id_vendedor ?? c.id_vendedor_ativ
  return vendedorId && ixcIdsAutorizados.has(vendedorId)
})
```

### 8.4 Status P (Proposta)

Status P e tratado como AA (Aguardando Assinatura):
- Mesmo UUID de status_id
- Para data_ativacao = '0000-00-00', usar data_cadastro_sistema

### 8.5 Dias em AA

```typescript
const diasEmAa = status === 'AA' && dataContrato
  ? Math.floor((now.getTime() - new Date(dataContrato).getTime()) / 86400000)
  : null
```

---

## 9. FLUXOS PRINCIPAIS

### 9.1 Login

```
1. Usuario preenche email/senha
2. Supabase Auth (signInWithPassword)
3. Se sucesso:
   - Fetch profiles(role)
   - Fetch usuarios(permissoes, id_vendedor_ixc, ativo)
   - Se ativo=false -> bloqueado
   - Armazena em Zustand store
4. Redirect para Dashboard
```

### 9.2 Sync Completo de Contratos

```
syncContratosFromIXC():
1. Buscar vendedores autorizados (incluir_historico = true)
2. Criar Set de ixc_ids autorizados
3. Buscar contratos do mes via ixcListarTodosContratos()
4. Filtrar por vendedores autorizados
5. Para cada contrato:
   - Buscar cliente via ixcBuscarCliente()
   - Calcular MRR via calcularMRR()
   - Mapear vendedor local
6. Deletar tabela vendas
7. Inserir novos registros
8. Log em sync_log
9. Executar syncHistoricoVendedores() (nao-fatal)
```

### 9.3 Sync de Status

```
sincronizarStatusIxc():
1. Buscar todas vendas com codigo_contrato_ixc
2. Para cada venda:
   - Buscar status atual no IXC
   - Se mudou, atualizar status_ixc
   - Se AA, calcular dias_em_aa
3. Log em sync_log
4. Executar reconciliacao
5. Sync vendas unicas
```

### 9.4 Sync Historico

```
syncHistoricoVendedores():
1. Buscar vendedores com incluir_historico = true
2. Calcular 3 meses anteriores
3. Para cada vendedor + mes:
   - Buscar contratos do vendedor
   - Filtrar por data_ativacao no range
   - Deletar historico existente do mes
   - Buscar dados de clientes
   - Calcular MRR
   - Inserir em vendas_historico
4. Log em sync_log
```

---

## 10. PERMISSOES

### 10.1 Estrutura

```typescript
interface Permissoes {
  dashboard: boolean       // Acesso ao dashboard
  nova_venda: boolean      // Criar vendas
  clientes: boolean        // CRUD clientes
  vendedores: boolean      // CRUD vendedores
  metas: boolean           // CRUD metas
  produtos: boolean        // CRUD produtos
  tv_dashboard: boolean    // Acesso TV
  relatorios: boolean      // Relatorios
  admin: boolean           // Admin (usuarios)
}
```

### 10.2 Padroes

```typescript
const PERMISSOES_ADMIN: Permissoes = {
  dashboard: true,
  nova_venda: true,
  clientes: true,
  vendedores: true,
  metas: true,
  produtos: true,
  tv_dashboard: true,
  relatorios: true,
  admin: true,
}

const PERMISSOES_DEFAULT: Permissoes = {
  dashboard: false,
  nova_venda: true,
  clientes: false,
  vendedores: false,
  metas: false,
  produtos: false,
  tv_dashboard: false,
  relatorios: false,
  admin: false,
}
```

---

## 11. PROXY IXC (OPCIONAL)

Para contornar CORS em producao, usar proxy Express:

```javascript
// ixc-proxy-server/server.js
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const IXC_BASE_URL = process.env.IXC_BASE_URL
const IXC_TOKEN = process.env.IXC_TOKEN

app.post('/ixc/:tabela', async (req, res) => {
  const url = `${IXC_BASE_URL}/webservice/v1/${req.params.tabela}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': IXC_TOKEN,
      'Content-Type': 'application/json',
      'ixcsoft': 'listar'
    },
    body: JSON.stringify(req.body)
  })
  res.json(await response.json())
})

app.listen(3001)
```

---

## 12. DEPENDENCIAS (package.json)

### Production

```json
{
  "@hookform/resolvers": "^5.2.2",
  "@supabase/supabase-js": "^2.99.2",
  "@tanstack/react-query": "^5.91.2",
  "date-fns": "^4.1.0",
  "html2canvas": "^1.4.1",
  "jspdf": "^4.2.1",
  "lucide-react": "^0.577.0",
  "react": "^19.2.4",
  "react-dom": "^19.2.4",
  "react-hook-form": "^7.71.2",
  "react-router-dom": "^7.13.1",
  "recharts": "^3.8.0",
  "xlsx": "^0.18.5",
  "zod": "^4.3.6",
  "zustand": "^5.0.12"
}
```

### Development

```json
{
  "@eslint/js": "^9.39.4",
  "@tailwindcss/vite": "^4.2.2",
  "@types/node": "^24.12.0",
  "@types/react": "^19.2.14",
  "@types/react-dom": "^19.2.3",
  "@vercel/node": "^5.7.4",
  "@vitejs/plugin-react": "^6.0.1",
  "typescript": "~5.9.3",
  "vite": "^8.0.1"
}
```

---

## 13. CONFIGURACAO VITE

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': './src'
    }
  },
  server: {
    proxy: {
      '/api/ixc': {
        target: process.env.VITE_IXC_BASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ixc/, '/webservice/v1')
      }
    }
  }
})
```

---

## 14. CHECKLIST PARA RECRIACAO

### 14.1 Supabase

- [ ] Criar projeto no Supabase
- [ ] Copiar URL e Anon Key
- [ ] Executar SQL para criar tabelas
- [ ] Criar funcoes PL/pgSQL
- [ ] Ativar RLS em todas tabelas
- [ ] Criar empresa inicial
- [ ] Criar usuario admin

### 14.2 IXC

- [ ] Obter credenciais IXC (usuario + senha ou token)
- [ ] Converter para Basic auth se necessario
- [ ] Testar endpoint de contratos
- [ ] Identificar filiais permitidas

### 14.3 Projeto

- [ ] Criar projeto Vite + React
- [ ] Instalar dependencias
- [ ] Configurar Tailwind v4
- [ ] Configurar path alias @/
- [ ] Criar estrutura de pastas
- [ ] Configurar .env

### 14.4 Deploy

- [ ] Criar projeto Vercel
- [ ] Configurar variaveis de ambiente
- [ ] Deploy
- [ ] (Opcional) Deploy proxy IXC em VPS

---

## 15. CREDENCIAIS ATUAIS (REFERENCIA)

> **ATENCAO:** Estas credenciais sao de referencia.
> Substitua por credenciais seguras em producao.

```plaintext
SUPABASE_URL=https://phoikjhbtzqxppvxbzvq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

IXC_BASE_URL=https://central.openitgroup.com.br
IXC_TOKEN=Basic MzI5OmVjNzFhMzY4NjEwYWI4YTkwZjY3MGZiMGM1NWRlZTM1NTcwMzAxMDhkODI4YmVmMjY3ZTFkMDUzNmVhOTQ5MGY=
IXC_PROXY_URL=http://104.234.186.129:3001
```

---

*Documentacao gerada automaticamente pelo Claude Code.*
*Projeto: SalesTracker CRM - OpenIT Group*
