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
  const registros = resultados.map((r: any) => ({
    consulta_id: consultaId,
    numero_processo: r.numeroProcesso,
    sigla_tribunal: r.siglaTribunal,
    nome_orgao: r.nomeOrgao,
    tipo_comunicacao: r.tipoComunicacao,
    data_disponibilizacao: r.dataDisponibilizacao,
    data_publicacao: r.dataPublicacao,
    texto_mensagem: r.textoMensagem,
    destinatarios: r.destinatarios,
    dados_completos: r,
  }));

  const { data, error } = await supabase
    .from('resultados_consultas')
    .insert(registros)
    .select();
  
  if (error) throw error;
  return data;
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
