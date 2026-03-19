export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          cpf_cnpj: string | null
          uf: string | null
          produto_id: string | null
          valor_pacote: number
          mrr: boolean
          vendedor_id: string | null
          ativo: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          nome: string
          cpf_cnpj?: string | null
          uf?: string | null
          produto_id?: string | null
          valor_pacote: number
          mrr?: boolean
          vendedor_id?: string | null
          ativo?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          nome?: string
          cpf_cnpj?: string | null
          uf?: string | null
          produto_id?: string | null
          valor_pacote?: number
          mrr?: boolean
          vendedor_id?: string | null
          ativo?: boolean
          created_at?: string | null
        }
        Relationships: []
      }
      cancelamentos: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_cancel: string | null
          id: string
          motivo: string | null
          venda_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_cancel?: string | null
          id?: string
          motivo?: string | null
          venda_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_cancel?: string | null
          id?: string
          motivo?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancelamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ano: number
          id: string
          mes: number
          meta_mensal: number | null
          meta_semanal: number | null
        }
        Insert: {
          ano: number
          id?: string
          mes: number
          meta_mensal?: number | null
          meta_semanal?: number | null
        }
        Update: {
          ano?: number
          id?: string
          mes?: number
          meta_mensal?: number | null
          meta_semanal?: number | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          descricao: string | null
          id: string
          nome: string
          preco_base: number | null
          recorrente: boolean
        }
        Insert: {
          ativo?: boolean | null
          descricao?: string | null
          id?: string
          nome: string
          preco_base?: number | null
          recorrente?: boolean
        }
        Update: {
          ativo?: boolean | null
          descricao?: string | null
          id?: string
          nome?: string
          preco_base?: number | null
          recorrente?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          nome: string | null
          role: string
        }
        Insert: {
          id: string
          nome?: string | null
          role: string
        }
        Update: {
          id?: string
          nome?: string | null
          role?: string
        }
        Relationships: []
      }
      segmentos: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      status_venda: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_cpf_cnpj: string | null
          cliente_nome: string
          cliente_uf: string | null
          comissao_pct: number | null
          comissao_valor: number | null
          created_at: string | null
          created_by: string | null
          data_venda: string
          descricao: string | null
          id: string
          mrr: boolean | null
          produto_id: string | null
          quantidade: number
          segmento_id: string | null
          status_id: string | null
          valor_total: number | null
          valor_unitario: number
          vendedor_id: string | null
        }
        Insert: {
          cliente_cpf_cnpj?: string | null
          cliente_nome: string
          cliente_uf?: string | null
          comissao_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          data_venda?: string
          descricao?: string | null
          id?: string
          mrr?: boolean | null
          produto_id?: string | null
          quantidade?: number
          segmento_id?: string | null
          status_id?: string | null
          valor_unitario?: number
          vendedor_id?: string | null
        }
        Update: {
          cliente_cpf_cnpj?: string | null
          cliente_nome?: string
          cliente_uf?: string | null
          comissao_pct?: number | null
          created_at?: string | null
          created_by?: string | null
          data_venda?: string
          descricao?: string | null
          id?: string
          mrr?: boolean | null
          produto_id?: string | null
          quantidade?: number
          segmento_id?: string | null
          status_id?: string | null
          valor_unitario?: number
          vendedor_id?: string | null
        }
        Relationships: [
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
      vendedores: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          id: string
          meta_mensal: number | null
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          meta_mensal?: number | null
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          meta_mensal?: number | null
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
