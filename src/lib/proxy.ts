import { supabase } from "@/integrations/supabase/client";
import { registrarLog } from "./logging";

export interface ConfigProxy {
  id: string;
  nome: string;
  url_base: string | null;
  token: string | null;
  ativo: boolean;
  ultima_verificacao: string | null;
  status_ultimo_teste: string | null;
}

/**
 * Busca a configuração do proxy
 */
export async function getConfigProxy(): Promise<ConfigProxy | null> {
  const { data, error } = await supabase
    .from('config_proxy')
    .select('*')
    .eq('nome', 'proxy_brasil')
    .single();

  if (error) {
    console.error("Erro ao buscar config proxy:", error);
    return null;
  }

  return data as ConfigProxy;
}

/**
 * Atualiza a configuração do proxy
 */
export async function updateConfigProxy(updates: Partial<ConfigProxy>): Promise<boolean> {
  const { error } = await supabase
    .from('config_proxy')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('nome', 'proxy_brasil');

  if (error) {
    console.error("Erro ao atualizar config proxy:", error);
    return false;
  }

  await registrarLog({
    tipo: 'admin',
    acao: 'editar',
    entidade_tipo: 'config_proxy',
    detalhes: { campos_atualizados: Object.keys(updates) },
  });

  return true;
}

/**
 * Testa a conexão com o proxy
 */
export async function testarProxy(): Promise<{ sucesso: boolean; mensagem: string }> {
  const config = await getConfigProxy();

  if (!config?.url_base) {
    return { sucesso: false, mensagem: "URL do proxy não configurada" };
  }

  try {
    const response = await fetch(`${config.url_base}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.token || ''}`,
      },
    });

    const sucesso = response.ok;
    
    await supabase
      .from('config_proxy')
      .update({
        ultima_verificacao: new Date().toISOString(),
        status_ultimo_teste: sucesso ? 'ok' : 'erro',
      })
      .eq('nome', 'proxy_brasil');

    return {
      sucesso,
      mensagem: sucesso ? "Proxy funcionando corretamente" : `Erro: ${response.status}`,
    };
  } catch (error) {
    await supabase
      .from('config_proxy')
      .update({
        ultima_verificacao: new Date().toISOString(),
        status_ultimo_teste: 'timeout',
      })
      .eq('nome', 'proxy_brasil');

    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

/**
 * Instruções para configurar o proxy no Brasil
 */
export const INSTRUCOES_PROXY = `
## Como configurar seu proxy no Brasil

Para consultas agendadas funcionarem, você precisa de um serviço no Brasil.

### Opção 1: VPS no Brasil (R$ 20-50/mês)
- DigitalOcean, Vultr, Hostinger

### Código do Proxy (Node.js)

const express = require('express');
const app = express();
app.use(express.json());

const TOKEN = process.env.PROXY_TOKEN || 'seu-token';

app.use((req, res, next) => {
  if (req.headers.authorization !== 'Bearer ' + TOKEN) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/consulta', async (req, res) => {
  const params = req.body;
  const urlParams = new URLSearchParams();
  if (params.siglaTribunal) urlParams.append('siglaTribunal', params.siglaTribunal);
  if (params.termo) urlParams.append('nomeAdvogado', params.termo);
  if (params.dataInicial) urlParams.append('dataDisponibilizacaoInicio', params.dataInicial);
  if (params.dataFinal) urlParams.append('dataDisponibilizacaoFim', params.dataFinal);

  const response = await fetch('https://comunicaapi.pje.jus.br/api/v1/comunicacao?' + urlParams);
  const data = await response.json();
  res.json({ success: true, data: data.comunicacoes || data, total: data.length || 0 });
});

app.listen(3001);
`;
