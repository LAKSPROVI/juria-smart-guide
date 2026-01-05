-- Habilitar RLS em todas as tabelas com políticas públicas temporárias
-- (O sistema ainda não tem autenticação implementada)

-- Consultas
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário consultas" ON public.consultas FOR ALL USING (true) WITH CHECK (true);

-- Resultados das consultas
ALTER TABLE public.resultados_consultas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário resultados" ON public.resultados_consultas FOR ALL USING (true) WITH CHECK (true);

-- Config cadernos
ALTER TABLE public.config_cadernos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário config_cadernos" ON public.config_cadernos FOR ALL USING (true) WITH CHECK (true);

-- Cadernos
ALTER TABLE public.cadernos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário cadernos" ON public.cadernos FOR ALL USING (true) WITH CHECK (true);

-- Documentos
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário documentos" ON public.documentos FOR ALL USING (true) WITH CHECK (true);

-- Documento chunks
ALTER TABLE public.documento_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário chunks" ON public.documento_chunks FOR ALL USING (true) WITH CHECK (true);

-- Conversas
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário conversas" ON public.conversas FOR ALL USING (true) WITH CHECK (true);

-- Mensagens
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público temporário mensagens" ON public.mensagens FOR ALL USING (true) WITH CHECK (true);