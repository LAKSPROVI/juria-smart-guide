import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
}

// Buscar contexto relevante do RAG baseado na pergunta do usuário
async function buscarContextoRAG(supabase: any, pergunta: string): Promise<string> {
  try {
    // Extrair termos de busca da pergunta
    const termos = pergunta.toLowerCase()
      .replace(/[?!.,;:]/g, '')
      .split(' ')
      .filter(t => t.length > 3);
    
    // Buscar chunks relevantes
    let query = supabase
      .from('documento_chunks')
      .select('conteudo, numero_processo, metadata')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Se tem número de processo específico na pergunta
    const processoMatch = pergunta.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
    if (processoMatch) {
      query = supabase
        .from('documento_chunks')
        .select('conteudo, numero_processo, metadata')
        .ilike('numero_processo', `%${processoMatch[0]}%`)
        .limit(5);
    }
    
    const { data: chunks, error } = await query;
    
    if (error || !chunks || chunks.length === 0) {
      // Buscar também nos resultados de consultas recentes
      const { data: resultados, error: e2 } = await supabase
        .from('resultados_consultas')
        .select('numero_processo, sigla_tribunal, nome_orgao, tipo_comunicacao, texto_mensagem, data_disponibilizacao')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (e2 || !resultados || resultados.length === 0) {
        return '';
      }
      
      // Formatar resultados como contexto
      return resultados.map((r: any, i: number) => `
[RESULTADO ${i + 1}]
Processo: ${r.numero_processo || 'Não informado'}
Tribunal: ${r.sigla_tribunal || 'Não informado'}
Órgão: ${r.nome_orgao || 'Não informado'}
Tipo: ${r.tipo_comunicacao || 'Não informado'}
Data: ${r.data_disponibilizacao || 'Não informada'}
Conteúdo: ${r.texto_mensagem?.substring(0, 500) || 'Sem texto'}
`).join('\n---\n');
    }
    
    // Formatar chunks como contexto
    return chunks.map((c: any, i: number) => `
[DOCUMENTO ${i + 1}]
${c.conteudo}
`).join('\n---\n');
    
  } catch (e) {
    console.error('Erro ao buscar contexto RAG:', e);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context }: ChatRequest = await req.json();
    
    console.log("Recebendo requisição de chat:", messages.length, "mensagens");

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Criar cliente Supabase para buscar contexto do RAG
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Pegar a última mensagem do usuário para buscar contexto relevante
    const ultimaMensagem = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Buscar contexto do RAG
    const contextoRAG = await buscarContextoRAG(supabase, ultimaMensagem);
    
    // Combinar contexto fornecido com o do RAG
    const contextoFinal = [context, contextoRAG].filter(Boolean).join('\n\n---\n\n');

    const systemPrompt = `Você é um assistente jurídico especializado em análise de publicações de Diários de Justiça Eletrônicos brasileiros. 

INSTRUÇÕES:
- Cite sempre a fonte quando disponível (número do processo, data de publicação, tribunal)
- Seja preciso e objetivo
- Se não houver informação suficiente, diga claramente
- Formate datas no padrão brasileiro (dd/mm/aaaa)
- Use linguagem jurídica apropriada mas acessível
- Destaque prazos e informações críticas em negrito quando possível
- Quando analisar documentos, identifique: partes, advogados, prazos, decisões importantes
- Use o contexto abaixo para responder às perguntas do usuário

${contextoFinal ? `CONTEXTO DOS DOCUMENTOS E INTIMAÇÕES DISPONÍVEIS:\n${contextoFinal}` : 'Nenhum documento específico foi carregado no contexto. Busque informações gerais ou solicite que o usuário forneça mais detalhes.'}`;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log("Enviando para Lovable AI Gateway... Contexto:", contextoFinal.length, "chars");

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: fullMessages,
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da AI Gateway:", response.status, errorText);
      throw new Error(`Erro na AI Gateway: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta recebida com sucesso");

    const assistantMessage = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        usage: data.usage,
        hasContext: contextoFinal.length > 0,
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
        message: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});