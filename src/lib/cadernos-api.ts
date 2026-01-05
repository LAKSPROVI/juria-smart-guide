import { supabase } from "@/integrations/supabase/client";
import { registrarLog } from "./logging";

export interface CadernoDownloadParams {
  tribunal: string;
  data: string; // formato YYYY-MM-DD
  tipo: string; // D = Judicial, A = Administrativo
  processarRag?: boolean;
}

export interface CadernoDownloadResult {
  success: boolean;
  cadernoId?: string;
  message?: string;
  error?: string;
  urlCaderno?: string;
  tamanho?: number;
  totalPublicacoes?: number;
}

// Buscar caderno da API ComunicaAPI
export async function baixarCadernoDJE(params: CadernoDownloadParams): Promise<CadernoDownloadResult> {
  const inicio = Date.now();
  
  try {
    // Converter data YYYY-MM-DD para YYYYMMDD
    const dataFormatada = params.data.replace(/-/g, '');
    
    // URL do caderno: GET https://comunicaapi.pje.jus.br/api/v1/caderno/{sigla_tribunal}/{data}/{meio}
    // meio: D = Judicial, A = Administrativo
    const url = `https://comunicaapi.pje.jus.br/api/v1/caderno/${params.tribunal}/${dataFormatada}/${params.tipo}`;
    
    console.log("Baixando caderno DJE:", url);
    
    // Criar registro do caderno como "processando"
    const { data: caderno, error: insertError } = await supabase
      .from('cadernos')
      .insert({
        tribunal: params.tribunal,
        data: params.data,
        tipo: params.tipo,
        status: 'processando',
        processado_rag: false,
      })
      .select()
      .single();
    
    if (insertError) {
      throw new Error(`Erro ao criar registro: ${insertError.message}`);
    }
    
    // Tentar baixar do navegador (pode falhar por CORS)
    // A API do PJe geralmente permite chamadas diretas do navegador no Brasil
    try {
      console.log("Tentando baixar caderno diretamente do navegador:", url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/html, */*',
          'Cache-Control': 'no-cache',
        },
        // Sem mode específico para permitir que o navegador faça a requisição normalmente
      });
      
      console.log("Resposta do navegador:", response.status, response.ok);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Caderno não disponível para esta data
          await supabase
            .from('cadernos')
            .update({ 
              status: 'erro', 
              erro_mensagem: 'Caderno não disponível para esta data' 
            })
            .eq('id', caderno.id);
          
          return {
            success: false,
            cadernoId: caderno.id,
            error: 'Caderno não disponível para esta data',
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Verificar tipo de conteúdo
      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      
      let conteudo: string = '';
      let totalPublicacoes = 0;
      
      if (contentType.includes('application/json')) {
        const jsonData = await response.json();
        conteudo = JSON.stringify(jsonData, null, 2);
        
        // Tentar extrair contagem de publicações
        if (Array.isArray(jsonData)) {
          totalPublicacoes = jsonData.length;
        } else if (jsonData.publicacoes) {
          totalPublicacoes = jsonData.publicacoes.length;
        } else if (jsonData.items) {
          totalPublicacoes = jsonData.items.length;
        }
      } else {
        // HTML ou texto
        conteudo = await response.text();
        // Tentar contar publicações por padrões no texto
        const matches = conteudo.match(/processo|intimação|citação/gi);
        totalPublicacoes = matches ? Math.floor(matches.length / 3) : 0;
      }
      
      const tamanhoBytes = contentLength ? parseInt(contentLength) : conteudo.length;
      
      // Atualizar caderno com sucesso
      await supabase
        .from('cadernos')
        .update({
          status: 'sucesso',
          tamanho_bytes: tamanhoBytes,
          total_publicacoes: totalPublicacoes,
          url_arquivo: url,
        })
        .eq('id', caderno.id);
      
      // Se deve processar para RAG
      if (params.processarRag) {
        await processarCadernoParaRAG(caderno.id, params.tribunal, params.data, conteudo);
      }
      
      await registrarLog({
        tipo: 'caderno',
        acao: 'download',
        entidade_tipo: 'caderno',
        entidade_id: caderno.id,
        detalhes: { tribunal: params.tribunal, data: params.data, tipo: params.tipo, tamanho: tamanhoBytes },
        status: 'sucesso',
        duracao_ms: Date.now() - inicio,
      });
      
      return {
        success: true,
        cadernoId: caderno.id,
        message: `Caderno baixado com sucesso (${totalPublicacoes} publicações)`,
        urlCaderno: url,
        tamanho: tamanhoBytes,
        totalPublicacoes,
      };
      
    } catch (fetchError) {
      console.error("Erro ao baixar diretamente (CORS?):", fetchError);
      
      // Tentar via edge function
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('baixar-caderno', {
        body: params,
      });
      
      if (edgeError || !edgeResult?.success) {
        const errorMessage = edgeError?.message || edgeResult?.error || 'Erro desconhecido';
        const suggestion = edgeResult?.suggestion || '';
        
        await supabase
          .from('cadernos')
          .update({ 
            status: 'erro', 
            erro_mensagem: errorMessage
          })
          .eq('id', caderno.id);
        
        await registrarLog({
          tipo: 'caderno',
          acao: 'download',
          entidade_tipo: 'caderno',
          entidade_id: caderno.id,
          detalhes: { tribunal: params.tribunal, data: params.data, tipo: params.tipo, httpStatus: edgeResult?.httpStatus },
          status: 'erro',
          erro_mensagem: errorMessage,
          duracao_ms: Date.now() - inicio,
        });
        
        return {
          success: false,
          cadernoId: caderno.id,
          error: suggestion ? `${errorMessage}. ${suggestion}` : errorMessage,
        };
      }
      
      // Sucesso via edge function
      await supabase
        .from('cadernos')
        .update({
          status: 'sucesso',
          tamanho_bytes: edgeResult.tamanho,
          total_publicacoes: edgeResult.totalPublicacoes,
          url_arquivo: edgeResult.url,
        })
        .eq('id', caderno.id);
      
      if (params.processarRag && edgeResult.conteudo) {
        await processarCadernoParaRAG(caderno.id, params.tribunal, params.data, edgeResult.conteudo);
      }
      
      await registrarLog({
        tipo: 'caderno',
        acao: 'download',
        entidade_tipo: 'caderno',
        entidade_id: caderno.id,
        detalhes: { tribunal: params.tribunal, data: params.data, tipo: params.tipo, tamanho: edgeResult.tamanho, via: 'edge_function' },
        status: 'sucesso',
        duracao_ms: Date.now() - inicio,
      });
      
      return {
        success: true,
        cadernoId: caderno.id,
        message: `Caderno baixado via servidor (${edgeResult.totalPublicacoes} publicações)`,
        urlCaderno: edgeResult.url,
        tamanho: edgeResult.tamanho,
        totalPublicacoes: edgeResult.totalPublicacoes,
      };
    }
    
  } catch (error) {
    console.error("Erro ao baixar caderno:", error);
    
    await registrarLog({
      tipo: 'caderno',
      acao: 'download',
      entidade_tipo: 'caderno',
      detalhes: { tribunal: params.tribunal, data: params.data, tipo: params.tipo },
      status: 'erro',
      erro_mensagem: error instanceof Error ? error.message : String(error),
      duracao_ms: Date.now() - inicio,
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// Processar conteúdo do caderno para RAG
async function processarCadernoParaRAG(cadernoId: string, tribunal: string, data: string, conteudo: string) {
  try {
    // Dividir conteúdo em chunks menores para busca
    const chunkSize = 2000; // caracteres por chunk
    const chunks: string[] = [];
    
    for (let i = 0; i < conteudo.length; i += chunkSize) {
      chunks.push(conteudo.slice(i, i + chunkSize));
    }
    
    // Criar documento
    const { data: documento, error: docError } = await supabase
      .from('documentos')
      .insert({
        nome: `Caderno DJE - ${tribunal} - ${data}`,
        tipo: 'caderno_dje',
        tribunal,
        origem: 'dje',
        status: 'processado',
        caderno_id: cadernoId,
        conteudo_texto: conteudo.substring(0, 10000), // Primeiros 10k chars
        embedding_processado: true,
        tamanho_bytes: conteudo.length,
        tags: ['dje', tribunal.toLowerCase()],
      })
      .select()
      .single();
    
    if (docError) {
      console.error("Erro ao criar documento:", docError);
      return;
    }
    
    // Inserir chunks para busca RAG
    const chunksToInsert = chunks.map((chunk, index) => ({
      documento_id: documento.id,
      chunk_index: index,
      conteudo: chunk,
      metadata: {
        tipo: 'caderno_dje',
        tribunal,
        data,
        caderno_id: cadernoId,
      },
    }));
    
    const { error: chunkError } = await supabase
      .from('documento_chunks')
      .insert(chunksToInsert);
    
    if (chunkError) {
      console.error("Erro ao inserir chunks:", chunkError);
    }
    
    // Marcar caderno como processado para RAG
    await supabase
      .from('cadernos')
      .update({ processado_rag: true })
      .eq('id', cadernoId);
    
    console.log(`Caderno processado para RAG: ${chunks.length} chunks`);
    
  } catch (error) {
    console.error("Erro ao processar para RAG:", error);
  }
}

// Buscar cadernos em processamento
export async function getCadernosEmProcessamento() {
  const { data, error } = await supabase
    .from('cadernos')
    .select('*')
    .eq('status', 'processando')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}
