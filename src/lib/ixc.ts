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
const IXC_TOKEN = import.meta.env.VITE_IXC_TOKEN as string | undefined
const IXC_CAMPO_STATUS = (import.meta.env.VITE_IXC_CAMPO_STATUS_CONTRATO as string | undefined) ?? 'status_internet'

// Mapeamento dos valores brutos retornados pela API para nomes usados no SalesTracker.
// Ajuste conforme os valores reais da sua instância IXC.
const IXC_STATUS_MAP: Record<string, string> = {
  A: 'Ativo',
  B: 'Bloqueado',
  C: 'Cancelado',
  // Adicione outros mapeamentos conforme necessário após testar com a API real
}

export type IxcContratoStatus = 'Ativo' | 'Bloqueado' | 'Cancelado' | string

export interface IxcContrato {
  id: string
  status: IxcContratoStatus
  raw: Record<string, unknown>
}

// Todas as chamadas passam pelo proxy /api/ixc para evitar CORS.
// Em dev: Vite proxy (vite.config.ts) repassa para IXC_BASE_URL.
// Em prod: Vercel function (api/ixc.ts) repassa server-side.
function ixcHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function ixcUrl(tabela: string): string {
  return `/api/ixc/${tabela}`
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

  const data = (await resp.json()) as { total: string; registros: Record<string, unknown>[] }

  if (!data.registros?.length) {
    throw new Error(`Contrato ${codigoContrato} não encontrado no IXC`)
  }

  const registro = data.registros[0]
  const rawStatus = (registro[IXC_CAMPO_STATUS] as string | undefined) ?? ''
  const status: IxcContratoStatus = IXC_STATUS_MAP[rawStatus] ?? rawStatus

  return { id: codigoContrato, status, raw: registro }
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

  const data = (await resp.json()) as { total: string; registros: Record<string, unknown>[] }

  if (!data.registros?.length) {
    throw new Error(`Cliente ${codigoCliente} não encontrado no IXC`)
  }

  const r = data.registros[0]
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
// O token fica no servidor (proxy); no browser basta checar a URL base.
export function ixcConfigurado(): boolean {
  return Boolean(IXC_BASE_URL)
}
