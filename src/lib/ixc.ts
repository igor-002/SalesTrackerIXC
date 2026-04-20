/**
 * Serviço de integração com a API do IXCSoft.
 *
 * Variáveis de ambiente necessárias (prefixo VITE_ porque são usadas no frontend):
 *   VITE_IXC_BASE_URL   — URL base do servidor IXC, ex: https://ixc.suaempresa.com.br
 *   VITE_IXC_TOKEN      — Token gerado em Configurações > Usuários > Usuário > Token de acesso
 *                         Formato esperado: "Basic <base64(usuario:senha)>"
 *                         OU token direto gerado pelo painel IXC.
 *
 * Opcional (só alterar se a versão do IXC usar campos diferentes):
 *   VITE_IXC_CAMPO_STATUS_CONTRATO — nome do campo de status no JSON (padrão: "status_internet")
 *
 * Mapeamento de status IXC → nome legível:
 *   A  → Ativo
 *   B  → Bloqueado
 *   C  → Cancelado
 *   Outros → valor original
 *
 * Quando as credenciais chegarem, teste com:
 *   ixcBuscarStatusContrato("1234")
 * e inspecione o retorno para confirmar o nome do campo de status.
 */

const IXC_BASE_URL = import.meta.env.VITE_IXC_BASE_URL as string | undefined

const IXC_CAMPO_STATUS = (import.meta.env.VITE_IXC_CAMPO_STATUS_CONTRATO as string | undefined) ?? 'status_internet'

// Statuses reais do IXC — código (armazenado no DB) + label (exibido na UI)
export const IXC_STATUSES = [
  { code: 'A',  label: 'Ativo' },
  { code: 'CM', label: 'Bloqueado Manual' },
  { code: 'FA', label: 'Financeiro em Atraso' },
  { code: 'AA', label: 'Aguardando Assinatura' },
  { code: 'CN', label: 'Cancelado' },
  { code: 'N',  label: 'Negativado' },
] as const

export type IxcStatusCode = (typeof IXC_STATUSES)[number]['code']

export function ixcStatusLabel(code: string): string {
  return IXC_STATUSES.find((s) => s.code === code)?.label ?? code
}

const IXC_STATUS_MAP: Record<string, string> = Object.fromEntries(
  IXC_STATUSES.map((s) => [s.code, s.label])
)

export type IxcContratoStatus = string

export interface IxcContrato {
  id: string
  status: IxcContratoStatus  // label mapeado (ex: "Ativo")
  status_code: string        // código bruto IXC (ex: "A")
  data: string | null        // campo "data" do contrato IXC (ex: "2026-04-13")
  raw: Record<string, unknown>
}

export interface IxcContratoProduto {
  id: string
  descricao: string
  valor_unit: number
  qtde: number
  valor_bruto: number
}

export interface IxcContratoCompleto extends IxcContrato {
  id_vendedor: string | null
  id_cliente: string | null
  produtos: IxcContratoProduto[]
}

export interface IxcVendedor {
  id: string
  nome: string
  raw: Record<string, unknown>
}

// Todas as chamadas passam pelo proxy para evitar CORS.
// Se VITE_IXC_PROXY_URL estiver definida, usa o proxy externo (VPS).
// Caso contrário, usa /api/ixc (Vite proxy em dev ou Vercel function em prod).
function ixcHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function ixcUrl(tabela: string): string {
  const proxy = import.meta.env.VITE_IXC_PROXY_URL as string | undefined
  return proxy ? `${proxy.trim()}/ixc/${tabela}` : `/api/ixc/${tabela}`
}

/**
 * Busca um contrato pelo ID e retorna o status mapeado.
 * Usa a operação "obter" (busca por ID direto).
 */
export async function ixcBuscarStatusContrato(codigoContrato: string): Promise<IxcContrato> {
  const resp = await fetch(ixcUrl('cliente_contrato'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype: 'cliente_contrato.id',
      query: codigoContrato,
      oper: '=',
      page: '1',
      rp: '1',
      sortname: 'cliente_contrato.id',
      sortorder: 'desc',
    }),
  })

  if (!resp.ok) {
    throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  }

  const data = (await resp.json()) as { total?: string; registros?: Record<string, unknown>[] | Record<string, unknown> }

  const registros: Record<string, unknown>[] = Array.isArray(data.registros)
    ? data.registros
    : data.registros && typeof data.registros === 'object' && Object.keys(data.registros).length > 0
      ? Object.values(data.registros) as Record<string, unknown>[]
      : []

  if (!registros.length) {
    console.warn('[IXC] ixcBuscarStatusContrato resposta bruta:', JSON.stringify(data))
    throw new Error(`Contrato ${codigoContrato} não encontrado no IXC (total=${data.total ?? '?'})`)
  }

  const registro = registros[0]
  const rawStatus = (registro[IXC_CAMPO_STATUS] as string | undefined) ?? ''
  const status: IxcContratoStatus = IXC_STATUS_MAP[rawStatus] ?? rawStatus
  const dataContrato = (registro['data'] as string | undefined) ?? null

  return { id: codigoContrato, status, status_code: rawStatus, data: dataContrato, raw: registro }
}

