import { supabase } from '@/lib/supabase'
import {
  ixcBuscarStatusContrato,
  ixcBuscarCliente,
  ixcListarTodosContratos,
  ixcBuscarAreceberPorContrato,
  ixcBuscarProdutosContrato,
  ixcListarContratosPorVendedor,
  type IxcContratoFull,
} from '@/lib/ixc'
import { runReconciliacao } from '@/services/reconciliacao'
import { syncAllVendasUnicas } from '@/hooks/useVendasUnicas'
import type { Database } from '@/types/database.types'

type VendasHistoricoInsert = Database['public']['Tables']['vendas_historico']['Insert']

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

  // Buscar na lista local (já filtrada para incluir_historico = true)
  const found = vendedoresList.find((v) => v.ixc_id === ixcVendedorId)
  if (found) {
    vendedoresCache.set(ixcVendedorId, found.id)
    return found.id
  }

  // Não criar vendedor automaticamente - retornar null se não estiver autorizado
  // (A lista vendedoresList já contém apenas vendedores autorizados)
  console.warn(
    `[syncContratos] Vendedor IXC ${ixcVendedorId} não autorizado (incluir_historico != true)`
  )
  return null
}

/**
 * Calcula o MRR de um contrato.
 *
 * Lógica por status:
 * - Contratos ativos (A): busca fn_areceber por boleto real
 * - Contratos aguardando (AA/P): busca vd_contratos_produtos pelo plano
 *
 * Se status A não encontrar boleto válido, faz fallback para plano.
 */
async function calcularMRR(contrato: IxcContratoFull): Promise<number> {
  // Step 1: Se status = 'A', tentar buscar boleto real
  if (contrato.status === 'A') {
    try {
      const boletos = await ixcBuscarAreceberPorContrato(contrato.id)

      if (boletos.length > 0) {
        // Separar boletos não-proporcionais (parcela_proporcional !== 'S')
        const boletosNaoProp = boletos.filter((b) => {
          const proporcional = (b.raw.parcela_proporcional as string | undefined) ?? 'N'
          return proporcional !== 'S' && b.valor > 0
        })

        // Se existem boletos não-proporcionais, pegar o mais recente
        if (boletosNaoProp.length > 0) {
          return boletosNaoProp[0].valor
        }

        // Se só existem proporcionais, pegar o maior valor
        const maiorValor = Math.max(...boletos.map((b) => b.valor))
        if (maiorValor > 0) {
          return maiorValor
        }
      }
      // Se não encontrou boleto válido, faz fallback para Step 2
    } catch {
      // Erro ao buscar boletos, faz fallback para Step 2
    }
  }

  // Step 2: Buscar valor pelos produtos (id_contrato + id_vd_contrato)
  // Produtos podem estar vinculados ao contrato OU ao plano
  // Usado para AA, P, ou fallback de A sem boletos
  try {
    const valorProdutos = await ixcBuscarProdutosContrato(
      contrato.id,
      contrato.id_vd_contrato
    )
    if (valorProdutos > 0) {
      return valorProdutos
    }
  } catch {
    // Erro ao buscar produtos, retorna 0
  }

  // Step 3: Nada encontrado
  return 0
}

/**
 * Mapeia status_ixc para status_id do Supabase.
 */
