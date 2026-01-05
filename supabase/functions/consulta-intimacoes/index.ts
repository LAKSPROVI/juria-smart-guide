import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Verificar autenticação do usuário
async function verificarAutenticacao(req: Request): Promise<{ user: any; supabaseClient: any } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return { user, supabaseClient };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const auth = await verificarAutenticacao(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Autenticação necessária",
          data: []
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { user } = auth;
    console.log(`Usuário autenticado: ${user.email}`);

    const params: ConsultaParams = await req.json();
    
    console.log("Recebendo requisição de consulta:", JSON.stringify(params));

    // Validar parâmetros obrigatórios
    if (!params.siglaTribunal) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Tribunal é obrigatório",
          data: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!params.termo && !params.numeroOab) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Informe o termo de busca ou número da OAB",
          data: []
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Construir URL com parâmetros
    const baseUrl = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
    const urlParams = new URLSearchParams();

    urlParams.append("siglaTribunal", params.siglaTribunal);
    
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
    console.log("Consultando ComunicaAPI:", fullUrl);

    // Tentar com diferentes User-Agents para evitar bloqueio
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    console.log("Status da resposta:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da API:", response.status, errorText.substring(0, 200));
      
      // Verificar se é bloqueio de geolocalização
      if (response.status === 403 && errorText.includes("CloudFront")) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "A API do PJe está bloqueando requisições do servidor. Isso pode ser temporário ou uma restrição geográfica.",
            details: "Erro 403 - CloudFront",
            data: []
          }),
          { 
            status: 200, // Retornamos 200 para o frontend tratar o erro graciosamente
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Erro 400 geralmente significa parâmetros inválidos
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Parâmetros de busca inválidos. Verifique o tribunal e as datas.",
            data: []
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Erro 404 significa que não encontrou resultados
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: true,
            data: [],
            parametros: params,
            total: 0,
            message: "Nenhuma intimação encontrada para os critérios informados."
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Erro na API do PJe: ${response.status}`,
          data: []
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const data = await response.json();
    
    // A API pode retornar objeto com array dentro ou array direto
    let resultados = [];
    if (Array.isArray(data)) {
      resultados = data;
    } else if (data && typeof data === 'object') {
      // Verificar se há uma propriedade que contém os resultados
      if (data.comunicacoes && Array.isArray(data.comunicacoes)) {
        resultados = data.comunicacoes;
      } else if (data.items && Array.isArray(data.items)) {
        resultados = data.items;
      } else if (data.content && Array.isArray(data.content)) {
        resultados = data.content;
      } else {
        // Se for um objeto único, colocar em array
        resultados = [data];
      }
    }
    
    console.log("Resultados encontrados:", resultados.length);

    return new Response(
      JSON.stringify({
        success: true,
        data: resultados,
        parametros: {
          ...params,
          dataInicial,
          dataFinal,
        },
        total: resultados.length
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
        success: false,
        error: "Erro interno ao processar requisição",
        message: errorMessage,
        data: []
      }),
      { 
        status: 200, // Retornamos 200 para o frontend tratar
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});