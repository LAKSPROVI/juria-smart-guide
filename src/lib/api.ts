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
const REQUEST_TIMEOUT_MS = 12000;

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

async function fetchWithTimeout(url: string, init?: RequestInit, timeout = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timeout", "AbortError")), timeout);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

  const response = await fetchWithTimeout(fullUrl, {
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

// Consulta via edge function (mantém segredos no backend)
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

  // 3. Tentar via edge function primeiro (seguro e com segredos no backend)
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

    if (response.success) {
      return response;
    }
  } catch (edgeError) {
    console.log("Edge function indisponível, tentando chamada direta...", edgeError);
  }

  // 4. Fallback: chamada direta do navegador (pode falhar por CORS ou geolocalização)
  try {
    console.log("Tentando chamada direta do navegador...");
    const resultados = await consultarAPIDirecta(params);

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
    await registrarLog({
      tipo: 'consulta',
      acao: 'executar',
      entidade_tipo: 'consulta',
      entidade_id: consultaId,
      detalhes: { params },
      status: 'erro',
      erro_mensagem: directError instanceof Error ? directError.message : String(directError),
      duracao_ms: Date.now() - inicio,
    });

    throw directError;
  }
}

// Forçar atualização (ignora cache)
export async function forcarAtualizacaoConsulta(params: ConsultaParams, consultaId?: string): Promise<ConsultaResponse> {
  console.log("Forçando atualização da consulta (ignorando cache)");
  const inicio = Date.now();
  
  // Limpar cache em memória para esta consulta
  const cacheKey = getCacheKey(params);
  resultadosCache.delete(cacheKey);
  
  // 1. Tentar via edge function (evita exposição de segredos e ignora cache)
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
      detalhes: { params, resultados: response.total, via: 'edge_function', forcado: true },
      status: response.success ? 'sucesso' : 'erro',
      erro_mensagem: response.error,
      duracao_ms: Date.now() - inicio,
    });

    if (response.success) {
      return response;
    }
  } catch (edgeError) {
    console.log("Edge function indisponível (forçar atualização)", edgeError);
  }
  
  // 2. Fallback: chamada direta
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
  } catch (directError) {
    await registrarLog({
      tipo: 'consulta',
      acao: 'executar',
      entidade_tipo: 'consulta',
      entidade_id: consultaId,
      detalhes: { params },
      status: 'erro',
      erro_mensagem: directError instanceof Error ? directError.message : String(directError),
      duracao_ms: Date.now() - inicio,
    });

    throw directError;
  }
}
