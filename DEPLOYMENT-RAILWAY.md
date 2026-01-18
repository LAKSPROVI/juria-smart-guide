# ✅ Configuração Railway - Deploy Automático Completo

## 📋 O que foi corrigido/criado:

### 1️⃣ **`nixpacks.toml`** ✅ CRIADO
**Função:** Força Railway usar NPM em vez de Bun
```
- Node.js 18.x
- npm ci (instalação determinística)
- npm run build (build com Vite)
- npx serve dist (servir aplicação em produção)
```

### 2️⃣ **`railway.json`** ✅ CRIADO
**Função:** Configuração completa do Railway
```
- Builder: nixpacks
- Start command: npx serve dist
- Health checks habilitados
- Restart policy configurado
```

### 3️⃣ **`.github/workflows/deploy.yml`** ✅ CRIADO
**Função:** CI/CD automático
```
Disparadores:
- Push em main/master/principal
- Pull requests

Passos:
1. Checkout do código
2. Setup Node.js 18.x
3. npm ci (instalar)
4. npm run lint (linter)
5. npm run build (build)
6. Deploy Railway automático
```

### 4️⃣ **`.env.example`** ✅ ATUALIZADO
**Adições:**
```
- VITE_SUPABASE_ANON_KEY (era PUBLISHABLE_KEY)
- VITE_API_URL
- NODE_ENV=production
```

### 5️⃣ **`.gitignore`** ✅ ATUALIZADO
**Adições:**
```
- bun.lockb (ignora Bun lockfile)
- yarn.lock (ignora Yarn lockfile)
```

### 6️⃣ **`package.json`** ✅ ATUALIZADO
**Adições:**
```
- "serve": "^14.2.0" (novo devDependency para servir app em produção)

Scripts existentes:
- "dev": "vite" ✓
- "build": "vite build" ✓
- "preview": "vite preview" ✓
- "lint": "eslint ." ✓
```

---

## 🚀 Próximos Passos:

### 1. Commit e Push
```bash
cd /workspaces/juria-smart-guide

git add -A
git commit -m "fix(deployment): configure Railway with NPM and CI/CD

- Create nixpacks.toml to force NPM instead of Bun
- Add railway.json with complete deployment config
- Create GitHub Actions workflow for automatic deployment
- Add serve package for production serving
- Update .env.example with correct variables
- Add bun.lockb to .gitignore"

git push origin main
```

### 2. Configure Railway Token no GitHub
1. Vá para: **GitHub → Seu Repositório → Settings → Secrets and Variables → Actions**
2. Clique em **New repository secret**
3. Nome: `RAILWAY_TOKEN`
4. Valor: [Cole seu token do Railway]

### 3. Obter Railway Token
1. Acesse: https://railway.app/dashboard
2. Clique em **Account Settings**
3. Copie o **API Token**

### 4. Conectar GitHub com Railway
1. No Railway: **New Project → GitHub Repo**
2. Selecione **juria-smart-guide**
3. Railway detectará automaticamente os arquivos de config

### 5. Adicionar Variáveis de Ambiente
No Railway Dashboard, adicione:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_aqui
VITE_ADMIN_EMAILS=seu_email@example.com
NODE_ENV=production
```

---

## 🎯 O que vai acontecer:

```
1. Você faz: git push origin main
                    ↓
2. GitHub detecta: push na branch main
                    ↓
3. GitHub Actions ativa: .github/workflows/deploy.yml
                    ↓
4. GitHub Actions: npm install → npm run build → deploy no Railway
                    ↓
5. Railway recebe: código buildado
                    ↓
6. Railway cria: container Docker
                    ↓
7. Railway roda: npx serve dist
                    ↓
8. App online em: https://seu-app.railway.app
```

---

## ✅ Checklist de Verificação

Depois de fazer o push:

- [ ] Verifique GitHub: **Actions** → vê workflow rodando?
- [ ] Verifique Railway: **Deployments** → vê novo deploy?
- [ ] Verifique URL: https://seu-app.railway.app → app carrega?
- [ ] Verifique ambiente: Supabase conecta corretamente?
- [ ] Verifique logs: Railway mostra erro ou tudo OK?

---

## 📊 Estrutura Criada

```
juria-smart-guide/
├── .github/
│   └── workflows/
│       └── deploy.yml           ← CI/CD automático
├── .env.example                 ← Template variáveis (ATUALIZADO)
├── .gitignore                   ← Ignora bun.lockb (ATUALIZADO)
├── nixpacks.toml                ← Config Nixpacks (NOVO)
├── railway.json                 ← Config Railway (NOVO)
├── package.json                 ← +serve package (ATUALIZADO)
└── ... (resto do projeto)
```

---

## 🆘 Se algo der errado:

**Erro: "lockfile had changes, but lockfile is frozen"**
- ✓ Resolvido: `nixpacks.toml` força uso de npm ci

**Erro: "Cannot find serve"**
- ✓ Resolvido: Adicionado "serve" ao package.json

**Erro: Railway usa Bun**
- ✓ Resolvido: `nixpacks.toml` força Node.js + npm

**Workflow não roda**
- Verifique: GitHub Settings → Actions → habilitado?
- Verifique: Branch name é "main", "master" ou "principal"?

**Deploy falha com variáveis de ambiente**
- Adicione em Railway Dashboard: Settings → Variables

---

## 📝 Resumo Técnico

| Arquivo | O quê | Por quê |
|---------|-------|--------|
| `nixpacks.toml` | Config builder | Força NPM, não Bun |
| `railway.json` | Config Railway | Define como buildar e rodar |
| `deploy.yml` | CI/CD automation | Auto-deploy no git push |
| `.env.example` | Template vars | Mostra quais ENVs precisa |
| `package.json` | +serve | Serve app em produção |
| `.gitignore` | +bun.lockb | Não comita arquivo Bun |

---

## ✨ Resultado Esperado

Depois de configurado:

```
📊 Status: ✅ ONLINE
🌍 URL: https://juria-smart-guide.railway.app
⚙️ Framework: React + TypeScript + Vite
📦 Backend: Supabase
🚀 Deploy: Automático no git push
🔄 CI/CD: GitHub Actions
```

---

**Tudo pronto! Próximo passo: `git push` e acompanhe no Railway Dashboard** 🎉

