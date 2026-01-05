import { supabase } from "@/integrations/supabase/client";

export interface ConsultaParams {
  termo?: string;
  numeroOab?: string;
  ufOab?: string;
  siglaTribunal?: string;
  dataInicial?: string;
  dataFinal?: string;
}

export interface IntimacaoResult {
  id?: string;
  numeroProcesso?: string;
  nomeAdvogado?: string;
  dataDisponibilizacao?: string;
  dataPublicacao?: string;
  siglaTribunal?: string;
  tipoComunicacao?: string;
  nomeOrgao?: string;
  textoMensagem?: string;
  destinatarios?: Array<{
    nome?: string;
    numeroOab?: string;
    ufOab?: string;
  }>;
  [key: string]: unknown;
}

export interface ConsultaResponse {
  success: boolean;
  data: IntimacaoResult[];
  parametros: ConsultaParams;
  total: number;
  error?: string;
}

export async function consultarIntimacoes(params: ConsultaParams): Promise<ConsultaResponse> {
  console.log("Consultando intimações com params:", params);
  
  const { data, error } = await supabase.functions.invoke('consulta-intimacoes', {
    body: params,
  });

  if (error) {
    console.error("Erro ao chamar edge function:", error);
    throw new Error(error.message || "Erro ao consultar intimações");
  }

  return data as ConsultaResponse;
}

// Teste inicial com Márcia Gabriela de Abreu
export async function testeConsultaMarcia(): Promise<ConsultaResponse> {
  return consultarIntimacoes({
    termo: "Márcia Gabriela de Abreu",
    dataInicial: "2025-12-20",
    dataFinal: "2025-12-25",
  });
}
