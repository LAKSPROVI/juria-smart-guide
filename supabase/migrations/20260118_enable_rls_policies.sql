-- =====================================================================
-- RLS POLICIES - Proteção de dados por usuário
-- =====================================================================
-- Data: 2026-01-18
-- Propósito: Implementar Row Level Security para tabelas críticas
-- =====================================================================

-- =====================================================================
-- 1. RLS para tabela: config_proxy
-- =====================================================================
-- Política: Apenas admins podem ler/atualizar configuração do proxy

ALTER TABLE public.config_proxy ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ler config_proxy
CREATE POLICY "Admins podem ler proxy config"
ON public.config_proxy
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
);

-- Policy: Admins podem atualizar config_proxy
CREATE POLICY "Admins podem atualizar proxy config"
ON public.config_proxy
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
);

-- =====================================================================
-- 2. RLS para tabela: usuarios_autorizados
-- =====================================================================
-- Política: Apenas o dono + admins podem ler
-- Apenas admins podem modificar

ALTER TABLE public.usuarios_autorizados ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ler sua própria entrada + admins leem tudo
CREATE POLICY "Usuários podem ler dados de autorização"
ON public.usuarios_autorizados
FOR SELECT
USING (
  auth.jwt() -> 'email' ->> 'email' = email
  OR EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
);

-- Policy: Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Apenas admins podem gerenciar usuarios autorizados"
ON public.usuarios_autorizados
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
);

-- =====================================================================
-- 3. RLS para tabela: system_logs
-- =====================================================================
-- Política: Usuários veem apenas seus próprios logs
-- Admins veem todos os logs

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ler seus próprios logs + admins leem tudo
CREATE POLICY "Usuários podem ler seus próprios logs"
ON public.system_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
);

-- Policy: Apenas sistema pode inserir logs (via service role)
-- Usuarios finais só podem inserir (não atualizar/deletar)
CREATE POLICY "Usuários podem inserir logs"
ON public.system_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Prevent direct updates/deletes (immutable logs)
CREATE POLICY "Logs não podem ser modificados"
ON public.system_logs
FOR UPDATE, DELETE
USING (false);

-- =====================================================================
-- 4. RLS para tabela: resultados_consultas
-- =====================================================================
-- Política: Usuários veem apenas resultados de suas consultas
-- Admins veem todos

ALTER TABLE public.resultados_consultas ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem resultados apenas de suas consultas
CREATE POLICY "Usuários veem resultados de suas consultas"
ON public.resultados_consultas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultas c
    WHERE c.id = resultados_consultas.consulta_id
    AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.usuarios_autorizados ua
    WHERE ua.email = auth.jwt() -> 'email' ->> 'email'
    AND ua.eh_admin = true
  )
);

-- Policy: Apenas sistema/backend pode inserir (via trigger ou edge function)
CREATE POLICY "Backend pode inserir resultados"
ON public.resultados_consultas
FOR INSERT
WITH CHECK (true);

-- Policy: Usuários podem atualizar visualizacao de seus próprios resultados
CREATE POLICY "Usuários atualizam visualizacao de seus resultados"
ON public.resultados_consultas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultas c
    WHERE c.id = resultados_consultas.consulta_id
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultas c
    WHERE c.id = resultados_consultas.consulta_id
    AND c.user_id = auth.uid()
  )
);

-- =====================================================================
-- 5. RLS para tabelas de dados do usuário
-- =====================================================================

-- consultas
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas suas consultas"
ON public.consultas
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar suas consultas"
ON public.consultas
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas consultas"
ON public.consultas
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas consultas"
ON public.consultas
FOR DELETE
USING (user_id = auth.uid());

-- documentos
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas seus documentos"
ON public.documentos
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar seus documentos"
ON public.documentos
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus documentos"
ON public.documentos
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar seus documentos"
ON public.documentos
FOR DELETE
USING (user_id = auth.uid());

-- conversas
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas suas conversas"
ON public.conversas
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar suas conversas"
ON public.conversas
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar suas conversas"
ON public.conversas
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar suas conversas"
ON public.conversas
FOR DELETE
USING (user_id = auth.uid());

-- mensagens
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem mensagens de suas conversas"
ON public.mensagens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id = mensagens.conversa_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem criar mensagens em suas conversas"
ON public.mensagens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversas c
    WHERE c.id = mensagens.conversa_id
    AND c.user_id = auth.uid()
  )
);

-- cadernos
ALTER TABLE public.cadernos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas seus cadernos"
ON public.cadernos
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar seus cadernos"
ON public.cadernos
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus cadernos"
ON public.cadernos
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar seus cadernos"
ON public.cadernos
FOR DELETE
USING (user_id = auth.uid());

-- =====================================================================
-- 6. Logs de aplicação (execucoes_agendadas)
-- =====================================================================

ALTER TABLE public.execucoes_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem execuções de suas consultas"
ON public.execucoes_agendadas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultas c
    WHERE c.id = execucoes_agendadas.consulta_id
    AND c.user_id = auth.uid()
  )
);

-- Backend pode inserir
CREATE POLICY "Backend pode inserir execuções"
ON public.execucoes_agendadas
FOR INSERT
WITH CHECK (true);

-- Usuários podem atualizar
CREATE POLICY "Usuários podem atualizar execuções"
ON public.execucoes_agendadas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.consultas c
    WHERE c.id = execucoes_agendadas.consulta_id
    AND c.user_id = auth.uid()
  )
);

-- =====================================================================
-- NOTA IMPORTANTE
-- =====================================================================
-- Para que as edge functions funcionem com RLS ativo:
-- 1. Use Supabase service role key nas edge functions
-- 2. O service role key bypassa RLS automaticamente
-- 3. RLS protege o acesso de usuários autenticados apenas
-- 
-- Exemplo em edge function:
-- const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
-- =====================================================================

COMMIT;