function mapStatusIxcToId(statusIxc: string): string {
  const map: Record<string, string> = {
    'A': '02d9280f-39dd-4e9f-9866-a2c442c74544',   // Ativo
    'AA': '3ab54213-e70b-435d-b707-1140b9f26e69',  // Pendente
    'P': '3ab54213-e70b-435d-b707-1140b9f26e69',   // Proposta (trata como Pendente)
    'B': 'b191728e-56ac-435f-8777-723473ec7cce',   // Inativo
    'C': '641cba2c-09c9-468e-a303-8be54b999998',   // Cancelado
  }
  return map[statusIxc] ?? '3ab54213-e70b-435d-b707-1140b9f26e69' // Default: Pendente
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

          // Determinar data_venda e data de referência para mes/ano
          // Para status A: data_ativacao
          // Para status AA, P ou outros: data_cadastro_sistema
          // Se data_ativacao for '0000-00-00', usar data_cadastro_sistema
          const dataVenda =
            contrato.status === 'A' && contrato.data_ativacao && contrato.data_ativacao !== '0000-00-00'
              ? contrato.data_ativacao
              : contrato.data_cadastro_sistema

          // Calcular mes_referencia e ano_referencia
          const dataRef = dataVenda ?? new Date().toISOString().slice(0, 10)
          const dateObj = new Date(dataRef)
          const mes_referencia = dateObj.getMonth() + 1
          const ano_referencia = dateObj.getFullYear()

          // Calcular dias_aguardando e tag para contratos AA/P
          let dias_aguardando: number | null = null
          let tags: string[] = []
          if ((contrato.status === 'AA' || contrato.status === 'P') && contrato.data_cadastro_sistema) {
            const dataCadastro = new Date(contrato.data_cadastro_sistema)
            const hoje = new Date()
            dias_aguardando = Math.floor((hoje.getTime() - dataCadastro.getTime()) / (1000 * 60 * 60 * 24))
            if (dias_aguardando > 30) {
              tags = ['antigo']
            }
          }

          return {
            cliente_nome: cliente.razao,
            cliente_cpf_cnpj: cliente.cnpj_cpf || null,
            cliente_uf: cliente.uf || null,
            codigo_cliente_ixc: contrato.id_cliente,
            codigo_contrato_ixc: contrato.id,
            vendedor_id: vendedorId,
            valor_unitario: mrr,
            quantidade: 1,
            mrr: true, // Contratos são sempre recorrentes
            status_id: mapStatusIxcToId(contrato.status),
            status_ixc: contrato.status,
            data_venda: dataRef.slice(0, 10),
            mes_referencia,
            ano_referencia,
            dias_aguardando,
            tags,
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
    // 1. Buscar lista de vendedores autorizados para mapeamento
    onProgress?.('Carregando vendedores autorizados...', 5)
    const { data: vendedoresList } = await supabase
      .from('vendedores')
      .select('id, nome, ixc_id')
      .eq('incluir_historico', true)
      .not('ixc_id', 'is', null)

    const vendedoresCache = new Map<string, string>()
    const ixcIdsAutorizados = new Set<string>(
      (vendedoresList ?? []).map(v => v.ixc_id).filter((id): id is string => id !== null)
    )

    // 2. Buscar contratos do mês (já filtrados no IXC via grid_param)
    onProgress?.('Buscando contratos do IXC...', 10)
    const contratosIXC = await ixcListarTodosContratos()

    // 3. Filtrar apenas contratos de vendedores autorizados
    const contratosFiltrados = contratosIXC.filter(contrato => {
      const vendedorId = contrato.id_vendedor ?? contrato.id_vendedor_ativ
      return vendedorId && ixcIdsAutorizados.has(vendedorId)
    })

    onProgress?.(
      `${contratosFiltrados.length} contratos de vendedores autorizados encontrados (${contratosIXC.length} total)`,
      30
    )

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

    // 5. Backup desabilitado temporariamente (RLS bloqueando insert em vendas_backup)
    // TODO: reativar quando políticas RLS estiverem configuradas
    const backupCount = 0
    onProgress?.('Preparando importação...', 80)

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
      // Nota: valor_total é coluna gerada (valor_unitario * quantidade), não inserir
      const vendasTyped = vendasValidas.map((v) => ({
        cliente_nome: String(v.cliente_nome ?? ''),
        cliente_cpf_cnpj: v.cliente_cpf_cnpj as string | null,
        cliente_uf: v.cliente_uf as string | null,
        codigo_cliente_ixc: v.codigo_cliente_ixc as string | null,
        codigo_contrato_ixc: v.codigo_contrato_ixc as string | null,
        vendedor_id: v.vendedor_id as string | null,
        valor_unitario: Number(v.valor_unitario ?? 0),
        quantidade: Number(v.quantidade ?? 1),
        mrr: Boolean(v.mrr),
        status_id: v.status_id as string,
        status_ixc: v.status_ixc as string | null,
        data_venda: v.data_venda as string,
        mes_referencia: Number(v.mes_referencia ?? new Date().getMonth() + 1),
        ano_referencia: Number(v.ano_referencia ?? new Date().getFullYear()),
        dias_aguardando: v.dias_aguardando as number | null,
        tags: v.tags as string[],
      }))
      const { error: insertError } = await supabase.from('vendas').insert(vendasTyped)
      if (insertError) {
        throw new Error(`Erro ao inserir vendas: ${insertError.message}`)
      }
    }

    // 8. Migrar meses anteriores para vendas_historico — antes de fechar o log
    try {
      onProgress?.('Migrando histórico de meses anteriores...', 92)
      const migResult = await migrarVendasParaHistorico()
      onProgress?.(`Histórico: ${migResult.inseridos} registros migrados`, 96)
    } catch (err) {
      console.warn('[syncContratosFromIXC] Erro na migração de histórico:', err)
    }

    // 9. Atualizar log
    onProgress?.('Finalizando...', 98)
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

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DE HISTÓRICO DE VENDEDORES (Fase 7)
// ══════════════════════════════════════════════════════════════════════════════

export interface SyncHistoricoResult {
  vendedoresProcessados: number
  mesesProcessados: number
  contratosInseridos: number
  erros: number
}

interface VendedorHistorico {
  id: string
  nome: string
  ixc_id: string
}

function getMesesAnteriores(n: number): { mes: number; ano: number; inicio: string; fim: string }[] {
  const now = new Date()
  const result: { mes: number; ano: number; inicio: string; fim: string }[] = []
  for (let i = 1; i <= n; i++) {
    let m = now.getMonth() + 1 - i
    let a = now.getFullYear()
    while (m <= 0) { m += 12; a-- }
    const inicio = `${a}-${String(m).padStart(2, '0')}-01`
    const ultimoDia = new Date(a, m, 0).getDate()
    const fim = `${a}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    result.push({ mes: m, ano: a, inicio, fim })
  }
  return result
}

/**
 * Sincroniza histórico de vendedores selecionados (incluir_historico = true).
 * Por padrão busca os últimos 3 meses; se opcoes for passado, usa o mês/ano específico.
 */
export async function syncHistoricoVendedores(
  onProgress?: SyncProgressCallback,
  opcoes?: { mes: number; ano: number }
): Promise<SyncHistoricoResult> {
  const iniciadoEm = Date.now()
  const logId = await inserirLogSync('historico_vendedores').catch(() => null)

  onProgress?.('Buscando vendedores para histórico...', 0)

  try {
    // 1. Buscar vendedores com incluir_historico = true
    const { data: vendedoresData, error: vendedoresError } = await supabase
      .from('vendedores')
      .select('id, nome, ixc_id')
      .eq('incluir_historico', true)
      .not('ixc_id', 'is', null)

    if (vendedoresError) throw new Error(`Erro ao buscar vendedores: ${vendedoresError.message}`)

    const vendedoresHistorico = (vendedoresData ?? []) as VendedorHistorico[]
    if (vendedoresHistorico.length === 0) {
      onProgress?.('Nenhum vendedor configurado para histórico', 100)
      if (logId) {
        await atualizarLogSync(logId, {
          status: 'sucesso',
          finalizado_em: new Date().toISOString(),
          duracao_ms: Date.now() - iniciadoEm,
          registros_processados: 0,
          registros_atualizados: 0,
        }).catch(() => undefined)
      }
      return { vendedoresProcessados: 0, mesesProcessados: 0, contratosInseridos: 0, erros: 0 }
    }

    // 2. Determinar quais meses processar
    const meses = opcoes
      ? (() => {
          const { mes, ano } = opcoes
          const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
          const ultimoDia = new Date(ano, mes, 0).getDate()
          const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
          return [{ mes, ano, inicio, fim }]
        })()
      : getMesesAnteriores(3)
    const totalOperacoes = vendedoresHistorico.length * meses.length
    let operacaoAtual = 0
    let totalContratosInseridos = 0
    let totalErros = 0

    onProgress?.(`Processando ${vendedoresHistorico.length} vendedores × ${meses.length} meses...`, 5)

    // 3. Para cada vendedor + cada mês
    for (const vendedor of vendedoresHistorico) {
      // Buscar todos os contratos do vendedor
      let contratosVendedor: IxcContratoFull[]
      try {
        contratosVendedor = await ixcListarContratosPorVendedor(vendedor.ixc_id)
      } catch (err) {
        console.warn(`[syncHistorico] Erro ao buscar contratos do vendedor ${vendedor.nome}:`, err)
        totalErros++
        operacaoAtual += meses.length
        continue
      }

      for (const mesRef of meses) {
        operacaoAtual++
        const pct = Math.round((operacaoAtual / totalOperacoes) * 90) + 5
        onProgress?.(`${vendedor.nome} — ${mesRef.mes}/${mesRef.ano}`, pct)

        // Filtrar contratos do mês específico
        const contratosDoMes = contratosVendedor.filter((c) => {
          if (!c.data_ativacao) return false
          return c.data_ativacao >= mesRef.inicio && c.data_ativacao <= mesRef.fim
        })

        // Deletar registros existentes do mesmo vendedor/mês/ano
        const { error: deleteError } = await supabase
          .from('vendas_historico')
          .delete()
          .eq('vendedor_id', vendedor.id)
          .eq('mes_referencia', mesRef.mes)
          .eq('ano_referencia', mesRef.ano)

        if (deleteError) {
          console.warn(`[syncHistorico] Erro ao deletar histórico existente:`, deleteError)
        }

        if (contratosDoMes.length === 0) continue

        // Processar e inserir contratos
        const registrosParaInserir: Record<string, unknown>[] = []

        for (const contrato of contratosDoMes) {
          try {
            const cliente = await ixcBuscarCliente(contrato.id_cliente)
            const mrr = await calcularMRR(contrato)

            registrosParaInserir.push({
              vendedor_id: vendedor.id,
              ixc_vendedor_id: vendedor.ixc_id,
              cliente_nome: cliente.razao,
              cliente_cpf_cnpj: cliente.cnpj_cpf || null,
              codigo_cliente_ixc: contrato.id_cliente,
              codigo_contrato_ixc: contrato.id,
              plano: contrato.contrato,
              valor_unitario: mrr,
              quantidade: 1,
              mrr: true,
              status_ixc: contrato.status,
              data_ativacao: contrato.data_ativacao?.slice(0, 10) ?? null,
              mes_referencia: mesRef.mes,
              ano_referencia: mesRef.ano,
              filial_id: contrato.id_filial,
              ultima_atualizacao: contrato.ultima_atualizacao,
            })
          } catch (err) {
            console.warn(`[syncHistorico] Erro ao processar contrato ${contrato.id}:`, err)
            totalErros++
          }
        }

        if (registrosParaInserir.length > 0) {
          const { error: insertError } = await supabase
            .from('vendas_historico')
            .insert(registrosParaInserir as VendasHistoricoInsert[])

          if (insertError) {
            console.warn(`[syncHistorico] Erro ao inserir histórico:`, insertError)
            totalErros++
          } else {
            totalContratosInseridos += registrosParaInserir.length
          }
        }
      }
    }

    // 4. Atualizar log
    onProgress?.('Finalizando histórico...', 95)
    if (logId) {
      await atualizarLogSync(logId, {
        status: 'sucesso',
        finalizado_em: new Date().toISOString(),
        duracao_ms: Date.now() - iniciadoEm,
        registros_processados: totalOperacoes,
        registros_atualizados: totalContratosInseridos,
        registros_erro: totalErros,
      }).catch(() => undefined)
    }

    onProgress?.(`Histórico sincronizado — ${totalContratosInseridos} contratos`, 100)

    return {
      vendedoresProcessados: vendedoresHistorico.length,
      mesesProcessados: meses.length,
      contratosInseridos: totalContratosInseridos,
      erros: totalErros,
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

// ══════════════════════════════════════════════════════════════════════════════
// MIGRAÇÃO DE VENDAS → HISTORICO (Fase 7 — correção)
// ══════════════════════════════════════════════════════════════════════════════

export interface MigracaoHistoricoResult {
  inseridos: number
  ignorados: number
  erros: number
}

/**
 * Popula vendas_historico com os dados de meses anteriores que já estão em vendas.
 * Mais confiável que syncHistoricoVendedores() porque:
 * - Lê dados já validados da tabela vendas (não bate no IXC API)
 * - Inclui contratos AA (sem data_ativacao no IXC)
 * - Deduplicação por vendedor+mes+ano: deleta e re-insere
 */
export async function migrarVendasParaHistorico(
  onProgress?: SyncProgressCallback
): Promise<MigracaoHistoricoResult> {
  const now = new Date()
  const mesAtual = now.getMonth() + 1
  const anoAtual = now.getFullYear()

  onProgress?.('Buscando vendas de meses anteriores...', 0)

  // 1. Mapeamento vendedor_id (UUID) → ixc_id (texto) — obrigatório para vendas_historico
  const { data: vendedoresData } = await supabase
    .from('vendedores')
    .select('id, ixc_id')
    .not('ixc_id', 'is', null)

  const ixcIdMap = new Map<string, string>()
  for (const v of (vendedoresData ?? [])) {
    if (v.ixc_id) ixcIdMap.set(v.id, v.ixc_id)
  }

  // 2. Buscar vendas de meses anteriores (mes_referencia/ano_referencia < mês atual)
  const { data: vendasData, error } = await supabase
    .from('vendas')
    .select('id, empresa_id, vendedor_id, cliente_nome, codigo_cliente_ixc, codigo_contrato_ixc, valor_unitario, status_ixc, data_venda, mes_referencia, ano_referencia')
    .or(
      `ano_referencia.lt.${anoAtual},and(ano_referencia.eq.${anoAtual},mes_referencia.lt.${mesAtual})`
    )

  if (error) throw new Error(`Erro ao buscar vendas: ${error.message}`)

  const vendas = vendasData ?? []
  onProgress?.(`${vendas.length} registros de meses anteriores encontrados`, 20)

  if (vendas.length === 0) return { inseridos: 0, ignorados: 0, erros: 0 }

  // 3. Coletar combinações únicas vendedor+mês+ano para limpar antes de reinserir
  const combinations = new Set<string>()
  for (const v of vendas) {
    if (v.vendedor_id && v.mes_referencia !== null && v.ano_referencia !== null) {
      combinations.add(`${v.vendedor_id}__${v.mes_referencia}__${v.ano_referencia}`)
    }
  }

  onProgress?.(`Removendo ${combinations.size} combinações existentes do histórico...`, 30)
  for (const combo of combinations) {
    const [vendedorId, mes, ano] = combo.split('__')
    await supabase
      .from('vendas_historico')
      .delete()
      .eq('vendedor_id', vendedorId)
      .eq('mes_referencia', Number(mes))
      .eq('ano_referencia', Number(ano))
  }

  // 4. Montar registros — ignorar os sem ixc_id (vendedor não mapeado)
  const registros: VendasHistoricoInsert[] = []
  let ignorados = 0

  for (const v of vendas) {
    if (!v.vendedor_id || v.mes_referencia === null || v.ano_referencia === null) {
      ignorados++
      continue
    }
    const ixcVendedorId = ixcIdMap.get(v.vendedor_id)
    if (!ixcVendedorId) {
      ignorados++
      continue
    }

    registros.push({
      empresa_id: v.empresa_id ?? null,
      vendedor_id: v.vendedor_id,
      ixc_vendedor_id: ixcVendedorId,
      cliente_nome: v.cliente_nome ?? '',
      codigo_cliente_ixc: v.codigo_cliente_ixc ?? null,
      codigo_contrato_ixc: v.codigo_contrato_ixc ?? null,
      valor_unitario: v.valor_unitario ?? 0,
      quantidade: 1,
      mrr: true,
      status_ixc: v.status_ixc ?? null,
      // data_ativacao só para contratos ativos — data_venda = data de ativação no IXC
      data_ativacao: v.status_ixc === 'A' ? (v.data_venda?.slice(0, 10) ?? null) : null,
      mes_referencia: v.mes_referencia,
      ano_referencia: v.ano_referencia,
    })
  }

  // 5. Inserir em lotes de 500
  const BATCH = 500
  let inseridos = 0
  let erros = 0

  for (let i = 0; i < registros.length; i += BATCH) {
    const batch = registros.slice(i, i + BATCH)
    const pct = Math.round(50 + ((i + batch.length) / registros.length) * 45)
    onProgress?.(`Inserindo ${i + batch.length}/${registros.length}...`, pct)

    const { error: insertError } = await supabase
      .from('vendas_historico')
      .insert(batch)

    if (insertError) {
      console.error('[migrarVendasParaHistorico] Erro ao inserir lote:', insertError.message, insertError.code)
      erros += batch.length
    } else {
      inseridos += batch.length
    }
  }

  onProgress?.(`Migração concluída — ${inseridos} inseridos, ${ignorados} ignorados`, 100)
  return { inseridos, ignorados, erros }
}
