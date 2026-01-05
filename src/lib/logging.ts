import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type LogTipo = 'consulta' | 'chat' | 'caderno' | 'documento' | 'admin';
export type LogAcao = 'executar' | 'criar' | 'editar' | 'excluir' | 'processar' | 'download' | 'enviar' | 'receber' | 'erro';
export type LogStatus = 'sucesso' | 'erro' | 'cache';

export interface LogEntry {
  tipo: LogTipo;
  acao: LogAcao;
  entidade_tipo?: string;
  entidade_id?: string;
  detalhes?: Record<string, unknown>;
  origem?: string;
  status?: LogStatus;
  erro_mensagem?: string;
  duracao_ms?: number;
}

/**
 * Registra um log no banco de dados
 */
export async function registrarLog(entry: LogEntry): Promise<void> {
  try {
    const detalhesJson = (entry.detalhes || {}) as Json;
    
    const { error } = await supabase.from('system_logs').insert([{
      tipo: entry.tipo,
      acao: entry.acao,
      entidade_tipo: entry.entidade_tipo,
      entidade_id: entry.entidade_id,
      detalhes: detalhesJson,
      origem: entry.origem || 'frontend',
      status: entry.status || 'sucesso',
      erro_mensagem: entry.erro_mensagem,
      duracao_ms: entry.duracao_ms,
      user_agent: navigator.userAgent,
    }]);

    if (error) {
      console.error("Erro ao registrar log:", error);
    }
  } catch (error) {
    console.error("Erro ao registrar log:", error);
  }
}

/**
 * Helper para medir tempo de execução e logar
 */
export async function comLog<T>(
  entry: Omit<LogEntry, 'duracao_ms' | 'status' | 'erro_mensagem'>,
  fn: () => Promise<T>
): Promise<T> {
  const inicio = Date.now();
  
  try {
    const resultado = await fn();
    
    await registrarLog({
      ...entry,
      status: 'sucesso',
      duracao_ms: Date.now() - inicio,
    });
    
    return resultado;
  } catch (error) {
    await registrarLog({
      ...entry,
      status: 'erro',
      erro_mensagem: error instanceof Error ? error.message : String(error),
      duracao_ms: Date.now() - inicio,
    });
    
    throw error;
  }
}

/**
 * Busca logs do sistema
 */
export interface FiltrosLog {
  tipo?: LogTipo;
  acao?: LogAcao;
  status?: LogStatus;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
}

export interface SystemLog {
  id: string;
  tipo: string;
  acao: string;
  entidade_tipo: string | null;
  entidade_id: string | null;
  detalhes: Record<string, unknown>;
  origem: string;
  status: string;
  erro_mensagem: string | null;
  duracao_ms: number | null;
  user_agent: string | null;
  created_at: string;
}

export async function buscarLogs(filtros?: FiltrosLog): Promise<SystemLog[]> {
  let query = supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filtros?.limite || 100);

  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }
  
  if (filtros?.acao) {
    query = query.eq('acao', filtros.acao);
  }
  
  if (filtros?.status) {
    query = query.eq('status', filtros.status);
  }
  
  if (filtros?.dataInicio) {
    query = query.gte('created_at', filtros.dataInicio);
  }
  
  if (filtros?.dataFim) {
    query = query.lte('created_at', filtros.dataFim);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar logs:", error);
    return [];
  }

  return data as SystemLog[];
}

/**
 * Busca estatísticas de logs
 */
export async function buscarEstatisticasLogs() {
  const { data: stats, error } = await supabase
    .from('system_logs')
    .select('tipo, status')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (error || !stats) {
    return { total: 0, sucesso: 0, erro: 0, porTipo: {} };
  }

  const porTipo: Record<string, number> = {};
  let sucesso = 0;
  let erros = 0;

  stats.forEach(log => {
    porTipo[log.tipo] = (porTipo[log.tipo] || 0) + 1;
    if (log.status === 'sucesso' || log.status === 'cache') sucesso++;
    if (log.status === 'erro') erros++;
  });

  return {
    total: stats.length,
    sucesso,
    erro: erros,
    porTipo,
  };
}
