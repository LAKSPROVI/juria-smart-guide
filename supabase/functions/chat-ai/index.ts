import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const systemPrompt = `Você é um assistente jurídico especializado em análise de publicações de Diários de Justiça Eletrônicos brasileiros. 

INSTRUÇÕES:
- Cite sempre a fonte quando disponível (número do processo, data de publicação, tribunal)
- Seja preciso e objetivo
- Se não houver informação suficiente, diga claramente
- Formate datas no padrão brasileiro (dd/mm/aaaa)
- Use linguagem jurídica apropriada mas acessível
- Destaque prazos e informações críticas em negrito quando possível
- Quando analisar documentos, identifique: partes, advogados, prazos, decisões importantes

${context ? `CONTEXTO DOS DOCUMENTOS DISPONÍVEIS:\n${context}` : 'Nenhum documento específico foi carregado no contexto.'}`;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log("Enviando para Lovable AI Gateway...");

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
