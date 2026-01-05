import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Tipos do banco de dados
export interface Consulta {
  id: string;
  nome: string;
  tribunal: string;
  tipo: string;
  termo: string;
  numero_oab?: string;
  uf_oab?: string;
  data_inicial?: string;
  data_final?: string;
  recorrencia: string;
  horarios: string[];
  ativo: boolean;
  ultima_execucao?: string;
  created_at: string;
  updated_at: string;
}

export interface ResultadoConsulta {
  id: string;
  consulta_id: string;
  numero_processo?: string;
  sigla_tribunal?: string;
  nome_orgao?: string;
  tipo_comunicacao?: string;
  data_disponibilizacao?: string;
  data_publicacao?: string;
  texto_mensagem?: string;
  destinatarios?: unknown;
  dados_completos?: unknown;
  visualizado: boolean;
  created_at: string;
}

export interface ConfigCaderno {
  id: string;
  tribunal: string;
  ativo: boolean;
  horarios: string[];
  tipos: string[];
  processar_automaticamente: boolean;
  created_at: string;
  updated_at: string;
}

export interface Caderno {
  id: string;
  tribunal: string;
  data: string;
  tipo: string;
  status: string;
  tamanho_bytes?: number;
  total_publicacoes: number;
  url_arquivo?: string;
  erro_mensagem?: string;
  processado_rag: boolean;
  created_at: string;
  updated_at: string;
}

export interface Documento {
  id: string;
  nome: string;
  tipo: string;
  tribunal?: string;
  tamanho_bytes?: number;
  origem: string;
  status: string;
  url_arquivo?: string;
  caderno_id?: string;
  tags: string[];
  conteudo_texto?: string;
  embedding_processado: boolean;
  erro_mensagem?: string;
  created_at: string;
  updated_at: string;
}

export interface Conversa {
  id: string;
  titulo: string;
  ultima_mensagem?: string;
  created_at: string;
  updated_at: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  role: string;
  content: string;
  fontes?: unknown;
  created_at: string;
}

// Consultas
export async function getConsultas() {
  const { data, error } = await supabase
    .from('consultas')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Consulta[];
}

export async function createConsulta(consulta: Omit<Consulta, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('consultas')
    .insert(consulta)
    .select()
    .single();
  
  if (error) throw error;
  return data as Consulta;
}

