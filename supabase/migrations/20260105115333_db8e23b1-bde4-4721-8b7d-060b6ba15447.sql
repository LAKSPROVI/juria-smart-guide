-- Remover políticas de service_role que não funcionam corretamente
DROP POLICY IF EXISTS "Service role can manage chunks" ON public.documento_chunks;
DROP POLICY IF EXISTS "Service role can manage fila_rag" ON public.fila_processamento_rag;
DROP POLICY IF EXISTS "Service role can manage cache" ON public.query_embeddings_cache;
DROP POLICY IF EXISTS "Service role can manage execucoes" ON public.execucoes_agendadas;
DROP POLICY IF EXISTS "Service role can insert logs" ON public.system_logs;

-- Adicionar política para inserção de cache por usuários autenticados
CREATE POLICY "Authenticated users can manage cache" 
ON public.query_embeddings_cache 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Adicionar política para execuções agendadas
CREATE POLICY "Authenticated users can insert execucoes" 
ON public.execucoes_agendadas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update execucoes" 
ON public.execucoes_agendadas 
FOR UPDATE 
TO authenticated
USING (true);