export interface IxcCliente {
  id: string
  razao: string
  cnpj_cpf: string
  uf: string
  raw: Record<string, unknown>
}

/**
 * Busca um cliente pelo ID e retorna seus dados principais.
 */
export async function ixcBuscarCliente(codigoCliente: string): Promise<IxcCliente> {
  const resp = await fetch(ixcUrl('cliente'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype:     'cliente.id',
      query:     codigoCliente,
      oper:      '=',
      page:      '1',
      rp:        '1',
      sortname:  'cliente.id',
      sortorder: 'asc',
    }),
  })

  if (!resp.ok) {
    throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  }

  const data = (await resp.json()) as { total?: string; registros?: Record<string, unknown>[] | Record<string, unknown> }

  // IXC pode retornar registros como array OU como objeto indexado por chave
  const registros: Record<string, unknown>[] = Array.isArray(data.registros)
    ? data.registros
    : data.registros && typeof data.registros === 'object' && Object.keys(data.registros).length > 0
      ? Object.values(data.registros) as Record<string, unknown>[]
      : []

  if (!registros.length) {
    // Log para debug — aparece no console do browser
    console.warn('[IXC] ixcBuscarCliente resposta bruta:', JSON.stringify(data))
    throw new Error(`Cliente ${codigoCliente} não encontrado no IXC (total=${data.total ?? '?'})`)
  }

  const r = registros[0]
  return {
    id:       codigoCliente,
    razao:    (r.razao    as string | undefined) ?? '',
    cnpj_cpf: (r.cnpj_cpf as string | undefined) ?? '',
    uf:       (r.uf       as string | undefined) ?? '',
    raw:      r,
  }
}

/**
 * Verifica se as variáveis de ambiente do IXC estão configuradas.
 */
// Verifica se a integração IXC está habilitada.
// Considera configurado se há URL do proxy externo OU URL base direta.
export function ixcConfigurado(): boolean {
  const proxy = import.meta.env.VITE_IXC_PROXY_URL as string | undefined
  return Boolean(proxy) || Boolean(IXC_BASE_URL)
}

// Helper para normalizar registros da API IXC (pode vir como array ou objeto indexado)
function normalizeRegistros(data: { registros?: Record<string, unknown>[] | Record<string, unknown> }): Record<string, unknown>[] {
  if (Array.isArray(data.registros)) return data.registros
  if (data.registros && typeof data.registros === 'object' && Object.keys(data.registros).length > 0)
    return Object.values(data.registros) as Record<string, unknown>[]
  return []
}

/**
 * Busca todos os produtos de um contrato IXC.
 * valor_unit real = valor_bruto / qtde (considera descontos já aplicados).
 */
export async function ixcBuscarContratoProdutos(idContrato: string): Promise<IxcContratoProduto[]> {
  const resp = await fetch(ixcUrl('vd_contratos_produtos'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype: 'vd_contratos_produtos.id_contrato',
      query: idContrato,
      oper: '=',
      page: '1',
      rp: '50',
      sortname: 'id',
      sortorder: 'asc',
    }),
  })
  if (!resp.ok) throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  const data = (await resp.json()) as { registros?: Record<string, unknown>[] | Record<string, unknown> }
  const registros = normalizeRegistros(data)
  return registros.map((r) => {
    const valorUnit = parseFloat(String(r.valor_unit ?? '0'))
    const qtde = parseInt(String(r.qtde ?? '1'), 10) || 1
    return {
      id: String(r.id ?? ''),
      descricao: (r.descricao as string | undefined) ?? '',
      valor_unit: valorUnit,
      qtde,
      valor_bruto: valorUnit * qtde,
    }
  })
}

/**
 * Busca contrato completo: status + id_vendedor + id_cliente + produtos com valores reais.
 * Faz duas chamadas em paralelo (contrato + produtos).
 */
export async function ixcBuscarContrato(idContrato: string): Promise<IxcContratoCompleto> {
  const [contrato, produtos] = await Promise.all([
    ixcBuscarStatusContrato(idContrato),
    ixcBuscarContratoProdutos(idContrato).catch(() => []),
  ])
  return {
    ...contrato,
    id_vendedor: (contrato.raw.id_vendedor as string | undefined) ?? null,
    id_cliente: (contrato.raw.id_cliente as string | undefined) ?? null,
    produtos,
  }
}

/**
 * Lista todos os vendedores ativos do IXC (endpoint /vendedor, status "A" = ativo).
 */
export async function ixcListarVendedores(): Promise<IxcVendedor[]> {
  const resp = await fetch(ixcUrl('vendedor'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype: 'id',
      query: '1',
      oper: '>=',
      page: '1',
      rp: '200',
      sortname: 'nome',
      sortorder: 'asc',
    }),
  })
  if (!resp.ok) throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  const data = (await resp.json()) as { registros?: Record<string, unknown>[] | Record<string, unknown> }
  const registros = normalizeRegistros(data)
  return registros
    .filter((r) => r.status === 'A')
    .map((r) => ({
      id: String(r.id ?? ''),
      nome: (r.nome as string | undefined) ?? '',
      raw: r,
    }))
}

