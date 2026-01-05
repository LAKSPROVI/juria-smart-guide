import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsultaParams {
  termo?: string;
  numeroOab?: string;
  ufOab?: string;
  siglaTribunal?: string;
  dataInicial?: string;
  dataFinal?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: ConsultaParams = await req.json();
    
    console.log("Recebendo requisição de consulta:", JSON.stringify(params));

    // Construir URL com parâmetros
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
    
    if (params.dataInicial) {
      urlParams.append("dataDisponibilizacaoInicio", params.dataInicial);
    }
    
    if (params.dataFinal) {
      urlParams.append("dataDisponibilizacaoFim", params.dataFinal);
    }

    const fullUrl = `${baseUrl}?${urlParams.toString()}`;
    console.log("Consultando ComunicaAPI:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    console.log("Status da resposta:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API:", errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Erro na API: ${response.status}`, 
          details: errorText,
          url: fullUrl
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const data = await response.json();
    console.log("Resultados encontrados:", Array.isArray(data) ? data.length : "objeto retornado");

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        parametros: params,
        total: Array.isArray(data) ? data.length : 1
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Erro na execução:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    
    return new Response(
      JSON.stringify({ 
        error: "Erro interno ao processar requisição",
        message: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
