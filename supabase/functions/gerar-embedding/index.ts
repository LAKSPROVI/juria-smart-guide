import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  texto: string;
  chunk_id?: string;
  cache?: boolean;
}

interface EmbeddingBatchRequest {
  textos: Array<{
    texto: string;
    chunk_id?: string;
  }>;
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

// Gerar embedding usando Lovable AI Gateway (Gemini)
async function gerarEmbedding(texto: string, apiKey: string): Promise<number[]> {
  // Usar modelo de embedding do Gemini via gateway
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texto.substring(0, 8000), // Limitar tamanho
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao gerar embedding:', response.status, errorText);
    throw new Error(`Erro ao gerar embedding: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const auth = await verificarAutenticacao(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user, supabaseClient } = auth;
    console.log(`Usuário autenticado: ${user.email}`);

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Usar service role para operações em chunks
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get('content-type') || '';
    const body = await req.json();

    // Verificar se é batch ou single
    if (body.textos && Array.isArray(body.textos)) {
      // Processamento em lote
      const { textos } = body as EmbeddingBatchRequest;
      console.log(`Gerando ${textos.length} embeddings em lote...`);

      const resultados = [];
      for (const item of textos) {
        try {
          const embedding = await gerarEmbedding(item.texto, apiKey);
          
          // Se tem chunk_id, atualizar no banco (usando service role)
          if (item.chunk_id) {
            const { error } = await supabaseAdmin
              .from('documento_chunks')
              .update({ embedding: JSON.stringify(embedding) })
              .eq('id', item.chunk_id);
            
            if (error) {
              console.error('Erro ao salvar embedding:', error);
            }
          }

          resultados.push({
            chunk_id: item.chunk_id,
            success: true,
            embedding_length: embedding.length,
          });
        } catch (e) {
          console.error('Erro em item do lote:', e);
          resultados.push({
            chunk_id: item.chunk_id,
            success: false,
            error: e instanceof Error ? e.message : 'Erro desconhecido',
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          total: textos.length,
          resultados,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Processamento único
      const { texto, chunk_id, cache } = body as EmbeddingRequest;
      
      if (!texto) {
        throw new Error('Texto é obrigatório');
      }

      console.log('Gerando embedding para texto de', texto.length, 'caracteres');

      // Verificar cache se solicitado
      if (cache) {
        const queryHash = texto.toLowerCase().trim();
        const { data: cached } = await supabaseAdmin
          .from('query_embeddings_cache')
          .select('embedding')
          .eq('query_hash', queryHash)
          .single();

        if (cached?.embedding) {
          console.log('Embedding encontrado no cache');
          
          // Atualizar contador de uso
          await supabaseAdmin
            .from('query_embeddings_cache')
            .update({ 
              hit_count: supabaseAdmin.rpc('increment_hit_count'),
              last_used_at: new Date().toISOString()
            })
            .eq('query_hash', queryHash);

          return new Response(
            JSON.stringify({
              success: true,
              embedding: cached.embedding,
              cached: true,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Gerar novo embedding
      const embedding = await gerarEmbedding(texto, apiKey);

      // Salvar no chunk se fornecido (usando service role)
      if (chunk_id) {
        const { error } = await supabaseAdmin
          .from('documento_chunks')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', chunk_id);
        
        if (error) {
          console.error('Erro ao salvar embedding no chunk:', error);
        }
      }

      // Salvar no cache se solicitado
      if (cache) {
        await supabaseAdmin
          .from('query_embeddings_cache')
          .upsert({
            query_text: texto.substring(0, 1000),
            embedding: JSON.stringify(embedding),
          }, { onConflict: 'query_hash' });
      }

      return new Response(
        JSON.stringify({
          success: true,
          embedding,
          cached: false,
          dimensions: embedding.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Erro na função:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});