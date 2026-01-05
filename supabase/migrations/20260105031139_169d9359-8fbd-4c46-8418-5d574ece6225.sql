-- Tabela centralizada de logs do sistema
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'consulta', 'chat', 'caderno', 'documento', 'admin'
  acao TEXT NOT NULL, -- 'executar', 'criar', 'editar', 'excluir', 'processar', 'download', 'erro'
  entidade_tipo TEXT, -- 'consulta', 'conversa', 'mensagem', 'caderno', 'documento'
  entidade_id UUID,
  detalhes JSONB DEFAULT '{}'::jsonb, -- Detalhes específicos da ação (params, resultado, etc)
  origem TEXT DEFAULT 'frontend', -- 'frontend', 'edge_function', 'cron', 'proxy'
  status TEXT DEFAULT 'sucesso', -- 'sucesso', 'erro', 'cache'
  erro_mensagem TEXT,
  duracao_ms INTEGER, -- Tempo de execução em milissegundos
  ip_origem TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_system_logs_tipo ON public.system_logs(tipo);
CREATE INDEX idx_system_logs_acao ON public.system_logs(acao);
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_entidade ON public.system_logs(entidade_tipo, entidade_id);
CREATE INDEX idx_system_logs_status ON public.system_logs(status);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Política de acesso público temporário (ajustar depois com auth)
CREATE POLICY "Acesso público temporário logs" 
ON public.system_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Tabela de configuração do proxy
CREATE TABLE public.config_proxy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT 'proxy_brasil',
  url_base TEXT, -- URL do seu proxy no Brasil
  token TEXT, -- Token de autenticação do proxy
  ativo BOOLEAN DEFAULT false,
  ultima_verificacao TIMESTAMP WITH TIME ZONE,
  status_ultimo_teste TEXT, -- 'ok', 'erro', 'timeout'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_proxy ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Acesso público temporário config_proxy" 
ON public.config_proxy 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Inserir configuração inicial do proxy (desativado)
INSERT INTO public.config_proxy (nome, url_base, ativo) 
VALUES ('proxy_brasil', NULL, false);

-- Tabela para histórico de execuções de consultas agendadas
CREATE TABLE public.execucoes_agendadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID REFERENCES public.consultas(id) ON DELETE CASCADE,
  horario_agendado TIME NOT NULL,
  horario_executado TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'executando', 'sucesso', 'erro'
  resultados_encontrados INTEGER DEFAULT 0,
  erro_mensagem TEXT,
  origem TEXT DEFAULT 'cron', -- 'cron', 'manual'
  duracao_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_execucoes_consulta ON public.execucoes_agendadas(consulta_id);
CREATE INDEX idx_execucoes_created ON public.execucoes_agendadas(created_at DESC);

-- Enable RLS
ALTER TABLE public.execucoes_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público temporário execucoes" 
ON public.execucoes_agendadas 
FOR ALL 
USING (true)
WITH CHECK (true);