# 🚀 GUIA COMPLETO DE DEPLOYMENT

## Pré-requisitos

1. **Supabase CLI** instalado
   ```bash
   # macOS/Linux via Homebrew
   brew install supabase/tap/supabase

   # ou via npm (Node.js)
   npm install -g supabase
   ```

2. **Credenciais do Supabase**
   - Project URL
   - Publishable Key (anon)
   - Service Role Key (apenas para deploy)

3. **Arquivo `.env.production`** preenchido
   ```bash
   cp .env.production .env.production.local
   # Edite e preencha os valores
   ```

---

## PASSO 1: Preparar Credenciais Locais

```bash
# Fazer login no Supabase
supabase login

# Copiar Service Role Key para variável de ambiente
export SUPABASE_ACCESS_TOKEN="seu_access_token_aqui"
```

> **Onde encontrar?**
> - Vá para: https://app.supabase.com/account/tokens
> - Clique em "Generate new token"
> - Use em `supabase login`

---

## PASSO 2: Aplicar RLS Policies

```bash
# Verificar conexão com o projeto
supabase projects list

# Fazer link com seu projeto (escolha o seu na lista)
supabase link --project-ref seu-project-id

# Fazer push das migrations (RLS policies)
supabase db push
```

**O que isso faz:**
- ✅ Ativa Row Level Security em todas as tabelas críticas
- ✅ Cria policies para proteger dados por usuário
- ✅ Admins continuam vendo tudo (via service role nas edge functions)

**Verificar no Supabase Dashboard:**
- Vá para: Database → Policies
- Você verá as ~30 policies criadas

---

## PASSO 3: Deploy Edge Functions

```bash
# Deploy individual
supabase functions deploy gerenciar-proxy

# Ou deploy todas de uma vez
supabase functions deploy

# Verificar status
supabase functions list
```

**O que isso faz:**
- ✅ Faz upload da função `gerenciar-proxy` para o servidor
- ✅ Token do proxy fica seguro no backend (nunca vai ao cliente)
- ✅ Página de Configurações passa a funcionar

**Verificar no Supabase Dashboard:**
- Vá para: Edge Functions
- Clique em `gerenciar-proxy`
- Você verá URL de invoke como: `https://seu-project-id.supabase.co/functions/v1/gerenciar-proxy`

---

## PASSO 4: Configurar Variáveis de Ambiente

### Passo 4a: No seu servidor/hosting

```bash
# Copiar valores para seu .env de produção
VITE_SUPABASE_URL=https://seu-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_EMAILS=admin@example.com,seu-email@example.com
```

### Passo 4b: Adicionar Admins no Banco

```sql
-- No Supabase SQL Editor, execute:
INSERT INTO public.usuarios_autorizados (email, eh_admin, motivo_bloqueio)
VALUES 
  ('admin@example.com', true, NULL),
  ('seu-email@example.com', true, NULL)
ON CONFLICT (email) DO UPDATE SET eh_admin = true;
```

---

## PASSO 5: Build e Deploy da Aplicação

```bash
# Build da aplicação
npm run build

# Resultado em: dist/
# - dist/index.html (1.04 kB)
# - dist/assets/index.css (68.70 kB)
# - dist/assets/index.js (819.89 kB)

# Deploy para seu hosting (exemplos):
# - Vercel: vercel deploy --prod
# - Netlify: netlify deploy --prod
# - AWS S3: aws s3 cp dist/ s3://seu-bucket/ --recursive
# - Docker: docker build -t seu-app . && docker run ...
```

---

## PASSO 6: Validação Pós-Deploy

```bash
# 1. Verificar RLS policies
supabase db pull  # Fazer pull das policies para confirmar

# 2. Testar Edge Function
curl -X POST https://seu-project-id.supabase.co/functions/v1/gerenciar-proxy \
  -H "Authorization: Bearer seu_access_token" \
  -H "Content-Type: application/json" \
  -d '{"action": "get"}'

# 3. Testar login na aplicação
# - Acesse: https://seu-dominio.com/auth
# - Faça login
# - Você deve ser redirecionado para /
# - Vá para Configurações
# - Proxy config deve carregar sem errors

# 4. Verificar logs
supabase functions get-logs gerenciar-proxy
```

---

## Checklist de Deploy ✅

```
□ Supabase CLI instalado
□ Login no Supabase (supabase login)
□ Project linkado (supabase link)
□ RLS policies aplicadas (supabase db push)
□ Edge functions deployadas (supabase functions deploy)
□ .env.production preenchido
□ VITE_ADMIN_EMAILS setado
□ Admins adicionados na tabela usuarios_autorizados
□ npm run build executado
□ dist/ deployado no servidor
□ Testes de funcionalidade no prod
□ Logs checados para erros
```

---

## Troubleshooting

### ❌ "Edge function not found"
```bash
# Solução: Deploy novamente
supabase functions deploy gerenciar-proxy --debug
```

### ❌ "Permission denied (RLS)"
```bash
# Solução: Verificar se usuário está em usuarios_autorizados
SELECT * FROM public.usuarios_autorizados 
WHERE email = 'seu-email@example.com';

-- Se não existir, adicionar:
INSERT INTO public.usuarios_autorizados (email, eh_admin)
VALUES ('seu-email@example.com', true);
```

### ❌ "Proxy config not found"
```bash
# Solução: Verificar se config_proxy existe
SELECT * FROM public.config_proxy;

-- Se vazio, criar:
INSERT INTO public.config_proxy (nome, url_base, ativo)
VALUES ('Proxy Principal', 'http://seu-proxy:8080', true);
```

### ❌ "Admin emails not recognized"
```bash
# Verificar valor de VITE_ADMIN_EMAILS
echo $VITE_ADMIN_EMAILS

# Deve estar assim:
# admin@example.com,outro@example.com

# SEM espaços entre emails!
```

---

## 📞 Próximas Etapas (Após Deploy)

1. **Monitorar Logs**
   ```bash
   supabase functions get-logs gerenciar-proxy --limit 100
   ```

2. **Cron Jobs** (se usar)
   ```bash
   supabase functions deploy executar-consultas-agendadas
   # Configurar no Supabase Dashboard → Functions → Triggers
   ```

3. **Backups**
   ```bash
   # Ativar backups automáticos no Supabase Dashboard
   # Settings → Database → Backups
   ```

4. **Monitoramento**
   - Verificar `system_logs` regularmente
   - Configurar alertas para erros

---

## 🎯 Resumo

✅ **Segurança**: RLS protege dados de usuários
✅ **Performance**: Edge functions rodam no servidor (+ rápido)
✅ **Confiabilidade**: Políticas de autorização automáticas
✅ **Auditoria**: Todos os acessos ficam em system_logs

**Status Esperado Após Deploy:**
- 🟢 Autenticação funcionando
- 🟢 Dashboard carregando
- 🟢 Configurações de Proxy disponíveis
- 🟢 Consultas executando
- 🟢 Chat com IA respondendo
- 🟢 Cadernos DJE baixando
