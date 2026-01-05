import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessarRequest {
  documento_id?: string;
  caderno_id?: string;
  texto?: string;
  numero_processo?: string;
  titulo?: string;
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

// Configurações de chunking otimizadas
const CHUNK_CONFIG = {
  tamanho_alvo: 512, // tokens aproximados
  overlap: 100, // tokens de overlap
  min_tamanho: 100,
  max_tamanho: 1000,
};

// Dividir texto em chunks com overlap
function dividirEmChunks(texto: string): Array<{ conteudo: string; inicio: number; fim: number }> {
  const chunks: Array<{ conteudo: string; inicio: number; fim: number }> = [];
  
  // Dividir por parágrafos primeiro
  const paragrafos = texto.split(/\n\n+/);
  let textoAtual = '';
  let inicioAtual = 0;
  let posicaoGlobal = 0;

  for (const paragrafo of paragrafos) {
    const paragrafoLimpo = paragrafo.trim();
    if (!paragrafoLimpo) {
      posicaoGlobal += paragrafo.length + 2;
      continue;
    }

    // Estimar tokens (aproximadamente 4 caracteres por token em português)
    const tokensAtuais = textoAtual.length / 4;
    const tokensNovos = paragrafoLimpo.length / 4;

    if (tokensAtuais + tokensNovos > CHUNK_CONFIG.tamanho_alvo && textoAtual.length > 0) {
      // Salvar chunk atual
      chunks.push({
        conteudo: textoAtual.trim(),
        inicio: inicioAtual,
        fim: posicaoGlobal,
      });

      // Iniciar novo chunk com overlap
      const palavras = textoAtual.split(' ');
      const palavrasOverlap = palavras.slice(-Math.floor(CHUNK_CONFIG.overlap / 4));
      textoAtual = palavrasOverlap.join(' ') + '\n\n' + paragrafoLimpo;
      inicioAtual = posicaoGlobal - palavrasOverlap.join(' ').length;
    } else {
      textoAtual += (textoAtual ? '\n\n' : '') + paragrafoLimpo;
    }

    posicaoGlobal += paragrafo.length + 2;
  }

  // Adicionar último chunk
  if (textoAtual.trim().length >= CHUNK_CONFIG.min_tamanho) {
    chunks.push({
      conteudo: textoAtual.trim(),
      inicio: inicioAtual,
      fim: posicaoGlobal,
    });
  }

  return chunks;
}

// Gerar contexto resumido usando IA (Contextual Retrieval)
async function gerarContextoChunk(
  chunk: string, 
  documentoCompleto: string, 
  tituloDocumento: string,
  apiKey: string
): Promise<string> {
  try {
    const prompt = `Documento: "${tituloDocumento}"

Trecho do documento:
${chunk.substring(0, 1500)}

Forneça um contexto sucinto (máximo 2 frases) que situe este trecho dentro do documento completo. 
Responda apenas com o contexto, sem explicações adicionais.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Erro ao gerar contexto:', response.status);
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('Erro ao gerar contexto:', e);
    return '';
  }
}

// Gerar embedding
async function gerarEmbedding(texto: string, apiKey: string): Promise<number[]> {
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

// Extrair número de processo do texto
function extrairNumeroProcesso(texto: string): string | null {
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
  const matches = texto.match(regex);
  return matches ? matches[0] : null;
}

// Detectar seções no texto jurídico
function detectarSecoes(texto: string): Array<{ titulo: string; inicio: number; fim: number }> {
  const secoes: Array<{ titulo: string; inicio: number; fim: number }> = [];
  const regexSecao = /^(EMENTA|RELATÓRIO|VOTO|ACÓRDÃO|DECISÃO|DESPACHO|SENTENÇA|INTIMAÇÃO|CITAÇÃO|EDITAL)[:\s]/gim;
  
  let match;
  let ultimaPosicao = 0;
  
  while ((match = regexSecao.exec(texto)) !== null) {
    if (secoes.length > 0) {
      secoes[secoes.length - 1].fim = match.index;
    }
    secoes.push({
      titulo: match[1].toUpperCase(),
      inicio: match.index,
      fim: texto.length,
    });
    ultimaPosicao = match.index;
  }
  
  return secoes;
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

    // Usar service role para operações de escrita em chunks
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessarRequest = await req.json();
    const { documento_id, caderno_id, texto, numero_processo, titulo } = body;

    let textoParaProcessar = texto || '';
    let tituloDocumento = titulo || 'Documento Jurídico';
    let docId = documento_id;

    // Buscar texto do documento se não fornecido
    if (!textoParaProcessar && documento_id) {
      const { data: doc, error } = await supabaseClient
        .from('documentos')
        .select('conteudo_texto, nome, numero_processo')
        .eq('id', documento_id)
        .single();

      if (error || !doc) {
        throw new Error('Documento não encontrado');
      }

      textoParaProcessar = doc.conteudo_texto || '';
      tituloDocumento = doc.nome;
    }

    if (!textoParaProcessar) {
      throw new Error('Nenhum texto para processar');
    }

    console.log(`Processando documento: ${tituloDocumento}, ${textoParaProcessar.length} caracteres`);

    // Atualizar status na fila
    if (documento_id || caderno_id) {
      await supabaseAdmin
        .from('fila_processamento_rag')
        .update({ 
          status: 'processando',
          iniciado_em: new Date().toISOString()
        })
        .or(`documento_id.eq.${documento_id},caderno_id.eq.${caderno_id}`);
    }

    // Detectar seções
    const secoes = detectarSecoes(textoParaProcessar);
    console.log(`Detectadas ${secoes.length} seções`);

    // Dividir em chunks
    const chunks = dividirEmChunks(textoParaProcessar);
    console.log(`Dividido em ${chunks.length} chunks`);

    // Atualizar total de chunks
    if (documento_id || caderno_id) {
      await supabaseAdmin
        .from('fila_processamento_rag')
        .update({ total_chunks: chunks.length })
        .or(`documento_id.eq.${documento_id},caderno_id.eq.${caderno_id}`);
    }

    // Processar cada chunk
    const resultados = [];
    let chunksProcessados = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Determinar seção do chunk
        const secaoAtual = secoes.find(s => chunk.inicio >= s.inicio && chunk.inicio < s.fim);
        
        // Gerar contexto resumido (Contextual Retrieval)
        const contextoResumo = await gerarContextoChunk(
          chunk.conteudo,
          textoParaProcessar.substring(0, 3000),
          tituloDocumento,
          apiKey
        );

        // Texto para embedding: contexto + conteúdo
        const textoEmbedding = contextoResumo 
          ? `${contextoResumo}\n\n${chunk.conteudo}`
          : chunk.conteudo;

        // Gerar embedding
        const embedding = await gerarEmbedding(textoEmbedding, apiKey);

        // Extrair número de processo do chunk
        const processoChunk = numero_processo || extrairNumeroProcesso(chunk.conteudo);

        // Salvar chunk no banco (usando service role)
        const { data: chunkSalvo, error: erroChunk } = await supabaseAdmin
          .from('documento_chunks')
          .insert({
            documento_id: docId,
            chunk_index: i,
            conteudo: chunk.conteudo,
            contexto_resumo: contextoResumo,
            embedding: JSON.stringify(embedding),
            numero_processo: processoChunk,
            titulo_secao: secaoAtual?.titulo,
            tokens_count: Math.round(chunk.conteudo.length / 4),
            chunk_type: 'content',
            metadata: {
              inicio: chunk.inicio,
              fim: chunk.fim,
              documento_titulo: tituloDocumento,
              secao: secaoAtual?.titulo,
            },
          })
          .select('id')
          .single();

        if (erroChunk) {
          console.error(`Erro ao salvar chunk ${i}:`, erroChunk);
          resultados.push({ index: i, success: false, error: erroChunk.message });
        } else {
          resultados.push({ index: i, success: true, id: chunkSalvo.id });
          chunksProcessados++;
        }

        // Atualizar progresso
        if ((documento_id || caderno_id) && i % 5 === 0) {
          await supabaseAdmin
            .from('fila_processamento_rag')
            .update({ 
              chunks_processados: chunksProcessados,
              progresso: Math.round((chunksProcessados / chunks.length) * 100)
            })
            .or(`documento_id.eq.${documento_id},caderno_id.eq.${caderno_id}`);
        }

      } catch (e) {
        console.error(`Erro ao processar chunk ${i}:`, e);
        resultados.push({ 
          index: i, 
          success: false, 
          error: e instanceof Error ? e.message : 'Erro desconhecido' 
        });
      }

      // Delay para não sobrecarregar a API
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Atualizar status final
    if (documento_id) {
      await supabaseClient
        .from('documentos')
        .update({ 
          embedding_processado: true,
          status: 'processado'
        })
        .eq('id', documento_id);
    }

    if (documento_id || caderno_id) {
      await supabaseAdmin
        .from('fila_processamento_rag')
        .update({ 
          status: 'concluido',
          chunks_processados: chunksProcessados,
          progresso: 100,
          finalizado_em: new Date().toISOString()
        })
        .or(`documento_id.eq.${documento_id},caderno_id.eq.${caderno_id}`);
    }

    console.log(`Processamento concluído: ${chunksProcessados}/${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        documento_id: docId,
        total_chunks: chunks.length,
        chunks_processados: chunksProcessados,
        secoes_detectadas: secoes.map(s => s.titulo),
        resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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