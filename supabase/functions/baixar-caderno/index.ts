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
        'User-Agent': 'Mozilla/5.0 (compatible; CadernoBot/1.0)',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Caderno não disponível para esta data" 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro na API: HTTP ${response.status}` 
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
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
