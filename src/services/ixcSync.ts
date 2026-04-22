import { supabase } from '@/lib/supabase'
import {
  ixcBuscarStatusContrato,
  ixcBuscarCliente,
  ixcListarTodosContratos,
  ixcBuscarAreceberPorContrato,
  type IxcContratoFull,
} from '@/lib/ixc'
import { runReconciliacao } from '@/services/reconciliacao'
import { syncAllVendasUnicas } from '@/hooks/useVendasUnicas'

const DAY_MS = 1000 * 60 * 60 * 24

export interface SyncResultado {
  atualizadas: number
  erros: number
  total: number
}

interface VendaParaSync {
  id: string
  codigo_contrato_ixc: string
  status_ixc: string | null
  status_atualizado_em: string | null
}

async function sincronizarVenda(venda: VendaParaSync): Promise<{ atualizado: boolean; erro?: string }> {
  try {
    const contrato = await ixcBuscarStatusContrato(venda.codigo_contrato_ixc)
    const newCode = contrato.status_code

    const statusChanged = newCode !== venda.status_ixc
    const now = new Date()

    // Determinar novo status_atualizado_em
    const novoStatusAtualizadoEm = statusChanged
      ? now.toISOString()
      : (venda.status_atualizado_em ?? now.toISOString())

    // Calcular dias em AA usando o campo "data" do IXC como referência real
    const diasEmAa = newCode === 'AA' && contrato.data
      ? Math.floor((now.getTime() - new Date(contrato.data).getTime()) / DAY_MS)
      : null

    // Só atualiza se algo mudou (evita writes desnecessários)
    const deveAtualizar = statusChanged || (newCode === 'AA')
    if (!deveAtualizar) return { atualizado: false }

    const payload: Record<string, unknown> = { dias_em_aa: diasEmAa }
    if (statusChanged) {
      payload.status_ixc = newCode
      payload.status_atualizado_em = novoStatusAtualizadoEm
    }

    const { error } = await supabase.from('vendas').update(payload).eq('id', venda.id)
    if (error) throw error

    return { atualizado: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro desconhecido'
    return { atualizado: false, erro: msg }
  }
}

// ── Helpers de log ────────────────────────────────────────────────────────────

async function inserirLogSync(tipo: string): Promise<string | null> {
  const { data } = await supabase
    .from('sync_log')
    .insert({ tipo, status: 'em_andamento', iniciado_em: new Date().toISOString() })
    .select('id')
    .single()
  return data?.id ?? null
}

async function atualizarLogSync(id: string, fields: Partial<{
  status: string
  finalizado_em: string
  duracao_ms: number
  registros_processados: number
  registros_atualizados: number
  registros_erro: number
  erro_mensagem: string
}>): Promise<void> {
  await supabase.from('sync_log').update(fields).eq('id', id)
}

// ── Sync principal ────────────────────────────────────────────────────────────

export async function sincronizarStatusIxc(): Promise<SyncResultado> {
  const iniciadoEm = Date.now()
  // Log não-fatal: se falhar, o sync continua normalmente
  const logId = await inserirLogSync('ixc_contratos').catch(() => null)

  try {
    const { data, error } = await supabase
      .from('vendas')
      .select('id, codigo_contrato_ixc, status_ixc, status_atualizado_em')
      .not('codigo_contrato_ixc', 'is', null)

    if (error) throw new Error(`Erro ao buscar vendas: ${error.message}`)

    const vendas = (data ?? []) as VendaParaSync[]

    let resultado: SyncResultado
    if (!vendas.length) {
      resultado = { atualizadas: 0, erros: 0, total: 0 }
    } else {
      const results = await Promise.allSettled(vendas.map(sincronizarVenda))

      let atualizadas = 0
      let erros = 0
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.atualizado) atualizadas++
          if (r.value.erro) erros++
        } else {
          erros++
        }
      }
      resultado = { atualizadas, erros, total: vendas.length }
    }

    if (logId) {
      await atualizarLogSync(logId, {
        status: 'sucesso',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        registros_processados: resultado.total,
        registros_atualizados: resultado.atualizadas,
        registros_erro: resultado.erros,
      }).catch(() => undefined)
    }

    // Reconciliação automática após cada sync — não-fatal
    await runReconciliacao('').catch(() => undefined)

    // Sync de vendas únicas (parcelas) — não-fatal
    await syncAllVendasUnicas().catch(() => undefined)

    return resultado
  } catch (err) {
    if (logId) {
      await atualizarLogSync(logId, {
        status: 'erro',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        erro_mensagem: err instanceof Error ? err.message : 'erro desconhecido',
      }).catch(() => undefined)
    }
    throw err
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC COMPLETO DE CONTRATOS IXC → SUPABASE (Fase 6)
// ══════════════════════════════════════════════════════════════════════════════

export interface SyncContratosResult {
  importados: number
  erros: number
  backupCount: number
  deletados: number
}

export type SyncProgressCallback = (msg: string, pct?: number) => void

interface VendedorMap {
  id: string
  nome: string
  ixc_id: string | null
}

/**
 * Busca ou cria vendedor pelo ixc_id.
 * Se não existir, cria um registro "Vendedor IXC {id}" para não perder dados.
 */
async function getOrCreateVendedor(
  ixcVendedorId: string | null,
  vendedoresCache: Map<string, string>,
  vendedoresList: VendedorMap[]
): Promise<string | null> {
  if (!ixcVendedorId) return null

  // Verificar cache
  const cached = vendedoresCache.get(ixcVendedorId)
  if (cached) return cached

  // Buscar na lista local
  const found = vendedoresList.find((v) => v.ixc_id === ixcVendedorId)
  if (found) {
    vendedoresCache.set(ixcVendedorId, found.id)
    return found.id
  }

  // Criar novo vendedor
  const { data: newVendedor, error } = await supabase
    .from('vendedores')
    .insert({
      nome: `Vendedor IXC ${ixcVendedorId}`,
      ixc_id: ixcVendedorId,
      ativo: true,
    })
    .select('id')
    .single()

  if (error || !newVendedor) {
    console.warn(`[syncContratos] Erro ao criar vendedor IXC ${ixcVendedorId}:`, error)
    return null
  }

  vendedoresCache.set(ixcVendedorId, newVendedor.id)
  return newVendedor.id
}

/**
 * Calcula o MRR de um contrato.
 * Prioriza taxa_instalacao; se zero, busca último boleto não-proporcional.
 */
async function calcularMRR(contrato: IxcContratoFull): Promise<number> {
  // Se taxa_instalacao > 0, usar direto
  if (contrato.taxa_instalacao > 0) {
    return contrato.taxa_instalacao
  }

  // Buscar boletos do contrato
  try {
    const boletos = await ixcBuscarAreceberPorContrato(contrato.id)

    // Filtrar boletos não-proporcionais (parcela_proporcional !== 'S')
    const boletoValido = boletos.find((b) => {
      const proporcional = (b.raw.parcela_proporcional as string | undefined) ?? 'N'
      return proporcional !== 'S' && b.valor > 0
    })

    return boletoValido?.valor ?? 0
  } catch {
    return 0
  }
}

/**
 * Processa lote de contratos buscando dados de clientes em paralelo.
 */
async function processarLoteContratos(
  contratos: IxcContratoFull[],
  vendedoresCache: Map<string, string>,
  vendedoresList: VendedorMap[],
  onProgress?: SyncProgressCallback
): Promise<Array<Record<string, unknown> | null>> {
  const BATCH_SIZE = 10
  const results: Array<Record<string, unknown> | null> = []

  for (let i = 0; i < contratos.length; i += BATCH_SIZE) {
    const batch = contratos.slice(i, i + BATCH_SIZE)
    const pct = Math.round(((i + batch.length) / contratos.length) * 100)
    onProgress?.(`Processando contratos... ${i + batch.length}/${contratos.length}`, pct)

    const batchResults = await Promise.all(
      batch.map(async (contrato) => {
        try {
          // Buscar dados do cliente
          const cliente = await ixcBuscarCliente(contrato.id_cliente)

          // Mapear vendedor
          const vendedorId = await getOrCreateVendedor(
            contrato.id_vendedor ?? contrato.id_vendedor_ativ,
            vendedoresCache,
            vendedoresList
          )

          // Calcular MRR
          const mrr = await calcularMRR(contrato)

          // Determinar data_venda
          const dataVenda = contrato.status === 'A'
            ? contrato.data_ativacao
            : contrato.data_cadastro_sistema

          return {
            cliente_nome: cliente.razao,
            cliente_cpf_cnpj: cliente.cnpj_cpf || null,
            cliente_uf: cliente.uf || null,
            codigo_cliente_ixc: contrato.id_cliente,
            codigo_contrato_ixc: contrato.id,
            vendedor_id: vendedorId,
            valor_total: mrr,
            valor_unitario: mrr,
            quantidade: 1,
            mrr: true, // Contratos são sempre recorrentes
            status_ixc: contrato.status,
            data_venda: dataVenda?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
            created_at: new Date().toISOString(),
          }
        } catch (err) {
          console.warn(`[syncContratos] Erro ao processar contrato ${contrato.id}:`, err)
          return null
        }
      })
    )

    results.push(...batchResults)
  }

  return results
}

/**
 * Sync completo de contratos do IXC para o Supabase.
 * Substitui todos os registros da tabela vendas por dados frescos do IXC.
 *
 * Fluxo:
 * 1. Registra início em sync_log
 * 2. Busca contratos ativos (A) e aguardando (AA) do IXC
 * 3. Filtra apenas filiais 1 e 6, e datas no mês corrente
 * 4. Para cada contrato, busca dados do cliente e calcula MRR
 * 5. Faz backup da tabela vendas
 * 6. Limpa a tabela vendas
 * 7. Insere os novos registros
 * 8. Atualiza sync_log com resultado
 */
export async function syncContratosFromIXC(
  onProgress?: SyncProgressCallback
): Promise<SyncContratosResult> {
  const iniciadoEm = Date.now()
  const logId = await inserirLogSync('ixc_contratos_full').catch(() => null)

  onProgress?.('Iniciando sincronização...', 0)

  try {
    // 1. Buscar lista de vendedores para mapeamento
    onProgress?.('Carregando vendedores...', 5)
    const { data: vendedoresList } = await supabase
      .from('vendedores')
      .select('id, nome, ixc_id')
    const vendedoresCache = new Map<string, string>()

    // 2. Buscar contratos do mês (já filtrados no IXC via grid_param)
    onProgress?.('Buscando contratos do IXC...', 10)
    const contratosFiltrados = await ixcListarTodosContratos()

    onProgress?.(`${contratosFiltrados.length} contratos do mês encontrados`, 30)

    if (contratosFiltrados.length === 0) {
      // Nenhum contrato para importar
      if (logId) {
        await atualizarLogSync(logId, {
          status: 'sucesso',
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - iniciadoEm,
          registros_processados: 0,
          registros_atualizados: 0,
        }).catch(() => undefined)
      }
      return { importados: 0, erros: 0, backupCount: 0, deletados: 0 }
    }

    // 4. Processar contratos (buscar clientes, calcular MRR)
    onProgress?.('Processando dados dos contratos...', 35)
    const vendasParaInserir = await processarLoteContratos(
      contratosFiltrados,
      vendedoresCache,
      (vendedoresList ?? []) as VendedorMap[],
      onProgress
    )

    const vendasValidas = vendasParaInserir.filter((v): v is Record<string, unknown> => v !== null)
    const erros = vendasParaInserir.length - vendasValidas.length

    // 5. Fazer backup antes de deletar (via insert manual, pois a function RPC pode não existir)
    onProgress?.('Fazendo backup dos dados atuais...', 80)
    let backupCount = 0
    try {
      // Buscar todas as vendas atuais
      const { data: vendasAtuais } = await supabase.from('vendas').select('*')
      if (vendasAtuais && vendasAtuais.length > 0) {
        // Inserir no backup com timestamp
        // Nota: vendas_backup é uma tabela custom, usamos type assertion
        const backupRows = vendasAtuais.map((v) => ({
          ...v,
          backup_at: new Date().toISOString(),
          sync_tipo: 'ixc_contratos_full',
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('vendas_backup').insert(backupRows)
        backupCount = vendasAtuais.length
      }
    } catch (backupErr) {
      console.warn('[syncContratos] Erro no backup (ignorado):', backupErr)
    }

    // 6. Limpar tabela vendas
    onProgress?.('Limpando registros antigos...', 85)
    let deletados = 0
    try {
      const { data: countData } = await supabase.from('vendas').select('id', { count: 'exact', head: true })
      deletados = (countData as unknown as number) ?? 0
      await supabase.from('vendas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch {
      // Se falhar, tentar de outra forma
      await supabase.from('vendas').delete().gte('created_at', '1970-01-01')
    }

    // 7. Inserir novos registros
    onProgress?.('Importando contratos...', 90)
    if (vendasValidas.length > 0) {
      // Converter para tipo correto antes de inserir
      const vendasTyped = vendasValidas.map((v) => ({
        cliente_nome: String(v.cliente_nome ?? ''),
        cliente_cpf_cnpj: v.cliente_cpf_cnpj as string | null,
        cliente_uf: v.cliente_uf as string | null,
        codigo_cliente_ixc: v.codigo_cliente_ixc as string | null,
        codigo_contrato_ixc: v.codigo_contrato_ixc as string | null,
        vendedor_id: v.vendedor_id as string | null,
        valor_total: Number(v.valor_total ?? 0),
        valor_unitario: Number(v.valor_unitario ?? 0),
        quantidade: Number(v.quantidade ?? 1),
        mrr: Boolean(v.mrr),
        status_ixc: v.status_ixc as string | null,
        data_venda: v.data_venda as string,
      }))
      const { error: insertError } = await supabase.from('vendas').insert(vendasTyped)
      if (insertError) {
        throw new Error(`Erro ao inserir vendas: ${insertError.message}`)
      }
    }

    // 8. Atualizar log
    onProgress?.('Finalizando...', 95)
    if (logId) {
      await atualizarLogSync(logId, {
        status: 'sucesso',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        registros_processados: contratosFiltrados.length,
        registros_atualizados: vendasValidas.length,
        registros_erro: erros,
      }).catch(() => undefined)
    }

    onProgress?.(`Sync concluído — ${vendasValidas.length} contratos importados`, 100)

    return {
      importados: vendasValidas.length,
      erros,
      backupCount: backupCount ?? 0,
      deletados: deletados ?? 0,
    }
  } catch (err) {
    if (logId) {
      await atualizarLogSync(logId, {
        status: 'erro',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        erro_mensagem: err instanceof Error ? err.message : 'erro desconhecido',
      }).catch(() => undefined)
    }
    throw err
  }
}