export async function updateConsulta(id: string, updates: Partial<Consulta>) {
  const { data, error } = await supabase
    .from('consultas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Consulta;
}

export async function deleteConsulta(id: string) {
  const { error } = await supabase
    .from('consultas')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Resultados de consultas
export async function getResultadosConsulta(consultaId: string) {
  const { data, error } = await supabase
    .from('resultados_consultas')
    .select('*')
    .eq('consulta_id', consultaId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as ResultadoConsulta[];
}

export async function getAllResultados() {
  const { data, error } = await supabase
    .from('resultados_consultas')
    .select('*, consultas(nome, tribunal)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function saveResultados(consultaId: string, resultados: unknown[]) {
  const registros = resultados.map((r: any) => {
    // A API retorna campos com nomes variados, precisamos normalizar
    // Campos podem vir em camelCase, snake_case ou minúsculo sem separador
    const numeroProcesso = r.numeroProcesso || r.numero_processo || r.numeroprocessocommascara || r.numero_processo_completo || null;
    const siglaTribunal = r.siglaTribunal || r.sigla_tribunal || r.siglatribunal || null;
    const nomeOrgao = r.nomeOrgao || r.nome_orgao || r.nomeorgao || null;
    const tipoComunicacao = r.tipoComunicacao || r.tipo_comunicacao || r.tipocomunicacao || null;
    
    // Data pode vir em vários formatos
    let dataDisponibilizacao = r.dataDisponibilizacao || r.data_disponibilizacao || null;
    if (!dataDisponibilizacao && r.datadisponibilizacao) {
      // Converter formato DD/MM/YYYY para YYYY-MM-DD
      const parts = r.datadisponibilizacao.split('/');
      if (parts.length === 3) {
        dataDisponibilizacao = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    // Se ainda não tem e vem como data_disponibilizacao no formato YYYY-MM-DD
    if (!dataDisponibilizacao && r.data_disponibilizacao && typeof r.data_disponibilizacao === 'string') {
      if (r.data_disponibilizacao.includes('-')) {
        dataDisponibilizacao = r.data_disponibilizacao;
      } else if (r.data_disponibilizacao.includes('/')) {
        const parts = r.data_disponibilizacao.split('/');
        if (parts.length === 3) {
          dataDisponibilizacao = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }
    
    let dataPublicacao = r.dataPublicacao || r.data_publicacao || null;
    if (!dataPublicacao && r.datapublicacao) {
      const parts = r.datapublicacao.split('/');
      if (parts.length === 3) {
        dataPublicacao = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    
    // Texto da mensagem - pode vir em diferentes campos
    const textoMensagem = r.textoMensagem || r.texto_mensagem || r.texto || null;
    
    // Destinatários podem vir de diferentes campos
    const destinatarios = r.destinatarios || r.destinatarioadvogados || [];
    
    return {
      consulta_id: consultaId,
      numero_processo: numeroProcesso,
      sigla_tribunal: siglaTribunal,
      nome_orgao: nomeOrgao,
      tipo_comunicacao: tipoComunicacao,
      data_disponibilizacao: dataDisponibilizacao,
      data_publicacao: dataPublicacao,
      texto_mensagem: textoMensagem,
      destinatarios: destinatarios,
      dados_completos: r,
    };
  });

  // Filtrar duplicatas - verificar se já existe um resultado 100% idêntico em TODOS os campos
  const registrosUnicos = [];
  
  for (const registro of registros) {
    // Buscar se já existe registro idêntico no banco
    const { data: existente } = await supabase
      .from('resultados_consultas')
      .select('id')
      .eq('numero_processo', registro.numero_processo)
      .eq('sigla_tribunal', registro.sigla_tribunal)
      .eq('nome_orgao', registro.nome_orgao)
      .eq('tipo_comunicacao', registro.tipo_comunicacao)
      .eq('data_disponibilizacao', registro.data_disponibilizacao)
      .eq('data_publicacao', registro.data_publicacao)
      .eq('texto_mensagem', registro.texto_mensagem)
      .limit(1);
    
    // Se não existe registro idêntico, adicionar à lista
    if (!existente || existente.length === 0) {
      registrosUnicos.push(registro);
    }
  }

  // Se não há registros novos, retornar vazio
  if (registrosUnicos.length === 0) {
    console.log('Nenhum resultado novo encontrado - todos já existem no banco');
    return [];
  }

  console.log(`Salvando ${registrosUnicos.length} de ${registros.length} resultados (${registros.length - registrosUnicos.length} duplicatas ignoradas)`);

  const { data, error } = await supabase
    .from('resultados_consultas')
    .insert(registrosUnicos)
    .select();
  
  if (error) throw error;
  
  // Também salvar no RAG (documento_chunks) para consulta via chat
  for (const registro of registrosUnicos) {
    if (registro.texto_mensagem || registro.numero_processo) {
      await saveResultadoParaRAG(registro);
    }
  }
  
  return data;
}

// Função para salvar resultado no sistema RAG
async function saveResultadoParaRAG(registro: any) {
  try {
    const conteudo = `
PROCESSO: ${registro.numero_processo || 'Não informado'}
TRIBUNAL: ${registro.sigla_tribunal || 'Não informado'}
ÓRGÃO: ${registro.nome_orgao || 'Não informado'}
TIPO: ${registro.tipo_comunicacao || 'Não informado'}
DATA DISPONIBILIZAÇÃO: ${registro.data_disponibilizacao || 'Não informada'}
DATA PUBLICAÇÃO: ${registro.data_publicacao || 'Não informada'}

CONTEÚDO:
${registro.texto_mensagem || JSON.stringify(registro.dados_completos?.texto || registro.dados_completos, null, 2)}
`.trim();

    const { error } = await supabase
      .from('documento_chunks')
      .insert({
        conteudo,
        chunk_index: 0,
        numero_processo: registro.numero_processo,
        metadata: {
          tipo: 'resultado_consulta',
          tribunal: registro.sigla_tribunal,
          data_disponibilizacao: registro.data_disponibilizacao,
          consulta_id: registro.consulta_id,
        }
      });
    
    if (error) console.error('Erro ao salvar chunk RAG:', error);
  } catch (e) {
    console.error('Erro ao processar RAG:', e);
  }
}

// Config Cadernos
export async function getConfigCadernos() {
  const { data, error } = await supabase
    .from('config_cadernos')
    .select('*')
    .order('tribunal');
  
  if (error) throw error;
  return data as ConfigCaderno[];
}

export async function updateConfigCaderno(id: string, updates: Partial<ConfigCaderno>) {
  const { data, error } = await supabase
    .from('config_cadernos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as ConfigCaderno;
}

export async function createConfigCaderno(config: Omit<ConfigCaderno, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('config_cadernos')
    .insert(config)
    .select()
    .single();
  
  if (error) throw error;
  return data as ConfigCaderno;
}

// Cadernos
export async function getCadernos() {
  const { data, error } = await supabase
    .from('cadernos')
    .select('*')
    .order('data', { ascending: false });
  
  if (error) throw error;
  return data as Caderno[];
}

export async function createCaderno(caderno: Omit<Caderno, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('cadernos')
    .insert(caderno)
    .select()
    .single();
  
  if (error) throw error;
  return data as Caderno;
}

// Documentos
export async function getDocumentos() {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Documento[];
}

export async function getDocumentosStats() {
  const { data: cadernos, error: e1 } = await supabase
    .from('documentos')
    .select('id')
    .eq('origem', 'dje');
  
  const { data: uploads, error: e2 } = await supabase
    .from('documentos')
    .select('id')
    .eq('origem', 'upload');

  const { data: favoritos, error: e3 } = await supabase
    .from('documentos')
    .select('id')
    .contains('tags', ['favorito']);

  if (e1 || e2 || e3) throw e1 || e2 || e3;
  
  return {
    cadernos: cadernos?.length || 0,
    uploads: uploads?.length || 0,
    favoritos: favoritos?.length || 0,
  };
}

// Conversas
export async function getConversas() {
  const { data, error } = await supabase
    .from('conversas')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data as Conversa[];
}

export async function createConversa(titulo: string) {
  const { data, error } = await supabase
    .from('conversas')
    .insert({ titulo })
    .select()
    .single();
  
  if (error) throw error;
  return data as Conversa;
}

export async function getMensagens(conversaId: string) {
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .eq('conversa_id', conversaId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data as Mensagem[];
}

export async function addMensagem(conversaId: string, role: string, content: string, fontes?: Json | null) {
  const { data, error } = await supabase
    .from('mensagens')
    .insert([{ 
      conversa_id: conversaId, 
      role, 
      content,
      fontes: fontes ?? null 
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  // Atualizar última mensagem da conversa
  await supabase
    .from('conversas')
    .update({ ultima_mensagem: content.substring(0, 100) })
    .eq('id', conversaId);
  
  return data as Mensagem;
}
