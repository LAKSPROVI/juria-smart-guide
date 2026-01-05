-- Corrigir políticas RLS para permitir operações do sistema
-- O problema é que edge functions com service_role key bypassam RLS automaticamente
-- Mas algumas operações precisam de políticas mais permissivas

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Service role can insert logs" ON public.system_logs;
DROP POLICY IF EXISTS "Service role can manage fila_rag" ON public.fila_processamento_rag;
DROP POLICY IF EXISTS "Service role can manage chunks" ON public.documento_chunks;

-- Adicionar políticas para permitir inserção de logs por usuários autenticados
CREATE POLICY "Authenticated users can insert logs" 
ON public.system_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Permitir que usuários autenticados gerenciem fila_rag dos seus documentos
CREATE POLICY "Users can insert fila_rag" 
ON public.fila_processamento_rag 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update fila_rag" 
ON public.fila_processamento_rag 
FOR UPDATE 
TO authenticated
USING (true);

-- Permitir que usuários autenticados insiram chunks
CREATE POLICY "Users can insert chunks" 
ON public.documento_chunks 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update chunks" 
ON public.documento_chunks 
FOR UPDATE 
TO authenticated
USING (
  documento_id IS NULL OR 
  EXISTS (SELECT 1 FROM documentos WHERE documentos.id = documento_chunks.documento_id AND documentos.user_id = auth.uid())
);

-- Garantir que documentos possam ser atualizados pelo próprio usuário
DROP POLICY IF EXISTS "Users can update own documentos" ON public.documentos;
CREATE POLICY "Users can update own documentos" 
ON public.documentos 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Corrigir política de inserção de documentos para verificar user_id
DROP POLICY IF EXISTS "Users can insert own documentos" ON public.documentos;
CREATE POLICY "Users can insert own documentos" 
ON public.documentos 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Corrigir políticas de mensagens e conversas
DROP POLICY IF EXISTS "Users can insert own mensagens" ON public.mensagens;
CREATE POLICY "Users can insert own mensagens" 
ON public.mensagens 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM conversas WHERE conversas.id = conversa_id AND conversas.user_id = auth.uid())
);

-- Garantir que conversas podem ser atualizadas
DROP POLICY IF EXISTS "Users can update own conversas" ON public.conversas;
CREATE POLICY "Users can update own conversas" 
ON public.conversas 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);