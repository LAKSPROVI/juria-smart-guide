import { supabase } from "@/integrations/supabase/client";
import { registrarLog } from "./logging";

export interface ConsultaParams {
  termo?: string;
  numeroOab?: string;
  ufOab?: string;
  siglaTribunal?: string;
  dataInicial?: string;
  dataFinal?: string;
}

export interface IntimacaoResult {
  id?: string;
  numeroProcesso?: string;
  nomeAdvogado?: string;
  dataDisponibilizacao?: string;
  dataPublicacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  nomeOrgao?: string;
  textoMensagem?: string;
  destinatarios?: Array<{
    nome?: string;
    numeroOab?: string;
    ufOab?: string;
  }>;
  [key: string]: unknown;
}

export interface ConsultaResponse {
  success: boolean;
  data: IntimacaoResult[];
  parametros: ConsultaParams;
  total: number;
  error?: string;
  message?: string;
  fromCache?: boolean;
  via?: string;
}

// Cache de resultados em memória (session)
const resultadosCache = new Map<string, { data: IntimacaoResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getCacheKey(params: ConsultaParams): string {
  return JSON.stringify({
    termo: params.termo,
    numeroOab: params.numeroOab,
    ufOab: params.ufOab,
    siglaTribunal: params.siglaTribunal,
    dataInicial: params.dataInicial,
    dataFinal: params.dataFinal,
  });
}

// Busca configuração do proxy
async function getProxyConfig() {
  const { data } = await supabase
    .from('config_proxy')
    .select('*')
    .eq('nome', 'proxy_brasil')
    .single();
  return data;
}

// Consulta via proxy no Brasil
async function consultarViaProxy(params: ConsultaParams): Promise<ConsultaResponse> {
  const config = await getProxyConfig();
  
  if (!config?.url_base || !config.ativo) {
    throw new Error("Proxy não configurado");
  }

  const response = await fetch(`${config.url_base}/consulta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.token || ''}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Erro do proxy: ${response.status}`);
  }

  const data = await response.json();
  return { ...data, via: 'proxy' };
}

// Chamada DIRETA do navegador para a API do PJe (evita bloqueio geográfico do servidor)
async function consultarAPIDirecta(params: ConsultaParams): Promise<IntimacaoResult[]> {
  const baseUrl = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
  const urlParams = new URLSearchParams();

  if (params.siglaTribunal) {
    urlParams.append("siglaTribunal", params.siglaTribunal);
  }
  
  if (params.termo) {
    urlParams.append("nomeAdvogado", params.termo);
  }
  
  if (params.numeroOab) {
    urlParams.append("numeroOab", params.numeroOab);
  }
  
  if (params.ufOab) {
    urlParams.append("ufOab", params.ufOab);
  }
  
  // Se não tiver datas, usar últimos 30 dias
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const dataInicial = params.dataInicial || trintaDiasAtras.toISOString().split('T')[0];
  const dataFinal = params.dataFinal || hoje.toISOString().split('T')[0];
  
  urlParams.append("dataDisponibilizacaoInicio", dataInicial);
  urlParams.append("dataDisponibilizacaoFim", dataFinal);

  const fullUrl = `${baseUrl}?${urlParams.toString()}`;
  console.log("Consultando ComunicaAPI diretamente do navegador:", fullUrl);

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return []; // Nenhum resultado encontrado
    }
    throw new Error(`Erro na API: ${response.status}`);
  }

  const data = await response.json();
  
  // Normalizar resposta (pode vir como array ou objeto)
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object') {
    if (data.comunicacoes && Array.isArray(data.comunicacoes)) {
      return data.comunicacoes;
    } else if (data.items && Array.isArray(data.items)) {
      return data.items;
    } else if (data.content && Array.isArray(data.content)) {
      return data.content;
    }
    return [data];
  }
  
  return [];
}

// Fallback para edge function (caso a chamada direta falhe por CORS)
async function consultarViaEdgeFunction(params: ConsultaParams): Promise<ConsultaResponse> {
  const { data, error } = await supabase.functions.invoke('consulta-intimacoes', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || "Erro ao consultar intimações");
  }

  return { ...(data as ConsultaResponse), via: 'edge_function' };
}

