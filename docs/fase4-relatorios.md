# Fase 4 — Relatórios Gerenciais

## Objetivo
Criar uma seção de relatórios no SalesTracker para gestores e donos visualizarem o desempenho do time e de cada vendedor individualmente.

## Telas

### 1. Visão Geral (tela principal)
Filtros: seletor de mês, seletor de vendedor (opcional, padrão "Todos")

KPIs obrigatórios (cards no topo):
- Total de contratos cadastrados no mês
- Contratos aguardando assinatura
- Contratos ativos
- Ticket médio (valor médio dos contratos ativos)
- Taxa de conversão (ativos ÷ total × 100)

Componentes adicionais:
- Barra de progresso da meta do time (meta definida no Supabase)
- Gráfico de barras com evolução dos últimos 6 meses

### 2. Ranking de Vendedores
Filtro: seletor de mês

Tabela com colunas:
- Posição
- Nome do vendedor
- Contratos ativos
- Aguardando assinatura
- % de atingimento da meta individual

### 3. Relatório por Vendedor (drill-down)
Filtros: seletor de vendedor, seletor de mês

KPIs:
- Contratos ativos
- Contratos aguardando assinatura
- % da meta individual
- Ticket médio individual

Componente adicional:
- Gráfico de barras com evolução dos últimos 4 meses do vendedor

## Fontes de Dados

### API IXC (via proxy VPS porta 3001)
Consultar docs/ixc-api.md para endpoints e autenticação.

Dados necessários:
- Lista de contratos com: status, data de cadastro, data de ativação, vendedor responsável, valor do plano
- Status a filtrar: "aguardando assinatura" e "ativo"
- Filtrar por período (mês/ano)

### Supabase
Dados necessários:
- Tabela de metas: vendedor_id, mes, ano, meta_contratos
- Caso a tabela não exista, criá-la com esses campos

## Regras de Negócio
- "Aguardando assinatura" = contrato cadastrado mas não ativo ainda
- "Ativo" = contrato com status ativo no IXC
- Ticket médio = soma dos valores dos contratos ativos ÷ quantidade
- Taxa de conversão = contratos ativos ÷ total cadastrado × 100
- Meta % = contratos ativos do vendedor ÷ meta definida no Supabase × 100

## Padrão de Implementação
- Seguir o padrão de componentes já existente no projeto (Fases 1 e 2)
- Usar Tailwind v4 para estilização
- Dados do IXC via React Query com cache de 30 minutos (mesmo padrão do sync existente)
- Reutilizar o hook de autenticação/permissões da Fase 3 para controlar acesso à seção de relatórios
- Gestores e donos têm acesso completo; vendedores veem apenas o próprio relatório