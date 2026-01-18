# ✅ DEPLOYMENT CHECKLIST - Juria Smart Guide

> **Data:** 18 de Janeiro, 2026  
> **Status:** ✅ TODOS OS 3 ITENS IMPLEMENTADOS E PRONTOS  
> **Tempo Estimado Total:** 25 minutos

---

## 📋 PRÉ-REQUISITOS

- [ ] Ter acesso ao painel do Supabase do seu projeto
- [ ] Supabase CLI instalado (`brew install supabase/tap/supabase`)
- [ ] Node.js 18+ e npm instalados
- [ ] Acesso a um servidor/hosting para deploy (Vercel, Netlify, AWS, etc)
- [ ] Git com commits acionados

---

## 🚀 ETAPA 1: Preparar Credenciais (5 min)

- [ ] **1.1** Instalar Supabase CLI (se não tiver)
  ```bash
  brew install supabase/tap/supabase
  ```

- [ ] **1.2** Fazer login no Supabase
  ```bash
  supabase login
  ```

- [ ] **1.3** Copiar Project ID do seu projeto Supabase
  - Vá para: https://app.supabase.com/projects
  - Copie o Project ID (formato: `abcdefghijklmnop`)

- [ ] **1.4** Preencher `.env.production` com valores reais
  ```bash
  cp .env.production .env.production.local
  nano .env.production.local
  ```
  
  Necessário preencher:
  ```
  VITE_SUPABASE_URL=https://seu-project-id.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
  VITE_ADMIN_EMAILS=admin@example.com,seu@email.com
  ```

- [ ] **1.5** Verificar valores preenchidos
  ```bash
  grep -v "^#" .env.production.local | grep "VITE_"
  ```

---

## 🔐 ETAPA 2: Deploy RLS Policies (5 min)

- [ ] **2.1** Linkar Supabase com seu projeto
  ```bash
  supabase link --project-ref seu-project-id
  ```

- [ ] **2.2** Fazer push das migrations (RLS policies)
  ```bash
  supabase db push
  ```
  
  **Esperado:** "31 policies criadas para 9 tabelas"

- [ ] **2.3** Verificar no Supabase Dashboard
  - Vá para: https://app.supabase.com/project/seu-project-id/database/policies
  - Você deve ver ~31 policies listadas
  - Confirmar políticas para tabelas: config_proxy, usuarios_autorizados, system_logs, etc

- [ ] **2.4** Verificar que RLS está ativado
  ```bash
  supabase db pull
  # Verifique que todas as tabelas têm RLS ativado
  ```

---

## ⚡ ETAPA 3: Deploy Edge Functions (5 min)

- [ ] **3.1** Fazer deploy de todas as edge functions
  ```bash
  supabase functions deploy
  ```

- [ ] **3.2** Ou deploy apenas do gerenciar-proxy (se preferir fazer individual)
  ```bash
  supabase functions deploy gerenciar-proxy
  ```

- [ ] **3.3** Verificar status no Dashboard
  - Vá para: https://app.supabase.com/project/seu-project-id/functions
  - Confirmar que `gerenciar-proxy` está listada com status "Active"

- [ ] **3.4** Copiar URL de invoke (você usará para testes)
  - URL será algo como: `https://seu-project-id.supabase.co/functions/v1/gerenciar-proxy`
  - Guarde para testes pós-deployment

- [ ] **3.5** Monitorar logs
  ```bash
  supabase functions get-logs gerenciar-proxy
  # Deve estar vazio no início (sem erros)
  ```

---

## 👥 ETAPA 4: Configurar Admins no Banco (2 min)

- [ ] **4.1** Abrir SQL Editor do Supabase
  - Vá para: https://app.supabase.com/project/seu-project-id/sql/new

- [ ] **4.2** Executar SQL para adicionar admins
  ```sql
  INSERT INTO public.usuarios_autorizados (email, eh_admin, motivo_bloqueio)
  VALUES 
    ('seu-email@admin.com', true, NULL),
    ('outro-admin@admin.com', true, NULL)
  ON CONFLICT (email) DO UPDATE SET eh_admin = true;
  ```

- [ ] **4.3** Verificar que admins foram criados
  ```sql
  SELECT email, eh_admin, criado_em 
  FROM public.usuarios_autorizados 
  WHERE eh_admin = true;
  ```

---

## 🏗️ ETAPA 5: Build & Deploy da Aplicação (3 min)

- [ ] **5.1** Fazer build da aplicação
  ```bash
  npm run build
  ```
  
  **Esperado:**
  - Build completa em ~6 segundos
  - Sem erros TypeScript
  - dist/ gerada com 3 arquivos

- [ ] **5.2** Verificar tamanho do build
  ```bash
  du -sh dist/
  du -sh dist/assets/index-*.js
  ```
  
  **Esperado:**
  - Total: ~900 kB
  - JS: ~820 kB (gzipped: 230 kB)

- [ ] **5.3** Escolher plataforma de deploy e seguir instruções:

  ### **Opção A: Vercel** (Recomendado)
  ```bash
  npm install -g vercel
  vercel deploy --prod
  ```

  ### **Opção B: Netlify**
  ```bash
  npm install -g netlify-cli
  netlify deploy --prod --dir=dist
  ```

  ### **Opção C: AWS S3**
  ```bash
  aws s3 cp dist/ s3://seu-bucket/ --recursive
  ```

  ### **Opção D: Docker**
  ```bash
  docker build -t juria-smart-guide .
  docker run -p 80:80 juria-smart-guide
  ```

