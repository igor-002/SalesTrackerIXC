export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cancelamentos: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_cancel: string | null
          empresa_id: string
          id: string
          motivo: string | null
          venda_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_cancel?: string | null
          empresa_id?: string
          id?: string
          motivo?: string | null
          venda_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_cancel?: string | null
          empresa_id?: string
          id?: string
          motivo?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancelamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cpf_cnpj: string | null
          created_at: string | null
          empresa_id: string
          id: string
          mrr: boolean
          nome: string
          produto_id: string | null
          uf: string | null
          valor_pacote: number
          vendedor_id: string | null
        }
        Insert: {
          ativo?: boolean
          cpf_cnpj?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          mrr?: boolean
          nome: string
          produto_id?: string | null
          uf?: string | null
          valor_pacote?: number
          vendedor_id?: string | null
        }
        Update: {
          ativo?: boolean
          cpf_cnpj?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          mrr?: boolean
          nome?: string
          produto_id?: string | null
          uf?: string | null
          valor_pacote?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          ano: number
          empresa_id: string
          id: string
          mes: number
          meta_mensal: number | null
          meta_semanal: number | null
        }
        Insert: {
          ano: number
          empresa_id?: string
          id?: string
          mes: number
          meta_mensal?: number | null
          meta_semanal?: number | null
        }
        Update: {
          ano?: number
          empresa_id?: string
          id?: string
          mes?: number
          meta_mensal?: number | null
          meta_semanal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_vendedor: {
        Row: {
          ano: number
          created_at: string | null
          empresa_id: string
          id: string
          mes: number
          meta_contratos: number
          vendedor_id: string
        }
        Insert: {
          ano: number
          created_at?: string | null
          empresa_id?: string
          id?: string
          mes: number
          meta_contratos?: number
          vendedor_id: string
        }
        Update: {
          ano?: number
          created_at?: string | null
          empresa_id?: string
          id?: string
          mes?: number
          meta_contratos?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_vendedor_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          preco_base: number | null
          recorrente: boolean
        }
        Insert: {
          ativo?: boolean | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome: string
          preco_base?: number | null
          recorrente?: boolean
        }
        Update: {
          ativo?: boolean | null
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          preco_base?: number | null
          recorrente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          empresa_id: string
          id: string
          nome: string | null
          role: string
        }
        Insert: {
          empresa_id?: string
          id: string
          nome?: string | null
          role: string
        }
        Update: {
          empresa_id?: string
          id?: string
          nome?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentos: {
        Row: {
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          empresa_id?: string
          id?: string
          nome: string
        }
        Update: {
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "segmentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      status_venda: {
        Row: {
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          empresa_id?: string
          id?: string
          nome: string
        }
        Update: {
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_venda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          duracao_ms: number | null
          empresa_id: string
          erro_mensagem: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          registros_atualizados: number | null
          registros_erro: number | null
          registros_processados: number | null
          status: string
          tipo: string
        }
        Insert: {
          duracao_ms?: number | null
          empresa_id?: string
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          registros_atualizados?: number | null
          registros_erro?: number | null
          registros_processados?: number | null
          status: string
          tipo: string
        }
        Update: {
          duracao_ms?: number | null
          empresa_id?: string
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          registros_atualizados?: number | null
          registros_erro?: number | null
          registros_processados?: number | null
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          email: string
          id: string
          id_vendedor_ixc: string | null
          nome: string
          permissoes: Json | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          email: string
          id?: string
          id_vendedor_ixc?: string | null
          nome: string
          permissoes?: Json | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          email?: string
          id?: string
          id_vendedor_ixc?: string | null
          nome?: string
          permissoes?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      vendas_unicas: {
        Row: {
          id: string
          empresa_id: string
          vendedor_id: string | null
          cliente_nome: string
          codigo_cliente_ixc: string | null
          id_venda_ixc: string | null
          descricao: string | null
          valor_total: number
          data_venda: string
          status: string
          parcelas: number | null
          ids_areceber: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          empresa_id?: string
          vendedor_id?: string | null
          cliente_nome: string
          codigo_cliente_ixc?: string | null
          id_venda_ixc?: string | null
          descricao?: string | null
          valor_total: number
          data_venda: string
          status?: string
          parcelas?: number | null
          ids_areceber?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string
          vendedor_id?: string | null
          cliente_nome?: string
          codigo_cliente_ixc?: string | null
          id_venda_ixc?: string | null
          descricao?: string | null
          valor_total?: number
          data_venda?: string
          status?: string
          parcelas?: number | null
          ids_areceber?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_unicas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_unicas_parcelas: {
        Row: {
          id: string
          venda_unica_id: string
          id_areceber_ixc: string | null
          numero_parcela: number
          valor: number
          data_vencimento: string
          status_pagamento: string
          valor_pago: number | null
          data_pagamento: string | null
          ultima_atualizacao: string | null
        }
        Insert: {
          id?: string
          venda_unica_id: string
          id_areceber_ixc?: string | null
          numero_parcela: number
          valor: number
          data_vencimento: string
          status_pagamento?: string
          valor_pago?: number | null
          data_pagamento?: string | null
          ultima_atualizacao?: string | null
        }
        Update: {
          id?: string
          venda_unica_id?: string
          id_areceber_ixc?: string | null
          numero_parcela?: number
          valor?: number
          data_vencimento?: string
          status_pagamento?: string
          valor_pago?: number | null
          data_pagamento?: string | null
          ultima_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_unicas_parcelas_venda_unica_id_fkey"
            columns: ["venda_unica_id"]
            isOneToOne: false
            referencedRelation: "vendas_unicas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cliente_cpf_cnpj: string | null
          cliente_nome: string
          cliente_uf: string | null
          codigo_cliente_ixc: string | null
          codigo_contrato_ixc: string | null
          comissao_pct: number | null
          comissao_valor: number | null
          created_at: string | null
          created_by: string | null
          data_venda: string
          descricao: string | null
          dias_aguardando: number | null
          dias_em_aa: number | null
          empresa_id: string
          id: string
          mes_referencia: number | null
          ano_referencia: number | null
          tags: string[] | null
          mrr: boolean | null
          produto_id: string | null
          produtos: Json | null
          quantidade: number
          segmento_id: string | null
          status_atualizado_em: string | null
          status_id: string | null
          status_ixc: string | null
          valor_total: number | null
          valor_unitario: number
          vendedor_id: string | null
        }
        Insert: {
          cliente_cpf_cnpj?: string | null
          cliente_nome: string
          cliente_uf?: string | null
          codigo_cliente_ixc?: string | null
          codigo_contrato_ixc?: string | null
          comissao_pct?: number | null
          comissao_valor?: number | null
          created_at?: string | null
          created_by?: string | null
          data_venda?: string
          descricao?: string | null
          dias_aguardando?: number | null
          dias_em_aa?: number | null
          empresa_id?: string
          id?: string
          mes_referencia?: number | null
          ano_referencia?: number | null
          tags?: string | null
          mrr?: boolean | null
          produto_id?: string | null
          produtos?: Json | null
          quantidade?: number
          segmento_id?: string | null
          status_atualizado_em?: string | null
          status_id?: string | null
          status_ixc?: string | null
          valor_total?: number | null
          valor_unitario?: number
          vendedor_id?: string | null
        }
        Update: {
          cliente_cpf_cnpj?: string | null
          cliente_nome?: string
          cliente_uf?: string | null
          codigo_cliente_ixc?: string | null
          codigo_contrato_ixc?: string | null
          comissao_pct?: number | null
          comissao_valor?: number | null
          created_at?: string | null
          created_by?: string | null
          data_venda?: string
          descricao?: string | null
          dias_aguardando?: number | null
          dias_em_aa?: number | null
          empresa_id?: string
          id?: string
          mes_referencia?: number | null
          ano_referencia?: number | null
          tags?: string | null
          mrr?: boolean | null
          produto_id?: string | null
          produtos?: Json | null
          quantidade?: number
          segmento_id?: string | null
          status_atualizado_em?: string | null
          status_id?: string | null
          status_ixc?: string | null
          valor_total?: number | null
          valor_unitario?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_venda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_historico: {
        Row: {
          id: string
          empresa_id: string | null
          vendedor_id: string | null
          ixc_vendedor_id: string
          cliente_nome: string
          cliente_cpf_cnpj: string | null
          codigo_cliente_ixc: string | null
          codigo_contrato_ixc: string | null
          plano: string | null
          valor_unitario: number | null
          quantidade: number | null
          mrr: boolean | null
          status_ixc: string | null
          data_ativacao: string | null
          mes_referencia: number
          ano_referencia: number
          filial_id: string | null
          created_at: string | null
          ultima_atualizacao: string | null
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          vendedor_id?: string | null
          ixc_vendedor_id: string
          cliente_nome: string
          cliente_cpf_cnpj?: string | null
          codigo_cliente_ixc?: string | null
          codigo_contrato_ixc?: string | null
          plano?: string | null
          valor_unitario?: number | null
          quantidade?: number | null
          mrr?: boolean | null
          status_ixc?: string | null
          data_ativacao?: string | null
          mes_referencia: number
          ano_referencia: number
          filial_id?: string | null
          created_at?: string | null
          ultima_atualizacao?: string | null
        }
        Update: {
          id?: string
          empresa_id?: string | null
          vendedor_id?: string | null
          ixc_vendedor_id?: string
          cliente_nome?: string
          cliente_cpf_cnpj?: string | null
          codigo_cliente_ixc?: string | null
          codigo_contrato_ixc?: string | null
          plano?: string | null
          valor_unitario?: number | null
          quantidade?: number | null
          mrr?: boolean | null
          status_ixc?: string | null
          data_ativacao?: string | null
          mes_referencia?: number
          ano_referencia?: number
          filial_id?: string | null
          created_at?: string | null
          ultima_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_historico_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedores: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          empresa_id: string
          id: string
          incluir_historico: boolean | null
          ixc_id: string | null
          meta_mensal: number | null
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          incluir_historico?: boolean | null
          ixc_id?: string | null
          meta_mensal?: number | null
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          incluir_historico?: boolean | null
          ixc_id?: string | null
          meta_mensal?: number | null
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_empresa_id: { Args: never; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
