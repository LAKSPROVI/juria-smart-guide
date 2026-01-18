-- =====================================================================
-- QUERIES ÚTEIS PARA VERIFICAÇÃO PÓS-DEPLOYMENT
-- =====================================================================
-- Use estas queries no Supabase SQL Editor para verificar o status
-- =====================================================================

-- =====================================================================
-- 1. VERIFICAR RLS POLICIES ATIVADAS
-- =====================================================================

-- Ver todas as policies criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Contar policies por tabela
SELECT 
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================================
-- 2. VERIFICAR ADMINS CONFIGURADOS
-- =====================================================================

-- Listar todos os admins
SELECT email, eh_admin, criado_em
FROM public.usuarios_autorizados
WHERE eh_admin = true
ORDER BY email;

-- Listar usuários bloqueados
SELECT email, motivo_bloqueio, criado_em
FROM public.usuarios_autorizados
WHERE motivo_bloqueio IS NOT NULL
ORDER BY email;

-- =====================================================================
-- 3. VERIFICAR CONFIG DE PROXY
-- =====================================================================

-- Ver configuração de proxy atual
SELECT 
  id,
  nome,
  url_base,
  ativo,
  ultima_verificacao,
  status_ultimo_teste
FROM public.config_proxy
ORDER BY criado_em DESC;

-- Ver histórico de testes de proxy
SELECT 
  *
FROM public.config_proxy
WHERE status_ultimo_teste IS NOT NULL
ORDER BY ultima_verificacao DESC
LIMIT 10;

-- =====================================================================
-- 4. VERIFICAR LOGS DE SISTEMA
-- =====================================================================

-- Últimos 50 logs
SELECT 
  id,
  tipo,
  acao,
  status,
  user_id,
  created_at,
  duracao_ms,
  erro_mensagem
FROM public.system_logs
ORDER BY created_at DESC
LIMIT 50;

-- Logs de erro (últimas 24h)
SELECT 
  id,
  tipo,
  acao,
  user_id,
  created_at,
  erro_mensagem,
  detalhes
FROM public.system_logs
WHERE status = 'erro'
  AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC;

-- Estatísticas de uso
SELECT 
  tipo,
  acao,
  COUNT(*) as total,
  COUNT(DISTINCT user_id) as usuarios,
  AVG(duracao_ms)::int as tempo_medio_ms
FROM public.system_logs
WHERE created_at >= now() - interval '7 days'
GROUP BY tipo, acao
ORDER BY total DESC;

-- =====================================================================
-- 5. VERIFICAR DADOS DO USUÁRIO (isolar por user_id)
-- =====================================================================

-- Consultas do usuário
SELECT 
  id,
  nome,
  tribunal,
  termo,
  created_at,
  updated_at
FROM public.consultas
WHERE user_id = 'seu-user-id-aqui'  -- Substitua com user_id real
ORDER BY created_at DESC;

-- Resultados de uma consulta específica
SELECT 
  id,
  numero_processo,
  sigla_tribunal,
  tipo_comunicacao,
  visualizado,
  created_at
FROM public.resultados_consultas
WHERE consulta_id = 'sua-consulta-id-aqui'  -- Substitua
ORDER BY created_at DESC;

-- Documentos do usuário
SELECT 
  id,
  nome,
  tipo,
  tamanho_bytes,
  embedding_processado,
  created_at
FROM public.documentos
WHERE user_id = 'seu-user-id-aqui'
ORDER BY created_at DESC;

-- =====================================================================
-- 6. VERIFICAR INTEGRIDADE DE DADOS
-- =====================================================================

-- Consultas sem resultados
SELECT 
  c.id,
  c.nome,
  COUNT(r.id) as total_resultados
FROM public.consultas c
LEFT JOIN public.resultados_consultas r ON r.consulta_id = c.id
GROUP BY c.id, c.nome
HAVING COUNT(r.id) = 0
ORDER BY c.created_at DESC;

-- Resultados sem consulta associada (órfãos)
SELECT 
  id,
  numero_processo,
  consulta_id
FROM public.resultados_consultas
WHERE consulta_id NOT IN (SELECT id FROM public.consultas)
LIMIT 10;

-- Documentos sem usuário associado
SELECT 
  id,
  nome,
  user_id
FROM public.documentos
WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM auth.users)
LIMIT 10;

-- =====================================================================
-- 7. TESTAR RLS (Execute com diferentes usuários)
-- =====================================================================

-- Este query mostrará dados visíveis para o usuário atual
-- Se RLS está funcionando, cada usuário vê apenas seus dados
SELECT 
  'consultas' as tabela,
  COUNT(*) as registros_visiveis
FROM public.consultas
UNION ALL
SELECT 
  'documentos',
  COUNT(*)
FROM public.documentos
UNION ALL
SELECT 
  'conversas',
  COUNT(*)
FROM public.conversas;

-- Ver identidade do usuário atual
SELECT auth.uid() as current_user_id;
SELECT auth.jwt() -> 'email' ->> 'email' as current_user_email;

-- =====================================================================
-- 8. PERFORMANCE & ÍNDICES
-- =====================================================================

-- Ver índices criados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Verificar tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamanho
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================================
-- 9. VERIFICAR EDGE FUNCTIONS
-- =====================================================================

-- Esta query deve ser executada via supabase CLI, não no SQL Editor
-- supabase functions get-logs gerenciar-proxy

-- =====================================================================
-- 10. CLEANUP & MANUTENÇÃO
-- =====================================================================

-- ATENÇÃO: Use com cuidado!

-- Limpar logs antigos (manter últimos 30 dias)
-- DELETE FROM public.system_logs
-- WHERE created_at < now() - interval '30 days';

-- Limpar consultas deletadas
-- DELETE FROM public.resultados_consultas
-- WHERE consulta_id IN (
--   SELECT id FROM public.consultas WHERE excluido_em IS NOT NULL
-- );

-- =====================================================================
-- DICAS DE DEBUGGING
-- =====================================================================

/*
1. Se um usuário não consegue acessar seus dados:
   - Verificar se user_id está correto: SELECT auth.uid();
   - Verificar se a política RLS foi criada: SELECT * FROM pg_policies WHERE tablename = 'consultas';
   - Testar query sem RLS (como super user): SELECT COUNT(*) FROM public.consultas;

2. Se RLS está bloqueando acesso legítimo:
   - Verificar erro exato na edge function: supabase functions get-logs
   - Verificar se o user_id na coluna corresponde ao auth.uid()
   - Verificar se há typos nas colunas user_id (pode ser usuario_id, etc)

3. Se performance caiu após RLS:
   - Adicionar índices nas colunas usadas em WHERE de policies
   - Ex: CREATE INDEX idx_consultas_user_id ON public.consultas(user_id);

4. Para testar RLS localmente:
   - supabase start
   - supabase functions serve
   - Usar VITE_SUPABASE_URL=http://localhost:54321 localmente
*/
