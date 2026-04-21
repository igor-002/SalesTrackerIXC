-- Migration: Criar tabela vendas_backup para guardar histórico antes do sync IXC
-- Rodar MANUALMENTE no Supabase SQL Editor antes de ativar o sync automático

-- 1. Criar tabela vendas_backup com estrutura igual a vendas + campos de controle
CREATE TABLE IF NOT EXISTS vendas_backup (
  -- Campos de controle do backup
  backup_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_at timestamptz DEFAULT now() NOT NULL,
  sync_tipo text DEFAULT 'pre_sync' NOT NULL,

  -- Todos os campos originais da tabela vendas
  id uuid,
  empresa_id uuid,
  cliente_nome text,
  cliente_cpf_cnpj text,
  cliente_uf text,
  codigo_cliente_ixc text,
  codigo_contrato_ixc text,
  vendedor_id uuid,
  segmento_id uuid,
  produto_id uuid,
  status_id uuid,
  status_ixc text,
  status_atualizado_em timestamptz,
  dias_em_aa integer,
  quantidade integer,
  valor_unitario numeric,
  valor_total numeric,
  comissao_pct numeric,
  comissao_valor numeric,
  mrr boolean,
  data_venda date,
  descricao text,
  produtos jsonb,
  created_at timestamptz,
  created_by uuid
);

-- 2. Índices para consultas de histórico
CREATE INDEX IF NOT EXISTS idx_vendas_backup_backup_at
  ON vendas_backup(backup_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendas_backup_empresa_id
  ON vendas_backup(empresa_id);

CREATE INDEX IF NOT EXISTS idx_vendas_backup_sync_tipo
  ON vendas_backup(sync_tipo);

-- 3. RLS para segurança
ALTER TABLE vendas_backup ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ver backups da sua empresa
CREATE POLICY "Usuários podem ver backups da empresa"
  ON vendas_backup
  FOR SELECT
  TO authenticated
  USING (empresa_id = auth.jwt() ->> 'empresa_id'::text);

-- Política: apenas sistema pode inserir (via service role ou trigger)
CREATE POLICY "Sistema pode inserir backups"
  ON vendas_backup
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Comentários para documentação
COMMENT ON TABLE vendas_backup IS 'Histórico de backups da tabela vendas antes de cada sync completo do IXC';
COMMENT ON COLUMN vendas_backup.backup_at IS 'Timestamp do momento do backup';
COMMENT ON COLUMN vendas_backup.sync_tipo IS 'Tipo do sync que gerou o backup: pre_sync, manual, etc';

-- 5. Função helper para fazer backup antes do sync
CREATE OR REPLACE FUNCTION fn_backup_vendas_before_sync(p_empresa_id uuid, p_sync_tipo text DEFAULT 'pre_sync')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO vendas_backup (
    id, empresa_id, cliente_nome, cliente_cpf_cnpj, cliente_uf,
    codigo_cliente_ixc, codigo_contrato_ixc, vendedor_id, segmento_id,
    produto_id, status_id, status_ixc, status_atualizado_em, dias_em_aa,
    quantidade, valor_unitario, valor_total, comissao_pct, comissao_valor,
    mrr, data_venda, descricao, produtos, created_at, created_by,
    backup_at, sync_tipo
  )
  SELECT
    v.id, v.empresa_id, v.cliente_nome, v.cliente_cpf_cnpj, v.cliente_uf,
    v.codigo_cliente_ixc, v.codigo_contrato_ixc, v.vendedor_id, v.segmento_id,
    v.produto_id, v.status_id, v.status_ixc, v.status_atualizado_em, v.dias_em_aa,
    v.quantidade, v.valor_unitario, v.valor_total, v.comissao_pct, v.comissao_valor,
    v.mrr, v.data_venda, v.descricao, v.produtos, v.created_at, v.created_by,
    now(), p_sync_tipo
  FROM vendas v
  WHERE v.empresa_id = p_empresa_id OR p_empresa_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION fn_backup_vendas_before_sync IS 'Faz backup de todas as vendas de uma empresa antes do sync IXC';
