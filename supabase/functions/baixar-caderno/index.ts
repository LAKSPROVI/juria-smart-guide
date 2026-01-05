import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CadernoParams {
  tribunal: string;
  data: string;
  tipo: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: CadernoParams = await req.json();
    const { tribunal, data, tipo } = params;
    
    if (!tribunal || !data || !tipo) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros incompletos" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Converter data YYYY-MM-DD para YYYYMMDD
    const dataFormatada = data.replace(/-/g, '');
    
    // URL do caderno
    const url = `https://comunicaapi.pje.jus.br/api/v1/caderno/${tribunal}/${dataFormatada}/${tipo}`;
    
    console.log("Baixando caderno:", url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/html, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      // Mensagens de erro mais informativas
      let errorMessage = `Erro na API: HTTP ${response.status}`;
      let suggestion = "";
      
      if (response.status === 403) {
        errorMessage = "Acesso bloqueado pela API do PJe (HTTP 403)";
        suggestion = "A API ComunicaAPI bloqueia requisições de servidores fora do Brasil. Configure um proxy brasileiro nas Configurações para contornar essa restrição.";
      } else if (response.status === 404) {
        errorMessage = "Caderno não encontrado (HTTP 404)";
        suggestion = "Verifique se a data é um dia útil (não fim de semana ou feriado) e se o tribunal está correto.";
      } else if (response.status === 400) {
        errorMessage = "Requisição inválida (HTTP 400)";
        suggestion = "A data pode ser um fim de semana/feriado ou o formato do tribunal pode estar incorreto.";
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMessage = `Servidor do PJe indisponível (HTTP ${response.status})`;
        suggestion = "Tente novamente em alguns minutos.";
      }
      
      console.log("Erro:", errorMessage, suggestion);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          suggestion,
          httpStatus: response.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    
    let conteudo = '';
    let totalPublicacoes = 0;
    
    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      conteudo = JSON.stringify(jsonData, null, 2);
      
      if (Array.isArray(jsonData)) {
        totalPublicacoes = jsonData.length;
      } else if (jsonData.publicacoes) {
        totalPublicacoes = jsonData.publicacoes.length;
      } else if (jsonData.items) {
        totalPublicacoes = jsonData.items.length;
      }
    } else {
      conteudo = await response.text();
      const matches = conteudo.match(/processo|intimação|citação/gi);
      totalPublicacoes = matches ? Math.floor(matches.length / 3) : 0;
    }
    
    const tamanho = contentLength ? parseInt(contentLength) : conteudo.length;
    
    console.log(`Caderno baixado: ${tamanho} bytes, ~${totalPublicacoes} publicações`);
    
    return new Response(
      JSON.stringify({
        success: true,
        url,
        tamanho,
        totalPublicacoes,
        conteudo: conteudo.substring(0, 100000), // Limitar conteúdo retornado
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error("Erro:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        suggestion: "Verifique sua conexão ou tente novamente mais tarde."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
