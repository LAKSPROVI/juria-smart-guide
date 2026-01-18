import { supabase } from "@/integrations/supabase/client";
import { registrarLog } from "./logging";

export interface ConfigProxy {
  id: string;
  nome: string;
  url_base: string | null;
  ativo: boolean;
  ultima_verificacao: string | null;
  status_ultimo_teste: string | null;
}

/**
 * Busca a configuração do proxy via edge function (seguro, sem expor token)
 */
export async function getConfigProxy(): Promise<ConfigProxy | null> {
  try {
    const { data, error } = await supabase.functions.invoke("gerenciar-proxy", {
      body: { action: "get" },
    });

    if (error) {
      console.error("Erro ao buscar config proxy:", error);
      return null;
    }

    return data as ConfigProxy;
  } catch (err) {
    console.error("Erro ao chamar edge function gerenciar-proxy:", err);
    return null;
  }
}

/**
 * Atualiza a configuração do proxy via edge function (apenas URL e status)
 */
export async function updateConfigProxy(updates: Partial<ConfigProxy>): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke("gerenciar-proxy", {
      body: {
        action: "update",
        updates: {
          url_base: updates.url_base || null,
          ativo: updates.ativo !== undefined ? updates.ativo : false,
        },
      },
    });

    if (error) {
      console.error("Erro ao atualizar config proxy:", error);
      return false;
    }

    await registrarLog({
      tipo: "admin",
      acao: "editar",
      entidade_tipo: "config_proxy",
      detalhes: { campos_atualizados: Object.keys(updates) },
    });

    return true;
  } catch (err) {
    console.error("Erro ao chamar edge function gerenciar-proxy:", err);
    return false;
  }
}

/**
 * Testa a conexão com o proxy via edge function (token fica seguro no backend)
 */
export async function testarProxy(): Promise<{ sucesso: boolean; mensagem: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("gerenciar-proxy", {
      body: { action: "test" },
    });

    if (error) {
      return {
        sucesso: false,
        mensagem: error.message || "Erro ao testar proxy",
      };
    }

    return data as { sucesso: boolean; mensagem: string };
  } catch (err) {
    return {
      sucesso: false,
      mensagem: err instanceof Error ? err.message : "Erro de conexão",
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
