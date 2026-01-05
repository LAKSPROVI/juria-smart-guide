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
  filtro_documento_id?: string;
  filtro_numero_processo?: string;
}

interface ChunkResultado {
  id: string;
  documento_id: string;
  conteudo: string;
  contexto_resumo: string;
  numero_processo: string;
  metadata: any;
  titulo_secao: string;
  pagina_inicio: number;
  similarity: number;
  text_rank: number;
  combined_score: number;
}

// Gerar embedding para a query
async function gerarEmbeddingQuery(texto: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texto.substring(0, 8000),
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao gerar embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Re-ranking usando LLM para melhorar relevância
async function rerankarResultados(
  pergunta: string,
  chunks: ChunkResultado[],
  apiKey: string,
  topK: number = 5
): Promise<ChunkResultado[]> {
  if (chunks.length <= topK) return chunks;

  try {
    const prompt = `Você é um assistente de re-ranking. Dado a pergunta do usuário e os documentos abaixo, ordene os documentos por relevância (mais relevante primeiro).

PERGUNTA: ${pergunta}

DOCUMENTOS:
${chunks.slice(0, 15).map((c, i) => `[${i}] ${c.conteudo.substring(0, 300)}...`).join('\n\n')}

Responda APENAS com os índices dos ${topK} documentos mais relevantes, separados por vírgula. Exemplo: 2,0,5,1,3`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.log('Re-ranking falhou, usando ordem original');
      return chunks.slice(0, topK);
    }

    const data = await response.json();
    const resposta = data.choices?.[0]?.message?.content || '';
    const indices = resposta.match(/\d+/g)?.map(Number) || [];
    
    const reordenados: ChunkResultado[] = [];
    for (const idx of indices) {
      if (idx < chunks.length && !reordenados.includes(chunks[idx])) {
        reordenados.push(chunks[idx]);
      }
      if (reordenados.length >= topK) break;
    }

    // Completar com restantes se necessário
    for (const chunk of chunks) {
      if (!reordenados.includes(chunk)) {
        reordenados.push(chunk);
      }
      if (reordenados.length >= topK) break;
    }

    return reordenados;
  } catch (e) {
    console.error('Erro no re-ranking:', e);
    return chunks.slice(0, topK);
  }
}

// Buscar contexto relevante do RAG usando busca híbrida vetorial + full-text
async function buscarContextoRAG(
  supabase: any, 
  pergunta: string, 
  apiKey: string,
  filtroDocumentoId?: string,
  filtroNumeroProcesso?: string
): Promise<{ contexto: string; fontes: any[] }> {
  try {
    // Verificar se tem número de processo na pergunta
    const processoMatch = pergunta.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
    const numeroProcesso = filtroNumeroProcesso || (processoMatch ? processoMatch[0] : null);

    // Verificar se existem chunks com embeddings
    const { count } = await supabase
      .from('documento_chunks')
      .select('id', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    if (count && count > 0) {
      // Usar busca híbrida vetorial + full-text
      console.log('Usando busca híbrida vetorial...');
      
      // Gerar embedding da pergunta
      const queryEmbedding = await gerarEmbeddingQuery(pergunta, apiKey);
      
      // Busca híbrida
      const { data: chunks, error } = await supabase.rpc('busca_hibrida_rag', {
        query_embedding: JSON.stringify(queryEmbedding),
        query_text: pergunta,
        match_threshold: 0.3,
        match_count: 20,
        filtro_documento_id: filtroDocumentoId || null,
        filtro_numero_processo: numeroProcesso,
      });

      if (error) {
        console.error('Erro na busca híbrida:', error);
      } else if (chunks && chunks.length > 0) {
        console.log(`Encontrados ${chunks.length} chunks via busca híbrida`);
        
        // Re-ranking para melhorar resultados
        const chunksRerankeados = await rerankarResultados(pergunta, chunks, apiKey, 8);
        
        const fontes = chunksRerankeados.map((c: ChunkResultado) => ({
          id: c.id,
          numero_processo: c.numero_processo,
          secao: c.titulo_secao,
          score: c.combined_score,
          documento_id: c.documento_id,
        }));

        const contexto = chunksRerankeados.map((c: ChunkResultado, i: number) => {
          const header = [
            c.numero_processo ? `Processo: ${c.numero_processo}` : null,
            c.titulo_secao ? `Seção: ${c.titulo_secao}` : null,
            c.contexto_resumo ? `Contexto: ${c.contexto_resumo}` : null,
          ].filter(Boolean).join(' | ');
          
          return `[DOCUMENTO ${i + 1}]${header ? `\n${header}` : ''}\n${c.conteudo}`;
        }).join('\n\n---\n\n');

        return { contexto, fontes };
      }
    }

    // Fallback: busca por texto simples se não há embeddings
    console.log('Usando busca por texto simples (fallback)...');
    
    let query = supabase
      .from('documento_chunks')
      .select('id, conteudo, numero_processo, metadata, titulo_secao, contexto_resumo')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (numeroProcesso) {
      query = query.ilike('numero_processo', `%${numeroProcesso}%`);
    }

    const { data: chunks, error } = await query;
    
    if (!error && chunks && chunks.length > 0) {
      const fontes = chunks.map((c: any) => ({
        id: c.id,
        numero_processo: c.numero_processo,
        secao: c.titulo_secao,
      }));

      const contexto = chunks.map((c: any, i: number) => `
[DOCUMENTO ${i + 1}]
${c.numero_processo ? `Processo: ${c.numero_processo}` : ''}
${c.titulo_secao ? `Seção: ${c.titulo_secao}` : ''}
${c.conteudo}
`).join('\n---\n');

      return { contexto, fontes };
    }

    // Último fallback: resultados de consultas
    const { data: resultados, error: e2 } = await supabase
      .from('resultados_consultas')
      .select('numero_processo, sigla_tribunal, nome_orgao, tipo_comunicacao, texto_mensagem, data_disponibilizacao')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (e2 || !resultados || resultados.length === 0) {
      return { contexto: '', fontes: [] };
    }
    
    const fontes = resultados.map((r: any) => ({
      numero_processo: r.numero_processo,
      tribunal: r.sigla_tribunal,
    }));

    const contexto = resultados.map((r: any, i: number) => `
[RESULTADO ${i + 1}]
Processo: ${r.numero_processo || 'Não informado'}
Tribunal: ${r.sigla_tribunal || 'Não informado'}
Órgão: ${r.nome_orgao || 'Não informado'}
Tipo: ${r.tipo_comunicacao || 'Não informado'}
Data: ${r.data_disponibilizacao || 'Não informada'}
Conteúdo: ${r.texto_mensagem?.substring(0, 500) || 'Sem texto'}
`).join('\n---\n');

    return { contexto, fontes };
    
  } catch (e) {
    console.error('Erro ao buscar contexto RAG:', e);
    return { contexto: '', fontes: [] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, filtro_documento_id, filtro_numero_processo }: ChatRequest = await req.json();
    
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
    
    // Buscar contexto do RAG com busca híbrida
    const { contexto: contextoRAG, fontes } = await buscarContextoRAG(
      supabase, 
      ultimaMensagem, 
      apiKey,
      filtro_documento_id,
      filtro_numero_processo
    );
    
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
        fontes: fontes,
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