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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cadernos: {
        Row: {
          arquivado: boolean | null
          created_at: string
          data: string
          erro_mensagem: string | null
          excluido_em: string | null
          id: string
          processado_rag: boolean | null
          status: string
          tamanho_bytes: number | null
          tipo: string
          total_publicacoes: number | null
          tribunal: string
          updated_at: string
          url_arquivo: string | null
        }
        Insert: {
          arquivado?: boolean | null
          created_at?: string
          data: string
          erro_mensagem?: string | null
          excluido_em?: string | null
          id?: string
          processado_rag?: boolean | null
          status?: string
          tamanho_bytes?: number | null
          tipo: string
          total_publicacoes?: number | null
          tribunal: string
          updated_at?: string
          url_arquivo?: string | null
        }
        Update: {
          arquivado?: boolean | null
          created_at?: string
          data?: string
          erro_mensagem?: string | null
          excluido_em?: string | null
          id?: string
          processado_rag?: boolean | null
          status?: string
          tamanho_bytes?: number | null
          tipo?: string
          total_publicacoes?: number | null
          tribunal?: string
          updated_at?: string
          url_arquivo?: string | null
        }
        Relationships: []
      }
      config_cadernos: {
        Row: {
          arquivado: boolean | null
          ativo: boolean | null
          created_at: string
          excluido_em: string | null
          horarios: string[] | null
          id: string
          processar_automaticamente: boolean | null
          tipos: string[] | null
          tribunal: string
          updated_at: string
        }
        Insert: {
          arquivado?: boolean | null
          ativo?: boolean | null
          created_at?: string
          excluido_em?: string | null
          horarios?: string[] | null
          id?: string
          processar_automaticamente?: boolean | null
          tipos?: string[] | null
          tribunal: string
          updated_at?: string
        }
        Update: {
          arquivado?: boolean | null
          ativo?: boolean | null
          created_at?: string
          excluido_em?: string | null
          horarios?: string[] | null
          id?: string
          processar_automaticamente?: boolean | null
          tipos?: string[] | null
          tribunal?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_proxy: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string
          status_ultimo_teste: string | null
          token: string | null
          ultima_verificacao: string | null
          updated_at: string
          url_base: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
          status_ultimo_teste?: string | null
          token?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
          url_base?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
          status_ultimo_teste?: string | null
          token?: string | null
          ultima_verificacao?: string | null
          updated_at?: string
          url_base?: string | null
        }
        Relationships: []
      }
      consultas: {
        Row: {
          arquivado: boolean | null
          ativo: boolean | null
          created_at: string
          data_final: string | null
          data_inicial: string | null
          excluido_em: string | null
          horarios: string[] | null
          id: string
          nome: string
          numero_oab: string | null
          recorrencia: string
          termo: string
          tipo: string
          tribunal: string
          uf_oab: string | null
          ultima_execucao: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          arquivado?: boolean | null
          ativo?: boolean | null
          created_at?: string
          data_final?: string | null
          data_inicial?: string | null
          excluido_em?: string | null
          horarios?: string[] | null
          id?: string
          nome: string
          numero_oab?: string | null
          recorrencia?: string
          termo: string
          tipo: string
          tribunal: string
          uf_oab?: string | null
          ultima_execucao?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          arquivado?: boolean | null
          ativo?: boolean | null
          created_at?: string
          data_final?: string | null
          data_inicial?: string | null
          excluido_em?: string | null
          horarios?: string[] | null
          id?: string
          nome?: string
          numero_oab?: string | null
          recorrencia?: string
          termo?: string
          tipo?: string
          tribunal?: string
          uf_oab?: string | null
          ultima_execucao?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversas: {
        Row: {
          arquivado: boolean | null
          created_at: string
          excluido_em: string | null
          id: string
          titulo: string
          ultima_mensagem: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          arquivado?: boolean | null
          created_at?: string
          excluido_em?: string | null
          id?: string
          titulo: string
          ultima_mensagem?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          arquivado?: boolean | null
          created_at?: string
          excluido_em?: string | null
          id?: string
          titulo?: string
          ultima_mensagem?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      documento_chunks: {
        Row: {
          chunk_index: number
          chunk_type: string | null
          conteudo: string
          contexto_resumo: string | null
          created_at: string
          documento_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          numero_processo: string | null
          pagina_fim: number | null
          pagina_inicio: number | null
          parent_chunk_id: string | null
          search_vector: unknown
          titulo_secao: string | null
          tokens_count: number | null
        }
        Insert: {
          chunk_index: number
          chunk_type?: string | null
          conteudo: string
          contexto_resumo?: string | null
          created_at?: string
          documento_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          numero_processo?: string | null
          pagina_fim?: number | null
          pagina_inicio?: number | null
          parent_chunk_id?: string | null
          search_vector?: unknown
          titulo_secao?: string | null
          tokens_count?: number | null
        }
        Update: {
          chunk_index?: number
          chunk_type?: string | null
          conteudo?: string
          contexto_resumo?: string | null
          created_at?: string
          documento_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          numero_processo?: string | null
          pagina_fim?: number | null
          pagina_inicio?: number | null
          parent_chunk_id?: string | null
          search_vector?: unknown
          titulo_secao?: string | null
          tokens_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_chunks_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_chunks_parent_chunk_id_fkey"
            columns: ["parent_chunk_id"]
            isOneToOne: false
            referencedRelation: "documento_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivado: boolean | null
          caderno_id: string | null
          conteudo_texto: string | null
          created_at: string
          embedding_processado: boolean | null
          erro_mensagem: string | null
          excluido_em: string | null
          id: string
          nome: string
          origem: string
          status: string
          tags: string[] | null
          tamanho_bytes: number | null
          tipo: string
          tribunal: string | null
          updated_at: string
          url_arquivo: string | null
          user_id: string | null
        }
        Insert: {
          arquivado?: boolean | null
          caderno_id?: string | null
          conteudo_texto?: string | null
          created_at?: string
          embedding_processado?: boolean | null
          erro_mensagem?: string | null
          excluido_em?: string | null
          id?: string
          nome: string
          origem?: string
          status?: string
          tags?: string[] | null
          tamanho_bytes?: number | null
          tipo: string
          tribunal?: string | null
          updated_at?: string
          url_arquivo?: string | null
          user_id?: string | null
        }
        Update: {
          arquivado?: boolean | null
          caderno_id?: string | null
          conteudo_texto?: string | null
          created_at?: string
          embedding_processado?: boolean | null
          erro_mensagem?: string | null
          excluido_em?: string | null
          id?: string
          nome?: string
          origem?: string
          status?: string
          tags?: string[] | null
          tamanho_bytes?: number | null
          tipo?: string
          tribunal?: string | null
          updated_at?: string
          url_arquivo?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_caderno_id_fkey"
            columns: ["caderno_id"]
            isOneToOne: false
            referencedRelation: "cadernos"
            referencedColumns: ["id"]
          },
        ]
      }
      execucoes_agendadas: {
        Row: {
          consulta_id: string | null
          created_at: string
          duracao_ms: number | null
          erro_mensagem: string | null
          horario_agendado: string
          horario_executado: string | null
          id: string
          origem: string | null
          resultados_encontrados: number | null
          status: string | null
        }
        Insert: {
          consulta_id?: string | null
          created_at?: string
          duracao_ms?: number | null
          erro_mensagem?: string | null
          horario_agendado: string
          horario_executado?: string | null
          id?: string
          origem?: string | null
          resultados_encontrados?: number | null
          status?: string | null
        }
        Update: {
          consulta_id?: string | null
          created_at?: string
          duracao_ms?: number | null
          erro_mensagem?: string | null
          horario_agendado?: string
          horario_executado?: string | null
          id?: string
          origem?: string | null
          resultados_encontrados?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execucoes_agendadas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      fila_processamento_rag: {
        Row: {
          caderno_id: string | null
          chunks_processados: number | null
          created_at: string | null
          documento_id: string | null
          erro_mensagem: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          prioridade: number | null
          progresso: number | null
          status: string | null
          total_chunks: number | null
        }
        Insert: {
          caderno_id?: string | null
          chunks_processados?: number | null
          created_at?: string | null
          documento_id?: string | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          prioridade?: number | null
          progresso?: number | null
          status?: string | null
          total_chunks?: number | null
        }
        Update: {
          caderno_id?: string | null
          chunks_processados?: number | null
          created_at?: string | null
          documento_id?: string | null
          erro_mensagem?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          prioridade?: number | null
          progresso?: number | null
          status?: string | null
          total_chunks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fila_processamento_rag_caderno_id_fkey"
            columns: ["caderno_id"]
            isOneToOne: false
            referencedRelation: "cadernos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fila_processamento_rag_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens: {
        Row: {
          content: string
          conversa_id: string | null
          created_at: string
          fontes: Json | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversa_id?: string | null
          created_at?: string
          fontes?: Json | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversa_id?: string | null
          created_at?: string
          fontes?: Json | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      query_embeddings_cache: {
        Row: {
          created_at: string | null
          embedding: string | null
          hit_count: number | null
          id: string
          last_used_at: string | null
          query_hash: string | null
          query_text: string
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          hit_count?: number | null
          id?: string
          last_used_at?: string | null
          query_hash?: string | null
          query_text: string
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          hit_count?: number | null
          id?: string
          last_used_at?: string | null
          query_hash?: string | null
          query_text?: string
        }
        Relationships: []
      }
      resultados_consultas: {
        Row: {
          arquivado: boolean | null
          consulta_id: string | null
          created_at: string
          dados_completos: Json | null
          data_disponibilizacao: string | null
          data_publicacao: string | null
          destinatarios: Json | null
          excluido_em: string | null
          id: string
          nome_orgao: string | null
          numero_processo: string | null
          sigla_tribunal: string | null
          texto_mensagem: string | null
          tipo_comunicacao: string | null
          visualizado: boolean | null
        }
        Insert: {
          arquivado?: boolean | null
          consulta_id?: string | null
          created_at?: string
          dados_completos?: Json | null
          data_disponibilizacao?: string | null
          data_publicacao?: string | null
          destinatarios?: Json | null
          excluido_em?: string | null
          id?: string
          nome_orgao?: string | null
          numero_processo?: string | null
          sigla_tribunal?: string | null
          texto_mensagem?: string | null
          tipo_comunicacao?: string | null
          visualizado?: boolean | null
        }
        Update: {
          arquivado?: boolean | null
          consulta_id?: string | null
          created_at?: string
          dados_completos?: Json | null
          data_disponibilizacao?: string | null
          data_publicacao?: string | null
          destinatarios?: Json | null
          excluido_em?: string | null
          id?: string
          nome_orgao?: string | null
          numero_processo?: string | null
          sigla_tribunal?: string | null
          texto_mensagem?: string | null
          tipo_comunicacao?: string | null
          visualizado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "resultados_consultas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          duracao_ms: number | null
          entidade_id: string | null
          entidade_tipo: string | null
          erro_mensagem: string | null
          id: string
          ip_origem: string | null
          origem: string | null
          status: string | null
          tipo: string
          user_agent: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          duracao_ms?: number | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          erro_mensagem?: string | null
          id?: string
          ip_origem?: string | null
          origem?: string | null
          status?: string | null
          tipo: string
          user_agent?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          duracao_ms?: number | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          erro_mensagem?: string | null
          id?: string
          ip_origem?: string | null
          origem?: string | null
          status?: string | null
          tipo?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_autorizados: {
        Row: {
          autorizado: boolean | null
          autorizado_em: string | null
          autorizado_por: string | null
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          autorizado?: boolean | null
          autorizado_em?: string | null
          autorizado_por?: string | null
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          autorizado?: boolean | null
          autorizado_em?: string | null
          autorizado_por?: string | null
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      busca_hibrida_rag: {
        Args: {
          filtro_documento_id?: string
          filtro_numero_processo?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
          query_text: string
        }
        Returns: {
          combined_score: number
          conteudo: string
          contexto_resumo: string
          documento_id: string
          id: string
          metadata: Json
          numero_processo: string
          pagina_inicio: number
          similarity: number
          text_rank: number
          titulo_secao: string
        }[]
      }
      busca_vetorial_rag: {
        Args: {
          filtro_documento_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          conteudo: string
          contexto_resumo: string
          documento_id: string
          id: string
          metadata: Json
          numero_processo: string
          similarity: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_authorized: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
