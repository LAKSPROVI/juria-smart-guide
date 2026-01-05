import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Esta função deve ser chamada apenas pelo cron job interno ou por admins
// Verificar por service role key ou header especial de cron
async function verificarAutorizacao(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  
  // Se tem service role key, é chamada interna autorizada
  if (authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')) {
    return true;
  }
  
  // Verificar se é usuário autenticado admin
  if (authHeader) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (!error && user) {
      // Verificar se é admin
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      if (roles) {
        console.log(`Admin autorizado: ${user.email}`);
        return true;
      }
    }
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verificar autorização
  const autorizado = await verificarAutorizacao(req);
  if (!autorizado) {
    return new Response(
      JSON.stringify({ success: false, error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Iniciando execução de consultas agendadas...");

  try {
    // Buscar hora atual
    const agora = new Date();
    const horaAtual = agora.toTimeString().slice(0, 5); // "HH:MM"
    console.log("Hora atual:", horaAtual);

    // Buscar consultas ativas com recorrência diária que incluem esta hora
    const { data: consultas, error: consultasError } = await supabase
      .from('consultas')
      .select('*')
      .eq('ativo', true)
      .eq('recorrencia', 'diaria')
      .contains('horarios', [horaAtual]);

    if (consultasError) {
      console.error("Erro ao buscar consultas:", consultasError);
      throw consultasError;
    }

    console.log(`Encontradas ${consultas?.length || 0} consultas para executar`);

    if (!consultas || consultas.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhuma consulta agendada para este horário",
          horario: horaAtual 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração do proxy
    const { data: configProxy } = await supabase
      .from('config_proxy')
      .select('*')
      .eq('nome', 'proxy_brasil')
      .single();

    const proxyAtivo = configProxy?.ativo && configProxy?.url_base;
    console.log("Proxy ativo:", proxyAtivo);

    const resultados = [];

    for (const consulta of consultas) {
      console.log(`Executando consulta: ${consulta.nome} (${consulta.id})`);
      const inicio = Date.now();

      // Registrar execução agendada
      const { data: execucao } = await supabase
        .from('execucoes_agendadas')
        .insert({
          consulta_id: consulta.id,
          horario_agendado: horaAtual,
          status: 'executando',
          origem: 'cron',
        })
        .select()
        .single();

      try {
        let response;

        if (proxyAtivo) {
          // Consultar via proxy
          console.log("Consultando via proxy:", configProxy.url_base);
          const proxyResponse = await fetch(`${configProxy.url_base}/consulta`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${configProxy.token || ''}`,
            },
            body: JSON.stringify({
              siglaTribunal: consulta.tribunal,
              termo: consulta.termo,
              numeroOab: consulta.numero_oab,
              ufOab: consulta.uf_oab,
              dataInicial: consulta.data_inicial,
              dataFinal: consulta.data_final,
            }),
          });
          response = await proxyResponse.json();
        } else {
          // Tentar chamada direta (pode falhar por geolocalização)
          console.log("Tentando chamada direta à ComunicaAPI...");
          const urlParams = new URLSearchParams();
          urlParams.append("siglaTribunal", consulta.tribunal);
          if (consulta.termo) urlParams.append("nomeAdvogado", consulta.termo);
          if (consulta.numero_oab) urlParams.append("numeroOab", consulta.numero_oab);
          if (consulta.uf_oab) urlParams.append("ufOab", consulta.uf_oab);

          const hoje = new Date();
          const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
          urlParams.append("dataDisponibilizacaoInicio", consulta.data_inicial || trintaDiasAtras.toISOString().split('T')[0]);
          urlParams.append("dataDisponibilizacaoFim", consulta.data_final || hoje.toISOString().split('T')[0]);

          const apiResponse = await fetch(
            `https://comunicaapi.pje.jus.br/api/v1/comunicacao?${urlParams}`,
            {
              headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
              },
            }
          );

          if (apiResponse.status === 403) {
            throw new Error("Bloqueio geográfico - configure um proxy no Brasil");
          }

          if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.status}`);
          }

          const data = await apiResponse.json();
          const resultadosList = Array.isArray(data) ? data : data.comunicacoes || data.items || [];
          response = { success: true, data: resultadosList, total: resultadosList.length };
        }

        const duracao = Date.now() - inicio;
        const totalResultados = response.data?.length || 0;

        // Salvar resultados se houver
        if (response.success && response.data && response.data.length > 0) {
          const resultadosParaSalvar = response.data.map((r: Record<string, unknown>) => ({
            consulta_id: consulta.id,
            numero_processo: r.numeroProcesso || r.numero_processo,
            sigla_tribunal: r.siglaTribunal || r.sigla_tribunal || consulta.tribunal,
            nome_orgao: r.nomeOrgao || r.nome_orgao,
            tipo_comunicacao: r.tipoComunicacao || r.tipo_comunicacao,
            texto_mensagem: r.textoMensagem || r.texto_mensagem,
            data_disponibilizacao: r.dataDisponibilizacao || r.data_disponibilizacao,
            data_publicacao: r.dataPublicacao || r.data_publicacao,
            destinatarios: r.destinatarios,
            dados_completos: r,
            visualizado: false,
          }));

          await supabase.from('resultados_consultas').insert(resultadosParaSalvar);
        }

        // Atualizar execução como sucesso
        await supabase
          .from('execucoes_agendadas')
          .update({
            horario_executado: new Date().toISOString(),
            status: 'sucesso',
            resultados_encontrados: totalResultados,
            duracao_ms: duracao,
          })
          .eq('id', execucao.id);

        // Atualizar última execução da consulta
        await supabase
          .from('consultas')
          .update({ ultima_execucao: new Date().toISOString() })
          .eq('id', consulta.id);

        // Registrar log
        await supabase.from('system_logs').insert({
          tipo: 'consulta',
          acao: 'executar',
          entidade_tipo: 'consulta',
          entidade_id: consulta.id,
          detalhes: {
            nome: consulta.nome,
            tribunal: consulta.tribunal,
            termo: consulta.termo,
            resultados: totalResultados,
            via: proxyAtivo ? 'proxy' : 'direto',
          },
          origem: 'cron',
          status: 'sucesso',
          duracao_ms: duracao,
        });

        resultados.push({
          consulta_id: consulta.id,
          nome: consulta.nome,
          status: 'sucesso',
          resultados: totalResultados,
          duracao_ms: duracao,
        });

        console.log(`Consulta ${consulta.nome}: ${totalResultados} resultados em ${duracao}ms`);

      } catch (error) {
        const duracao = Date.now() - inicio;
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error(`Erro na consulta ${consulta.nome}:`, errorMsg);

        // Atualizar execução como erro
        await supabase
          .from('execucoes_agendadas')
          .update({
            horario_executado: new Date().toISOString(),
            status: 'erro',
            erro_mensagem: errorMsg,
            duracao_ms: duracao,
          })
          .eq('id', execucao.id);

        // Registrar log de erro
        await supabase.from('system_logs').insert({
          tipo: 'consulta',
          acao: 'executar',
          entidade_tipo: 'consulta',
          entidade_id: consulta.id,
          detalhes: {
            nome: consulta.nome,
            tribunal: consulta.tribunal,
            termo: consulta.termo,
          },
          origem: 'cron',
          status: 'erro',
          erro_mensagem: errorMsg,
          duracao_ms: duracao,
        });

        resultados.push({
          consulta_id: consulta.id,
          nome: consulta.nome,
          status: 'erro',
          erro: errorMsg,
          duracao_ms: duracao,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        horario: horaAtual,
        consultas_executadas: resultados.length,
        resultados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro geral:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno",
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});