// ── Vendas Únicas (vd_saida) ────────────────────────────────────────────────

export interface IxcVendaSaida {
  id: string
  id_cliente: string
  valor_total: number
  status: string // F=Finalizado, A=Aberto, C=Cancelado
  ids_areceber: string | null
  data_vencimento_areceber: string | null
  data_emissao: string | null
  data_saida: string | null
  id_contrato: string
  id_comissionado: string | null
  raw: Record<string, unknown>
}

/**
 * Busca vendas avulsas de um cliente no IXC (vd_saida sem contrato vinculado).
 * Considera avulsa quando id_contrato é "0", "", null ou ausente.
 */
export async function ixcBuscarVendasCliente(idCliente: string): Promise<IxcVendaSaida[]> {
  const resp = await fetch(ixcUrl('vd_saida'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype: 'vd_saida.id_cliente',
      query: idCliente,
      oper: '=',
      page: '1',
      rp: '100',
      sortname: 'vd_saida.id',
      sortorder: 'desc',
    }),
  })
  if (!resp.ok) throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  const data = (await resp.json()) as { registros?: Record<string, unknown>[] | Record<string, unknown> }
  const registros = normalizeRegistros(data)

  // Filtro mais permissivo para vendas avulsas:
  // id_contrato = "0", "", null, undefined ou ausente
  const isAvulsa = (r: Record<string, unknown>): boolean => {
    const idContrato = r.id_contrato
    if (idContrato === null || idContrato === undefined) return true
    const str = String(idContrato).trim()
    return str === '' || str === '0'
  }

  return registros
    .filter(isAvulsa)
    .map((r) => ({
      id: String(r.id ?? ''),
      id_cliente: String(r.id_cliente ?? ''),
      valor_total: parseFloat(String(r.valor_total ?? '0')),
      status: String(r.status ?? ''),
      ids_areceber: (r.ids_areceber as string | undefined) ?? null,
      data_vencimento_areceber: (r.data_vencimento_areceber as string | undefined) ?? null,
      data_emissao: (r.data_emissao as string | undefined) ?? null,
      data_saida: (r.data_saida as string | undefined) ?? null,
      id_contrato: String(r.id_contrato ?? ''),
      id_comissionado: (r.id_comissionado as string | undefined) ?? null,
      raw: r,
    }))
}

// ── Financeiro (fn_areceber) ────────────────────────────────────────────────

export interface IxcAreceber {
  id: string
  id_venda: string
  valor: number
  valor_baixado: number
  data_vencimento: string
  data_pagamento: string | null
  status: string // "A receber", "Recebimento em dia", "Recebimento em atraso"
  raw: Record<string, unknown>
}

/**
 * Busca boletos/parcelas de uma venda no IXC (fn_areceber).
 */
export async function ixcBuscarAreceberPorVenda(idVenda: string): Promise<IxcAreceber[]> {
  const resp = await fetch(ixcUrl('fn_areceber'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype: 'fn_areceber.id_venda',
      query: idVenda,
      oper: '=',
      page: '1',
      rp: '50',
      sortname: 'fn_areceber.data_vencimento',
      sortorder: 'asc',
    }),
  })
  if (!resp.ok) throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  const data = (await resp.json()) as { registros?: Record<string, unknown>[] | Record<string, unknown> }
  const registros = normalizeRegistros(data)
  return registros.map((r) => ({
    id: String(r.id ?? ''),
    id_venda: String(r.id_venda ?? ''),
    valor: parseFloat(String(r.valor ?? '0')),
    valor_baixado: parseFloat(String(r.valor_baixado ?? '0')),
    data_vencimento: String(r.data_vencimento ?? ''),
    data_pagamento: (r.data_pagamento as string | undefined) || null,
    status: String(r.status ?? ''),
    raw: r,
  }))
}

/**
 * Busca um boleto específico pelo ID no IXC.
 */
export async function ixcBuscarAreceberPorId(idAreceber: string): Promise<IxcAreceber | null> {
  const resp = await fetch(ixcUrl('fn_areceber'), {
    method: 'POST',
    headers: { ...ixcHeaders(), ixcsoft: 'listar' },
    body: JSON.stringify({
      qtype: 'fn_areceber.id',
      query: idAreceber,
      oper: '=',
      page: '1',
      rp: '1',
      sortname: 'fn_areceber.id',
      sortorder: 'asc',
    }),
  })
  if (!resp.ok) throw new Error(`IXC API erro ${resp.status}: ${resp.statusText}`)
  const data = (await resp.json()) as { registros?: Record<string, unknown>[] | Record<string, unknown> }
  const registros = normalizeRegistros(data)
  if (!registros.length) return null
  const r = registros[0]
  return {
    id: String(r.id ?? ''),
    id_venda: String(r.id_venda ?? ''),
    valor: parseFloat(String(r.valor ?? '0')),
    valor_baixado: parseFloat(String(r.valor_baixado ?? '0')),
    data_vencimento: String(r.data_vencimento ?? ''),
    data_pagamento: (r.data_pagamento as string | undefined) || null,
    status: String(r.status ?? ''),
    raw: r,
  }
}