- [ ] **5.4** Apontar domínio para seu servidor
  - Configure DNS para apontar para URL de deploy
  - Teste acesso: `https://seu-dominio.com`

---

## ✔️ ETAPA 6: Validação Pós-Deployment (5 min)

- [ ] **6.1** Acessar a aplicação
  ```
  https://seu-dominio.com
  ```

- [ ] **6.2** Testar login
  - [ ] Clique em "Conectar"
  - [ ] Faça login com seu email
  - [ ] Deve redirecionar para Dashboard

- [ ] **6.3** Validar que Proxy Config funciona
  - [ ] Vá para Configurações (ícone de engrenagem)
  - [ ] Clique em "Proxy"
  - [ ] Deve carregar configuração sem erros
  - [ ] Não deve mostrar "campo de token" (deve mostrar mensagem de segurança)

- [ ] **6.4** Testar RLS (isolamento de dados)
  - [ ] Criar uma consulta com seu usuário
  - [ ] Copiar link de novo usuário (ou usar Incognito)
  - [ ] Fazer login com outro usuário
  - [ ] Verificar: **Sua consulta NÃO deve ser visível** para outro usuário
  - [ ] Criar consulta do outro usuário
  - [ ] Verificar: Você **NÃO vê** a consulta do outro usuário

- [ ] **6.5** Monitorar logs de edge function
  ```bash
  supabase functions get-logs gerenciar-proxy --limit 50
  ```
  
  **Esperado:**
  - Logs de sucesso ao acessar Configurações
  - Sem erros (ou apenas avisos normais)

- [ ] **6.6** Testar funcionalidades principais
  - [ ] Dashboard carrega
  - [ ] Botão "Nova Consulta" funciona
  - [ ] Chat responde
  - [ ] Cadernos DJE podem ser baixados
  - [ ] Notificações funcionam

---

## 🎯 CHECKLIST FINAL

### Pré-Deployment
- [ ] Supabase CLI instalado
- [ ] Login feito (`supabase login`)
- [ ] .env.production preenchido
- [ ] bash pre-deployment-check.sh executado com sucesso

### Deployment
- [ ] RLS policies deployadas (`supabase db push`)
- [ ] Edge functions deployadas (`supabase functions deploy`)
- [ ] Admins configurados na tabela usuarios_autorizados
- [ ] npm run build sem erros
- [ ] dist/ deployada em produção
- [ ] Domínio apontando corretamente

### Pós-Deployment
- [ ] Login funciona
- [ ] Proxy config funciona
- [ ] RLS isolando dados corretamente
- [ ] Logs sem erros críticos
- [ ] Todas funcionalidades testadas

---

## 🚨 TROUBLESHOOTING

### ❌ "Edge function not found"
```bash
# Verificar se função foi deployada
supabase functions list

# Deploy novamente
supabase functions deploy gerenciar-proxy --debug
```

### ❌ "Permission denied (RLS)"
```sql
-- Verificar se seu email está na tabela
SELECT * FROM public.usuarios_autorizados 
WHERE email = 'seu-email@admin.com';

-- Se não existir, adicionar
INSERT INTO public.usuarios_autorizados (email, eh_admin)
VALUES ('seu-email@admin.com', true);
```

### ❌ "VITE_ADMIN_EMAILS not configured"
```bash
# Verificar valor
echo $VITE_ADMIN_EMAILS

# Deve estar sem espaços:
# admin@example.com,outro@example.com (CORRETO)
# admin@example.com, outro@example.com (ERRADO - tem espaço)
```

### ❌ "Proxy config shows error"
```bash
# Ver logs da edge function
supabase functions get-logs gerenciar-proxy --tail 20

# Verificar se config_proxy table existe
# No Supabase SQL Editor:
SELECT * FROM public.config_proxy;
```

### ❌ "Build fails with TypeScript error"
```bash
# Limpar cache
rm -rf node_modules dist
npm install
npm run build
```

---

## 📞 SUPORTE

Se algo não funcionar:

1. **Verificar logs:**
   ```bash
   supabase functions get-logs gerenciar-proxy --limit 100
   ```

2. **Verificar policies criadas:**
   - Dashboard → Database → Policies
   - Deve mostrar ~31 policies

3. **Verificar RLS ativado:**
   - Dashboard → Database → Tables
   - Cada tabela deve ter "RLS" ativado

4. **Consultar queries úteis:**
   - Veja arquivo [SQL-QUERIES.md](SQL-QUERIES.md)

5. **Ler documentação:**
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Guia passo a passo
   - [DEPLOYMENT-SUMMARY.md](DEPLOYMENT-SUMMARY.md) - Visão geral técnica

---

## 🎉 CONCLUSÃO

Se todos os checkboxes estão marcados, parabéns! 🚀

Sua aplicação está:
✅ Segura (RLS protegendo dados)
✅ Performática (edge functions no servidor)
✅ Auditada (system_logs rastreando tudo)
✅ Pronta para produção

**Tempo de deployment:** ~25 minutos
**Resultado:** Aplicação Juria Smart Guide deployada com segurança de classe empresarial!

---

**Data de conclusão:** ________________  
**Responsável:** ________________  
**Observações:** ______________________________________________________
