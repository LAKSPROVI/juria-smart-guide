-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Adicionar coluna de embedding na tabela documento_chunks (1536 dimensões para compatibilidade)
ALTER TABLE public.documento_chunks 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Adicionar colunas para Contextual Retrieval e metadados avançados
ALTER TABLE public.documento_chunks 
ADD COLUMN IF NOT EXISTS contexto_resumo text,
ADD COLUMN IF NOT EXISTS tokens_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_chunk_id uuid REFERENCES public.documento_chunks(id),
ADD COLUMN IF NOT EXISTS chunk_type text DEFAULT 'content',
ADD COLUMN IF NOT EXISTS titulo_secao text,
ADD COLUMN IF NOT EXISTS pagina_inicio integer,
ADD COLUMN IF NOT EXISTS pagina_fim integer;

-- 4. Criar índice vetorial HNSW para busca rápida
CREATE INDEX IF NOT EXISTS idx_documento_chunks_embedding 
ON public.documento_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Criar índice GIN para busca full-text (BM25-like)
ALTER TABLE public.documento_chunks 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(conteudo, '') || ' ' || coalesce(contexto_resumo, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_documento_chunks_search 
ON public.documento_chunks 
USING gin(search_vector);

-- 6. Criar índice para filtros comuns
CREATE INDEX IF NOT EXISTS idx_documento_chunks_documento_id ON public.documento_chunks(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_chunks_numero_processo ON public.documento_chunks(numero_processo);
CREATE INDEX IF NOT EXISTS idx_documento_chunks_tipo ON public.documento_chunks(chunk_type);

-- 7. Função de busca híbrida (vetorial + full-text)
CREATE OR REPLACE FUNCTION public.busca_hibrida_rag(
    query_embedding vector(768),
    query_text text,
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 20,
    filtro_documento_id uuid DEFAULT NULL,
    filtro_numero_processo text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    documento_id uuid,
    conteudo text,
    contexto_resumo text,
    numero_processo text,
    metadata jsonb,
    titulo_secao text,
    pagina_inicio integer,
    similarity float,
    text_rank float,
    combined_score float
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH vector_search AS (
        SELECT 
            dc.id,
            dc.documento_id,
            dc.conteudo,
            dc.contexto_resumo,
            dc.numero_processo,
            dc.metadata,
            dc.titulo_secao,
            dc.pagina_inicio,
            1 - (dc.embedding <=> query_embedding) as similarity,
            0::float as text_rank
        FROM documento_chunks dc
        WHERE dc.embedding IS NOT NULL
            AND (filtro_documento_id IS NULL OR dc.documento_id = filtro_documento_id)
            AND (filtro_numero_processo IS NULL OR dc.numero_processo ILIKE '%' || filtro_numero_processo || '%')
            AND 1 - (dc.embedding <=> query_embedding) > match_threshold
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    text_search AS (
        SELECT 
            dc.id,
            dc.documento_id,
            dc.conteudo,
            dc.contexto_resumo,
            dc.numero_processo,
            dc.metadata,
            dc.titulo_secao,
            dc.pagina_inicio,
            0::float as similarity,
            ts_rank_cd(dc.search_vector, plainto_tsquery('portuguese', query_text)) as text_rank
        FROM documento_chunks dc
        WHERE dc.search_vector @@ plainto_tsquery('portuguese', query_text)
            AND (filtro_documento_id IS NULL OR dc.documento_id = filtro_documento_id)
            AND (filtro_numero_processo IS NULL OR dc.numero_processo ILIKE '%' || filtro_numero_processo || '%')
        ORDER BY text_rank DESC
        LIMIT match_count * 2
    ),
    combined AS (
        SELECT 
            COALESCE(v.id, t.id) as id,
            COALESCE(v.documento_id, t.documento_id) as documento_id,
            COALESCE(v.conteudo, t.conteudo) as conteudo,
            COALESCE(v.contexto_resumo, t.contexto_resumo) as contexto_resumo,
            COALESCE(v.numero_processo, t.numero_processo) as numero_processo,
            COALESCE(v.metadata, t.metadata) as metadata,
            COALESCE(v.titulo_secao, t.titulo_secao) as titulo_secao,
            COALESCE(v.pagina_inicio, t.pagina_inicio) as pagina_inicio,
            COALESCE(v.similarity, 0) as similarity,
            COALESCE(t.text_rank, 0) as text_rank,
            -- Score combinado: 70% vetorial + 30% texto
            (COALESCE(v.similarity, 0) * 0.7 + COALESCE(t.text_rank, 0) * 0.3) as combined_score
        FROM vector_search v
        FULL OUTER JOIN text_search t ON v.id = t.id
    )
    SELECT * FROM combined
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$;

-- 8. Função para busca apenas vetorial (para re-ranking)
CREATE OR REPLACE FUNCTION public.busca_vetorial_rag(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10,
    filtro_documento_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    documento_id uuid,
    conteudo text,
    contexto_resumo text,
    numero_processo text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.id,
        dc.documento_id,
        dc.conteudo,
        dc.contexto_resumo,
        dc.numero_processo,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM documento_chunks dc
    WHERE dc.embedding IS NOT NULL
        AND (filtro_documento_id IS NULL OR dc.documento_id = filtro_documento_id)
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 9. Tabela para cache de embeddings de queries frequentes
CREATE TABLE IF NOT EXISTS public.query_embeddings_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text text NOT NULL,
    query_hash text GENERATED ALWAYS AS (md5(lower(trim(query_text)))) STORED,
    embedding vector(768),
    hit_count integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    last_used_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_query_cache_hash ON public.query_embeddings_cache(query_hash);

-- 10. Tabela para fila de processamento de documentos
CREATE TABLE IF NOT EXISTS public.fila_processamento_rag (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id uuid REFERENCES public.documentos(id) ON DELETE CASCADE,
    caderno_id uuid REFERENCES public.cadernos(id) ON DELETE CASCADE,
    prioridade integer DEFAULT 5,
    status text DEFAULT 'pendente',
    progresso integer DEFAULT 0,
    total_chunks integer DEFAULT 0,
    chunks_processados integer DEFAULT 0,
    erro_mensagem text,
    iniciado_em timestamptz,
    finalizado_em timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fila_status ON public.fila_processamento_rag(status);
CREATE INDEX IF NOT EXISTS idx_fila_prioridade ON public.fila_processamento_rag(prioridade DESC, created_at ASC);

-- 11. Habilitar RLS nas novas tabelas
ALTER TABLE public.query_embeddings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_processamento_rag ENABLE ROW LEVEL SECURITY;

-- Políticas temporárias (acesso público)
CREATE POLICY "Acesso público query_cache" ON public.query_embeddings_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público fila_rag" ON public.fila_processamento_rag FOR ALL USING (true) WITH CHECK (true);