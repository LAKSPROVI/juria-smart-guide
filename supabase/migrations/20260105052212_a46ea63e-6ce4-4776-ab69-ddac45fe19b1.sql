
-- Adicionar campos de arquivamento e exclusão nas tabelas principais

-- Consultas
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone DEFAULT null;

-- Config Cadernos
ALTER TABLE public.config_cadernos 
ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone DEFAULT null;

-- Cadernos
ALTER TABLE public.cadernos 
ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone DEFAULT null;

-- Documentos
ALTER TABLE public.documentos 
ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone DEFAULT null;

-- Conversas
ALTER TABLE public.conversas 
ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone DEFAULT null;

-- Resultados Consultas
ALTER TABLE public.resultados_consultas 
ADD COLUMN IF NOT EXISTS arquivado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em timestamp with time zone DEFAULT null;

-- Criar índices para melhorar performance das queries filtradas
CREATE INDEX IF NOT EXISTS idx_consultas_arquivado ON public.consultas(arquivado);
CREATE INDEX IF NOT EXISTS idx_consultas_excluido ON public.consultas(excluido_em);
CREATE INDEX IF NOT EXISTS idx_config_cadernos_arquivado ON public.config_cadernos(arquivado);
CREATE INDEX IF NOT EXISTS idx_cadernos_arquivado ON public.cadernos(arquivado);
CREATE INDEX IF NOT EXISTS idx_documentos_arquivado ON public.documentos(arquivado);
CREATE INDEX IF NOT EXISTS idx_conversas_arquivado ON public.conversas(arquivado);
