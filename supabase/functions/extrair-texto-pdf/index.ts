import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtrairRequest {
  documento_id?: string;
  url_arquivo?: string;
  metodo: 'pdf-parse' | 'document-ai' | 'tesseract';
  processar_rag?: boolean;
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

// Extrair texto de PDF usando pdf-lib (básico, para PDFs nato-digitais)
async function extrairTextoPdfBasico(pdfBytes: Uint8Array): Promise<string> {
  // Método simples: buscar strings de texto no PDF
  // PDFs nato-digitais contêm texto como strings entre parênteses
  const decoder = new TextDecoder('latin1');
  const content = decoder.decode(pdfBytes);
  
  const textos: string[] = [];
  
  // Buscar blocos de texto (BT...ET)
  const btRegex = /BT[\s\S]*?ET/g;
  const matches = content.match(btRegex) || [];
  
  for (const block of matches) {
    // Extrair texto entre parênteses (formato mais comum)
    const textMatches = block.match(/\(([^)]*)\)/g) || [];
    for (const tm of textMatches) {
      const texto = tm.slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      if (texto.trim()) {
        textos.push(texto);
      }
    }
    
    // Extrair texto hexadecimal (formato alternativo)
    const hexMatches = block.match(/<([0-9A-Fa-f]+)>/g) || [];
    for (const hm of hexMatches) {
      try {
        const hex = hm.slice(1, -1);
        let texto = '';
        for (let i = 0; i < hex.length; i += 2) {
          const charCode = parseInt(hex.substr(i, 2), 16);
          if (charCode >= 32 && charCode < 127) {
            texto += String.fromCharCode(charCode);
          }
        }
        if (texto.trim()) {
          textos.push(texto);
        }
      } catch (e) {
        // Ignorar erros de parsing hex
      }
    }
  }
  
  // Limpar e juntar texto
  let resultado = textos.join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Se não encontrou texto, o PDF pode ser digitalizado
  if (resultado.length < 100) {
    console.log('PDF parece ser digitalizado (pouco texto extraído)');
    return '';
  }
  
  return resultado;
}

// Placeholder para Google Document AI (requer API key)
async function extrairTextoDocumentAI(pdfBytes: Uint8Array, apiKey: string): Promise<string> {
  // TODO: Implementar quando API key for configurada
  // https://cloud.google.com/document-ai/docs/reference/rest
  throw new Error('Google Document AI não configurado. Configure a API key nas configurações.');
}

// Placeholder para Tesseract OCR
async function extrairTextoTesseract(pdfBytes: Uint8Array): Promise<string> {
  // Tesseract requer conversão de PDF para imagem primeiro
  // Isso é complexo em Deno sem dependências nativas
  throw new Error('Tesseract OCR não disponível no ambiente atual. Use pdf-parse ou Document AI.');
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

    const body: ExtrairRequest = await req.json();
    const { documento_id, url_arquivo, metodo, processar_rag = true } = body;

    console.log(`Extraindo texto com método: ${metodo}`);

    let pdfBytes: Uint8Array | null = null;
    let textoExtraido = '';
    let docId = documento_id;

    // Buscar documento do banco se ID fornecido
    if (documento_id && !url_arquivo) {
      const { data: doc, error } = await supabaseClient
        .from('documentos')
        .select('url_arquivo, nome, conteudo_texto')
        .eq('id', documento_id)
        .single();

      if (error || !doc) {
        throw new Error('Documento não encontrado');
      }

      // Se já tem texto, retornar
      if (doc.conteudo_texto && doc.conteudo_texto.length > 100) {
        console.log('Documento já possui texto extraído');
        return new Response(
          JSON.stringify({
            success: true,
            texto: doc.conteudo_texto,
            metodo: 'cache',
            caracteres: doc.conteudo_texto.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (doc.url_arquivo) {
        const response = await fetch(doc.url_arquivo);
        pdfBytes = new Uint8Array(await response.arrayBuffer());
      }
    } else if (url_arquivo) {
      const response = await fetch(url_arquivo);
      pdfBytes = new Uint8Array(await response.arrayBuffer());
    }

    if (!pdfBytes) {
      throw new Error('Nenhum arquivo PDF para processar');
    }

    console.log(`PDF carregado: ${pdfBytes.length} bytes`);

    // Atualizar status
    if (docId) {
      await supabaseClient
        .from('documentos')
        .update({ status: 'processando' })
        .eq('id', docId);
    }

    // Extrair texto conforme método escolhido
    switch (metodo) {
      case 'pdf-parse':
        textoExtraido = await extrairTextoPdfBasico(pdfBytes);
        break;
      case 'document-ai':
        const googleApiKey = Deno.env.get('GOOGLE_DOCUMENT_AI_KEY');
        if (!googleApiKey) {
          throw new Error('API key do Google Document AI não configurada. Vá em Configurações para adicionar.');
        }
        textoExtraido = await extrairTextoDocumentAI(pdfBytes, googleApiKey);
        break;
      case 'tesseract':
        textoExtraido = await extrairTextoTesseract(pdfBytes);
        break;
      default:
        throw new Error(`Método não suportado: ${metodo}`);
    }

    console.log(`Texto extraído: ${textoExtraido.length} caracteres`);

    // Salvar texto no documento
    if (docId) {
      await supabaseClient
        .from('documentos')
        .update({ 
          conteudo_texto: textoExtraido,
          status: textoExtraido.length > 0 ? 'processado' : 'erro',
          erro_mensagem: textoExtraido.length === 0 ? 'PDF parece ser digitalizado. Use OCR (Document AI).' : null,
        })
        .eq('id', docId);
    }

    // Processar RAG se solicitado e tem texto
    if (processar_rag && textoExtraido.length > 100 && docId) {
      console.log('Iniciando processamento RAG...');
      
      // Chamar função de processamento RAG (não bloqueia resposta)
      supabaseClient.functions.invoke('processar-documento-rag', {
        body: {
          documento_id: docId,
          texto: textoExtraido,
        }
      }).catch((e: Error) => console.error('Erro ao processar RAG:', e));
    }

    const resultado = {
      success: true,
      texto: textoExtraido.substring(0, 5000), // Preview
      metodo,
      caracteres: textoExtraido.length,
      paginas_estimadas: Math.ceil(textoExtraido.length / 2000),
      precisa_ocr: textoExtraido.length < 100,
      processando_rag: processar_rag && textoExtraido.length > 100,
    };

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na extração:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        sugestao: 'Se o PDF é digitalizado, use Google Document AI para OCR.',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});