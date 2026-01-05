-- Tabela de consultas configuradas
CREATE TABLE public.consultas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tribunal TEXT NOT NULL,
  tipo TEXT NOT NULL,
  termo TEXT NOT NULL,
  numero_oab TEXT,
  uf_oab TEXT,
  data_inicial DATE,
  data_final DATE,
  recorrencia TEXT NOT NULL DEFAULT 'manual',
  horarios TEXT[] DEFAULT ARRAY['09:00'],
  ativo BOOLEAN DEFAULT true,
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de resultados das consultas (intimações encontradas)
CREATE TABLE public.resultados_consultas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID REFERENCES public.consultas(id) ON DELETE CASCADE,
  numero_processo TEXT,
  sigla_tribunal TEXT,
  nome_orgao TEXT,
  tipo_comunicacao TEXT,
  data_disponibilizacao DATE,
  data_publicacao DATE,
  texto_mensagem TEXT,
  destinatarios JSONB,
  dados_completos JSONB,
  visualizado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configurações de cadernos por tribunal
CREATE TABLE public.config_cadernos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tribunal TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  horarios TEXT[] DEFAULT ARRAY['19:00'],
  tipos TEXT[] DEFAULT ARRAY['D'],
  processar_automaticamente BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de cadernos baixados
CREATE TABLE public.cadernos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tribunal TEXT NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  tamanho_bytes BIGINT,
  total_publicacoes INTEGER DEFAULT 0,
  url_arquivo TEXT,
  erro_mensagem TEXT,
  processado_rag BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tribunal, data, tipo)
);

-- Tabela de documentos do sistema RAG
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  tribunal TEXT,
  tamanho_bytes BIGINT,
  origem TEXT NOT NULL DEFAULT 'upload',
  status TEXT NOT NULL DEFAULT 'pendente',
  url_arquivo TEXT,
  caderno_id UUID REFERENCES public.cadernos(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  conteudo_texto TEXT,
  embedding_processado BOOLEAN DEFAULT false,
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de chunks para RAG (vetorização)
CREATE TABLE public.documento_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID REFERENCES public.documentos(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  conteudo TEXT NOT NULL,
  numero_processo TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conversas do chat
CREATE TABLE public.conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  ultima_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de mensagens do chat
CREATE TABLE public.mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID REFERENCES public.conversas(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  fontes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_resultados_consulta_id ON public.resultados_consultas(consulta_id);
CREATE INDEX idx_resultados_data ON public.resultados_consultas(data_disponibilizacao DESC);
CREATE INDEX idx_cadernos_tribunal_data ON public.cadernos(tribunal, data DESC);
CREATE INDEX idx_documentos_origem ON public.documentos(origem);
CREATE INDEX idx_documento_chunks_documento ON public.documento_chunks(documento_id);
CREATE INDEX idx_mensagens_conversa ON public.mensagens(conversa_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_consultas_updated_at
BEFORE UPDATE ON public.consultas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_cadernos_updated_at
BEFORE UPDATE ON public.config_cadernos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cadernos_updated_at
BEFORE UPDATE ON public.cadernos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documentos_updated_at
BEFORE UPDATE ON public.documentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversas_updated_at
BEFORE UPDATE ON public.conversas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações iniciais de tribunais
INSERT INTO public.config_cadernos (tribunal, ativo, horarios, tipos) VALUES
  ('TJSP', true, ARRAY['19:00'], ARRAY['D']),
  ('TRF3', true, ARRAY['19:30'], ARRAY['D']),
  ('TRT2', true, ARRAY['20:00'], ARRAY['D', 'A']),
  ('STJ', false, ARRAY['21:00'], ARRAY['D']);

-- Inserir consulta de teste
INSERT INTO public.consultas (nome, tribunal, tipo, termo, data_inicial, data_final, recorrencia, horarios) VALUES
  ('Márcia Gabriela - TJSP', 'TJSP', 'nome_advogado', 'Márcia Gabriela de Abreu', '2025-12-20', '2025-12-25', 'diaria', ARRAY['09:00']);