export async function consultarIntimacoes(params: ConsultaParams, consultaId?: string): Promise<ConsultaResponse> {
  console.log("Consultando intimações com params:", params);
  const inicio = Date.now();
  
  // 1. Verificar cache em memória
  const cacheKey = getCacheKey(params);
  const cached = resultadosCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("Retornando resultados do cache em memória");
    
    await registrarLog({
      tipo: 'consulta',
      acao: 'executar',
      entidade_tipo: 'consulta',
      entidade_id: consultaId,
      detalhes: { params, resultados: cached.data.length, via: 'cache_memoria' },
      status: 'cache',
      duracao_ms: Date.now() - inicio,
    });
    
    return {
      success: true,
      data: cached.data,
      parametros: params,
      total: cached.data.length,
      fromCache: true,
      via: 'cache_memoria',
      message: "Resultados do cache (última consulta há menos de 5 min)"
    };
  }

  // 2. Verificar cache no banco de dados (resultados salvos anteriormente)
  if (params.siglaTribunal && params.termo) {
    try {
      const { data: cachedResults } = await supabase
        .from('resultados_consultas')
        .select('*, consultas!inner(termo, tribunal)')
        .eq('consultas.termo', params.termo)
        .eq('consultas.tribunal', params.siglaTribunal)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24h
        .order('created_at', { ascending: false })
        .limit(50);

      if (cachedResults && cachedResults.length > 0) {
        console.log("Retornando resultados do cache do banco:", cachedResults.length);
        const mappedResults = cachedResults.map(r => ({
          id: r.id,
          numeroProcesso: r.numero_processo,
          siglaTribunal: r.sigla_tribunal,
          nomeOrgao: r.nome_orgao,
          tipoComunicacao: r.tipo_comunicacao,
          dataDisponibilizacao: r.data_disponibilizacao,
          dataPublicacao: r.data_publicacao,
          textoMensagem: r.texto_mensagem,
          destinatarios: r.destinatarios as IntimacaoResult['destinatarios'],
        }));

        await registrarLog({
          tipo: 'consulta',
          acao: 'executar',
          entidade_tipo: 'consulta',
          entidade_id: consultaId,
          detalhes: { params, resultados: mappedResults.length, via: 'cache_banco' },
          status: 'cache',
          duracao_ms: Date.now() - inicio,
        });

        return {
          success: true,
          data: mappedResults,
          parametros: params,
          total: mappedResults.length,
          fromCache: true,
          via: 'cache_banco',
          message: `${mappedResults.length} resultado(s) do cache (últimas 24h). Clique em "Forçar Atualização" para buscar novos.`
        };
      }
    } catch (error) {
      console.log("Erro ao verificar cache do banco:", error);
    }
  }

  // 3. Tentar via proxy se configurado
  try {
    const proxyConfig = await getProxyConfig();
    if (proxyConfig?.ativo && proxyConfig?.url_base) {
      console.log("Tentando via proxy...");
      const response = await consultarViaProxy(params);
      
      if (response.success && response.data.length > 0) {
        resultadosCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
      
      await registrarLog({
        tipo: 'consulta',
        acao: 'executar',
        entidade_tipo: 'consulta',
        entidade_id: consultaId,
        detalhes: { params, resultados: response.total, via: 'proxy' },
        status: response.success ? 'sucesso' : 'erro',
        erro_mensagem: response.error,
        duracao_ms: Date.now() - inicio,
      });
      
      return response;
    }
  } catch (proxyError) {
    console.log("Proxy não disponível, tentando alternativas...", proxyError);
  }

  // 4. Tentar chamada direta do navegador (evita bloqueio geográfico)
  try {
    console.log("Tentando chamada direta do navegador...");
    const resultados = await consultarAPIDirecta(params);
    
    // Salvar no cache em memória
    resultadosCache.set(cacheKey, { data: resultados, timestamp: Date.now() });
    
    await registrarLog({
      tipo: 'consulta',
      acao: 'executar',
      entidade_tipo: 'consulta',
      entidade_id: consultaId,
      detalhes: { params, resultados: resultados.length, via: 'navegador_direto' },
      status: 'sucesso',
      duracao_ms: Date.now() - inicio,
    });
    
    return {
      success: true,
      data: resultados,
      parametros: params,
      total: resultados.length,
      fromCache: false,
      via: 'navegador_direto',
    };
  } catch (directError) {
    console.log("Chamada direta falhou (possivelmente CORS), tentando via edge function...", directError);
    
    // 5. Fallback para edge function
    try {
      const response = await consultarViaEdgeFunction(params);
      
      if (response.success && response.data.length > 0) {
        resultadosCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
      
      await registrarLog({
        tipo: 'consulta',
        acao: 'executar',
        entidade_tipo: 'consulta',
        entidade_id: consultaId,
        detalhes: { params, resultados: response.total, via: 'edge_function' },
        status: response.success ? 'sucesso' : 'erro',
        erro_mensagem: response.error,
        duracao_ms: Date.now() - inicio,
      });
      
      return response;
    } catch (edgeError) {
      await registrarLog({
        tipo: 'consulta',
        acao: 'executar',
        entidade_tipo: 'consulta',
        entidade_id: consultaId,
        detalhes: { params },
        status: 'erro',
        erro_mensagem: edgeError instanceof Error ? edgeError.message : String(edgeError),
        duracao_ms: Date.now() - inicio,
      });
      
      console.error("Erro na edge function:", edgeError);
      throw edgeError;
    }
  }
}

// Forçar atualização (ignora cache)
export async function forcarAtualizacaoConsulta(params: ConsultaParams, consultaId?: string): Promise<ConsultaResponse> {
  console.log("Forçando atualização da consulta (ignorando cache)");
  const inicio = Date.now();
  
  // Limpar cache em memória para esta consulta
  const cacheKey = getCacheKey(params);
  resultadosCache.delete(cacheKey);
  
  // 1. Tentar via proxy se configurado
  try {
    const proxyConfig = await getProxyConfig();
    if (proxyConfig?.ativo && proxyConfig?.url_base) {
      const response = await consultarViaProxy(params);
      if (response.success && response.data.length > 0) {
        resultadosCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
      
      await registrarLog({
        tipo: 'consulta',
        acao: 'executar',
        entidade_tipo: 'consulta',
        entidade_id: consultaId,
        detalhes: { params, resultados: response.total, via: 'proxy', forcado: true },
        status: response.success ? 'sucesso' : 'erro',
        erro_mensagem: response.error,
        duracao_ms: Date.now() - inicio,
      });
      
      return response;
    }
  } catch (proxyError) {
    console.log("Proxy não disponível...", proxyError);
  }
  
  // 2. Tentar chamada direta
  try {
    const resultados = await consultarAPIDirecta(params);
    resultadosCache.set(cacheKey, { data: resultados, timestamp: Date.now() });
    
    await registrarLog({
      tipo: 'consulta',
      acao: 'executar',
      entidade_tipo: 'consulta',
      entidade_id: consultaId,
      detalhes: { params, resultados: resultados.length, via: 'navegador_direto', forcado: true },
      status: 'sucesso',
      duracao_ms: Date.now() - inicio,
    });
    
    return {
      success: true,
      data: resultados,
      parametros: params,
      total: resultados.length,
      fromCache: false,
      via: 'navegador_direto',
    };
  } catch (error) {
    // 3. Fallback para edge function
    const response = await consultarViaEdgeFunction(params);
    if (response.success && response.data.length > 0) {
      resultadosCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    }
    
    await registrarLog({
      tipo: 'consulta',
      acao: 'executar',
      entidade_tipo: 'consulta',
      entidade_id: consultaId,
      detalhes: { params, resultados: response.total, via: 'edge_function', forcado: true },
      status: response.success ? 'sucesso' : 'erro',
      erro_mensagem: response.error,
      duracao_ms: Date.now() - inicio,
    });
    
    return response;
  }
}

// Limpar todo o cache
export function limparCache(): void {
  resultadosCache.clear();
  console.log("Cache de resultados limpo");
}
