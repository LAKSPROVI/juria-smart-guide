import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { action, updates } = await req.json();

    if (action === "get") {
      // Buscar configuração (sem retornar token no corpo completo)
      const { data, error } = await supabase
        .from("config_proxy")
        .select("id, nome, url_base, ativo, ultima_verificacao, status_ultimo_teste")
        .eq("nome", "proxy_brasil")
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: "Erro ao buscar config" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "update") {
      // Atualizar URL e status
      const { url_base, ativo } = updates;

      const { data, error } = await supabase
        .from("config_proxy")
        .update({
          url_base,
          ativo,
          updated_at: new Date().toISOString(),
        })
        .eq("nome", "proxy_brasil")
        .select("id, nome, url_base, ativo, ultima_verificacao, status_ultimo_teste")
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar config" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Configuração de proxy atualizada");

      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "test") {
      // Testar conexão com proxy (token fica seguro no backend)
      const { data: config } = await supabase
        .from("config_proxy")
        .select("url_base, token")
        .eq("nome", "proxy_brasil")
        .single();

      if (!config?.url_base) {
        return new Response(
          JSON.stringify({ sucesso: false, mensagem: "URL do proxy não configurada" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      try {
        const response = await fetch(`${config.url_base}/health`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.token || ""}`,
          },
        });

        const sucesso = response.ok;
        const testTime = new Date().toISOString();

        // Registrar resultado do teste
        await supabase
          .from("config_proxy")
          .update({
            ultima_verificacao: testTime,
            status_ultimo_teste: sucesso ? "ok" : "erro",
          })
          .eq("nome", "proxy_brasil");

        return new Response(
          JSON.stringify({
            sucesso,
            mensagem: sucesso ? "Proxy funcionando corretamente" : `Erro: ${response.status}`,
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (error) {
        const testTime = new Date().toISOString();

        await supabase
          .from("config_proxy")
          .update({
            ultima_verificacao: testTime,
            status_ultimo_teste: "timeout",
          })
          .eq("nome", "proxy_brasil");

        return new Response(
          JSON.stringify({
            sucesso: false,
            mensagem: error instanceof Error ? error.message : "Erro de conexão",
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Erro na função gerenciar-proxy:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
