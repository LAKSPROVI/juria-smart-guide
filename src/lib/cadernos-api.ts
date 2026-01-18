import { supabase } from "@/integrations/supabase/client";
import { registrarLog } from "./logging";
import { createDocumento } from "./database";

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

const REQUEST_TIMEOUT_MS = 12000;

const fetchWithTimeout = async (url: string, init?: RequestInit, timeout = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Timeout", "AbortError")), timeout);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Buscar caderno da API ComunicaAPI
export async function baixarCadernoDJE(params: CadernoDownloadParams): Promise<CadernoDownloadResult> {
  const inicio = Date.now();

  try {
    // Converter data YYYY-MM-DD para YYYYMMDD
    const dataFormatada = params.data.replace(/-/g, "");

    // URL do caderno: GET https://comunicaapi.pje.jus.br/api/v1/caderno/{sigla_tribunal}/{data}/{meio}
    const url = `https://comunicaapi.pje.jus.br/api/v1/caderno/${params.tribunal}/${dataFormatada}/${params.tipo}`;

    console.log("Baixando caderno DJE:", url);

    // Criar registro do caderno como "processando"
    const { data: caderno, error: insertError } = await supabase
      .from("cadernos")
      .insert({
        tribunal: params.tribunal,
        data: params.data,
        tipo: params.tipo,
        status: "processando",
        processado_rag: false,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Erro ao criar registro: ${insertError.message}`);
    }

    // Função auxiliar para processar resposta
    const processarResposta = async (response: Response, via: string) => {
      const contentType = response.headers.get("content-type") || "";
      const contentLength = response.headers.get("content-length");

      let conteudo: string = "";
      let totalPublicacoes = 0;

      if (contentType.includes("application/json")) {
        const jsonData = await response.json();
        conteudo = JSON.stringify(jsonData, null, 2);

        if (Array.isArray(jsonData)) {
          totalPublicacoes = jsonData.length;
        } else if ((jsonData as any).publicacoes) {
          totalPublicacoes = (jsonData as any).publicacoes.length;
        } else if ((jsonData as any).items) {
          totalPublicacoes = (jsonData as any).items.length;
        }
      } else {
        conteudo = await response.text();
        const matches = conteudo.match(/processo|intimação|citação/gi);
        totalPublicacoes = matches ? Math.floor(matches.length / 3) : 0;
      }

      const tamanhoBytes = contentLength ? parseInt(contentLength) : conteudo.length;

      await supabase
        .from("cadernos")
        .update({
          status: "sucesso",
          tamanho_bytes: tamanhoBytes,
          total_publicacoes: totalPublicacoes,
          url_arquivo: url,
        })
        .eq("id", caderno.id);

      if (params.processarRag) {
        await processarCadernoParaRAG(caderno.id, params.tribunal, params.data, conteudo);
      }

      await registrarLog({
        tipo: "caderno",
        acao: "download",
        entidade_tipo: "caderno",
        entidade_id: caderno.id,
        detalhes: { tribunal: params.tribunal, data: params.data, tipo: params.tipo, tamanho: tamanhoBytes, via },
        status: "sucesso",
        duracao_ms: Date.now() - inicio,
      });

      return {
        success: true,
        cadernoId: caderno.id,
        message: `Caderno baixado via ${via} (${totalPublicacoes} publicações)`,
        urlCaderno: url,
        tamanho: tamanhoBytes,
        totalPublicacoes,
      };
    };

    // MÉTODO 1: Edge Function primeiro (seguro e sem trafegar tokens no cliente)
    console.log("=== MÉTODO 1: Tentando via Edge Function ===");

    let edgeErrorMsg: string | null = null;

    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke("baixar-caderno", {
        body: params,
      });

      console.log("Edge Function - Resultado:", edgeResult?.success, edgeError);

      if (!edgeError && edgeResult?.success) {
        console.log("✅ Sucesso via Edge Function!");

        await supabase
          .from("cadernos")
          .update({
            status: "sucesso",
            tamanho_bytes: edgeResult.tamanho,
            total_publicacoes: edgeResult.totalPublicacoes,
            url_arquivo: edgeResult.url,
          })
          .eq("id", caderno.id);

        if (params.processarRag && edgeResult.conteudo) {
          await processarCadernoParaRAG(caderno.id, params.tribunal, params.data, edgeResult.conteudo);
        }

        await registrarLog({
          tipo: "caderno",
          acao: "download",
          entidade_tipo: "caderno",
          entidade_id: caderno.id,
          detalhes: {
            tribunal: params.tribunal,
            data: params.data,
            tipo: params.tipo,
            tamanho: edgeResult.tamanho,
            via: "edge_function",
          },
          status: "sucesso",
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

      edgeErrorMsg = edgeError?.message || edgeResult?.error || "Erro na Edge Function";
      console.log("❌ Edge Function falhou:", edgeErrorMsg);
    } catch (edgeFuncError) {
      edgeErrorMsg = edgeFuncError instanceof Error ? edgeFuncError.message : "Erro desconhecido";
      console.log("❌ Edge Function falhou (exceção):", edgeErrorMsg);
    }

    // MÉTODO 2: Fallback via navegador direto com timeout (pode falhar por CORS)
    console.log("=== MÉTODO 2: Tentando via navegador direto ===");
    console.log("URL:", url);

    try {
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: {
          Accept: "application/json, text/html, */*",
          "Cache-Control": "no-cache",
        },
      });

      console.log("Navegador - Status:", response.status);

      if (response.ok) {
        console.log("✅ Sucesso via navegador direto!");
        return await processarResposta(response, "navegador");
      }

      if (response.status === 404) {
        await supabase
          .from("cadernos")
          .update({ status: "erro", erro_mensagem: "Caderno não disponível para esta data" })
          .eq("id", caderno.id);

        return {
          success: false,
          cadernoId: caderno.id,
          error: "Caderno não disponível para esta data (404). Verifique se é um dia útil.",
        };
      }

      const browserError = `HTTP ${response.status}`;
      console.log("❌ Navegador falhou:", browserError);

      await supabase
        .from("cadernos")
        .update({ status: "erro", erro_mensagem: `Navegador: ${browserError} | Servidor: ${edgeErrorMsg}` })
        .eq("id", caderno.id);

      return {
        success: false,
        cadernoId: caderno.id,
        error: edgeErrorMsg ? `Servidor: ${edgeErrorMsg}` : browserError,
      };
    } catch (browserError) {
      const browserMsg = browserError instanceof Error ? browserError.message : "Erro de conexão";
      await supabase
        .from("cadernos")
        .update({ status: "erro", erro_mensagem: `Navegador: ${browserMsg} | Servidor: ${edgeErrorMsg}` })
        .eq("id", caderno.id);

      return {
        success: false,
        cadernoId: caderno.id,
        error: edgeErrorMsg ? `Servidor: ${edgeErrorMsg}` : browserMsg,
      };
    }
  } catch (error) {
    console.error("Erro ao baixar caderno:", error);

    await registrarLog({
      tipo: "caderno",
      acao: "download",
      entidade_tipo: "caderno",
      detalhes: { tribunal: params.tribunal, data: params.data, tipo: params.tipo },
      status: "erro",
      erro_mensagem: error instanceof Error ? error.message : String(error),
      duracao_ms: Date.now() - inicio,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// Processar conteúdo do caderno para RAG (pipeline padrão: documento + fila + embeddings)
async function processarCadernoParaRAG(cadernoId: string, tribunal: string, data: string, conteudo: string) {
  try {
    // Criar documento (inclui user_id via helper)
    const documento = await createDocumento({
      nome: `Caderno DJE - ${tribunal} - ${data}`,
      tipo: "caderno_dje",
      tribunal,
      origem: "dje",
      status: "processando",
      caderno_id: cadernoId,
      conteudo_texto: conteudo.substring(0, 10000),
      embedding_processado: false,
      tamanho_bytes: conteudo.length,
      tags: ["dje", tribunal.toLowerCase()],
    });

    // Criar item na fila
    await supabase.from("fila_processamento_rag").insert({
      documento_id: documento.id,
      caderno_id: cadernoId,
      prioridade: 6,
      status: "pendente",
    });

    // Disparar processamento de embeddings
    const { error } = await supabase.functions.invoke("processar-documento-rag", {
      body: {
        documento_id: documento.id,
        texto: conteudo,
        titulo: documento.nome,
      },
    });

    if (error) {
      console.error("Erro ao processar RAG do caderno:", error);
      return;
    }

    // Marcar caderno como processado para RAG (a função de processamento vai concluir o documento)
    await supabase.from("cadernos").update({ processado_rag: true }).eq("id", cadernoId);

    console.log(`Caderno enviado para processamento RAG: ${documento.id}`);
  } catch (error) {
    console.error("Erro ao processar para RAG:", error);
  }
}

// Buscar cadernos em processamento
export async function getCadernosEmProcessamento() {
  const { data, error } = await supabase
    .from("cadernos")
    .select("*")
    .eq("status", "processando")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

