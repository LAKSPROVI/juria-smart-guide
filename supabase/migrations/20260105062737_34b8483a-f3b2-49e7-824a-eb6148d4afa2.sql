-- PASSO 1: Adicionar colunas user_id nas tabelas que precisam
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.conversas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- PASSO 2: Remover políticas públicas temporárias
DROP POLICY IF EXISTS "Acesso público temporário consultas" ON public.consultas;
DROP POLICY IF EXISTS "Acesso público temporário resultados" ON public.resultados_consultas;
DROP POLICY IF EXISTS "Acesso público temporário cadernos" ON public.cadernos;
DROP POLICY IF EXISTS "Acesso público temporário documentos" ON public.documentos;
DROP POLICY IF EXISTS "Acesso público temporário mensagens" ON public.mensagens;
DROP POLICY IF EXISTS "Acesso público temporário conversas" ON public.conversas;
DROP POLICY IF EXISTS "Acesso público temporário logs" ON public.system_logs;
DROP POLICY IF EXISTS "Acesso público temporário execucoes" ON public.execucoes_agendadas;
DROP POLICY IF EXISTS "Acesso público temporário config_proxy" ON public.config_proxy;
DROP POLICY IF EXISTS "Acesso público temporário chunks" ON public.documento_chunks;
DROP POLICY IF EXISTS "Acesso público query_cache" ON public.query_embeddings_cache;
DROP POLICY IF EXISTS "Acesso público fila_rag" ON public.fila_processamento_rag;
DROP POLICY IF EXISTS "Acesso público temporário config_cadernos" ON public.config_cadernos;

-- PASSO 3: Criar políticas de acesso seguras para CONSULTAS
CREATE POLICY "Users can view own consultas"
ON public.consultas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consultas"
ON public.consultas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consultas"
ON public.consultas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consultas"
ON public.consultas FOR DELETE
USING (auth.uid() = user_id);

-- PASSO 4: Políticas para RESULTADOS_CONSULTAS (via relacionamento com consultas)
CREATE POLICY "Users can view own resultados"
ON public.resultados_consultas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultas 
    WHERE consultas.id = resultados_consultas.consulta_id 
    AND consultas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own resultados"
ON public.resultados_consultas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultas 
    WHERE consultas.id = resultados_consultas.consulta_id 
    AND consultas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own resultados"
ON public.resultados_consultas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultas 
    WHERE consultas.id = resultados_consultas.consulta_id 
    AND consultas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own resultados"
ON public.resultados_consultas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.consultas 
    WHERE consultas.id = resultados_consultas.consulta_id 
    AND consultas.user_id = auth.uid()
  )
);

-- PASSO 5: Políticas para CONVERSAS
CREATE POLICY "Users can view own conversas"
ON public.conversas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversas"
ON public.conversas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversas"
ON public.conversas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversas"
ON public.conversas FOR DELETE
USING (auth.uid() = user_id);

-- PASSO 6: Políticas para MENSAGENS (via relacionamento com conversas)
CREATE POLICY "Users can view own mensagens"
ON public.mensagens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversas 
    WHERE conversas.id = mensagens.conversa_id 
    AND conversas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own mensagens"
ON public.mensagens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversas 
    WHERE conversas.id = mensagens.conversa_id 
    AND conversas.user_id = auth.uid()
  )
);

-- PASSO 7: Políticas para DOCUMENTOS
CREATE POLICY "Users can view own documentos"
ON public.documentos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documentos"
ON public.documentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documentos"
ON public.documentos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documentos"
ON public.documentos FOR DELETE
USING (auth.uid() = user_id);

-- PASSO 8: Políticas para DOCUMENTO_CHUNKS (via relacionamento com documentos)
CREATE POLICY "Users can view own chunks"
ON public.documento_chunks FOR SELECT
USING (
  documento_id IS NULL OR EXISTS (
    SELECT 1 FROM public.documentos 
    WHERE documentos.id = documento_chunks.documento_id 
    AND documentos.user_id = auth.uid()
  )
);

-- Service role pode inserir/atualizar chunks (usado pelas edge functions)
CREATE POLICY "Service role can manage chunks"
ON public.documento_chunks FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- PASSO 9: Políticas para CADERNOS (dados compartilhados entre usuários autenticados)
CREATE POLICY "Authenticated users can view cadernos"
ON public.cadernos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cadernos"
ON public.cadernos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cadernos"
ON public.cadernos FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- PASSO 10: Políticas para CONFIG_CADERNOS (configurações compartilhadas)
CREATE POLICY "Authenticated users can view config_cadernos"
ON public.config_cadernos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage config_cadernos"
ON public.config_cadernos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- PASSO 11: Políticas para CONFIG_PROXY (apenas admins)
CREATE POLICY "Authenticated users can view config_proxy"
ON public.config_proxy FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage config_proxy"
ON public.config_proxy FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- PASSO 12: Políticas para SYSTEM_LOGS (apenas admins)
CREATE POLICY "Admins can view all logs"
ON public.system_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert logs"
ON public.system_logs FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- PASSO 13: Políticas para EXECUCOES_AGENDADAS (via relacionamento com consultas)
CREATE POLICY "Users can view own execucoes"
ON public.execucoes_agendadas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultas 
    WHERE consultas.id = execucoes_agendadas.consulta_id 
    AND consultas.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage execucoes"
ON public.execucoes_agendadas FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- PASSO 14: Políticas para FILA_PROCESSAMENTO_RAG
CREATE POLICY "Authenticated users can view fila_rag"
ON public.fila_processamento_rag FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage fila_rag"
ON public.fila_processamento_rag FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- PASSO 15: Políticas para QUERY_EMBEDDINGS_CACHE
CREATE POLICY "Authenticated users can view cache"
ON public.query_embeddings_cache FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can manage cache"
ON public.query_embeddings_cache FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');