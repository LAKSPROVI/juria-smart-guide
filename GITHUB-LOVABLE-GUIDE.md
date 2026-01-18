# 📚 GUIA: GITHUB + LOVABLE (Atualizar Código)

## 🚀 PASSO 1: Preparar Alterações no Git

### 1.1 Adicionar todos os arquivos modificados
```bash
cd /workspaces/juria-smart-guide
git add .
```

### 1.2 Verificar o que será commitado
```bash
git status
```

**Esperado:**
- Changes to be committed: 12 modified files
- Untracked files: 12 new files (documentação + edge function)

---

## 📝 PASSO 2: Fazer Commit no Git

### 2.1 Criar commit com mensagem descritiva
```bash
git commit -m "✨ Implementar segurança, performance e deployment

- Adicionar ErrorBoundary global para tratamento de erros
- Centralizar autenticação com auth.ts (VITE_ADMIN_EMAILS)
- Mover proxy token para edge function (seguro)
- Otimizar deduplicação O(n) em resultados
- Adicionar mutex ao polling de notificações
- Implementar 31 RLS policies para isolamento de dados
- Criar documentação completa (DEPLOYMENT-CHECKLIST, etc)
- Build: 0 erros TypeScript, 6.03s
- Status: Pronto para produção"
```

### 2.2 Verificar commit criado
```bash
git log --oneline -1
```

**Esperado:**
```
abc123de (HEAD -> main) ✨ Implementar segurança, performance e deployment
```

---

## 🌐 PASSO 3: Push para GitHub

### 3.1 Fazer push da branch main
```bash
git push origin main
```

**Esperado:**
```
Enumerating objects: 45, done.
Counting objects: 100% (45/total)
Delta compression using up to 8 threads
Compressing objects: 100% (30/total)
Writing objects: 100% (30/total)
remote: Resolving deltas: 100% (15/total)
To github.com:seu-usuario/juria-smart-guide.git
   xyz1234..abc123de  main -> main
```

### 3.2 Verificar no GitHub (browser)
- Vá para: https://github.com/seu-usuario/juria-smart-guide
- Clique em "Commits" (você verá o novo commit)
- Verifique que todos os arquivos estão lá

---

## 💡 PASSO 4: Sincronizar com Lovable

### Opção A: Se você usa Lovable CLI

```bash
# 1. Instalar/atualizar Lovable CLI
npm install -g @lovable/cli

# 2. Fazer login
lovable login

# 3. Sincronizar projeto com Lovable
lovable sync
```

### Opção B: Se você usa Lovable Dashboard (Web)

**Método 1: Importar via GitHub**
1. Abrir: https://lovable.dev
2. Clique em "Create new project"
3. Selecione "Import from GitHub"
4. Selecione: seu-usuario/juria-smart-guide
5. Escolha branch: "main"
6. Clique em "Import"
7. Aguarde o Lovable fazer import (2-5 min)

**Método 2: Se já tem projeto no Lovable**
1. Abrir seu projeto no Lovable
2. Clique em "Settings" (engrenagem)
3. Clique em "Connect GitHub"
4. Selecione "Sync from GitHub"
5. Escolha "main" branch
6. Clique em "Sync"

### Opção C: Upload Manual (se Lovable não tiver Git integration)

1. Fazer zip do código
```bash
cd /workspaces/juria-smart-guide
zip -r juria-smart-guide.zip . -x "node_modules/*" "dist/*" ".git/*"
```

2. No Lovable Dashboard:
   - Clique em "Upload Project"
   - Selecione juria-smart-guide.zip
   - Aguarde processamento

---

## ✅ PASSO 5: Verificar Sincronização

### 5.1 No Lovable, verificar se arquivos estão lá
- ErrorBoundary.tsx ✓
- auth.ts ✓
- gerenciar-proxy/ ✓
- DEPLOYMENT-CHECKLIST.md ✓

### 5.2 Verificar integrações
```bash
# No Lovable console, executar:
npm install
npm run build
```

**Esperado:**
- ✅ Build sem erros
- ✅ Todos os imports funcionando
- ✅ Assets gerados em dist/

### 5.3 Testar no Lovable Preview
- Clique em "Preview" no Lovable
- Login com email
- Verificar se Dashboard carrega
- Testar navegação entre páginas

---

## 🔄 FLUXO COMPLETO (Resumido)

```bash
# 1. Adicionar tudo
git add .

# 2. Commit com mensagem descritiva
git commit -m "✨ Segurança, performance e deployment prontos"

# 3. Push para GitHub
git push origin main

# 4. No Lovable:
#    - Settings → Connect GitHub → Sync from GitHub
#    OU
#    - Create new project → Import from GitHub → seu-repo

# 5. Aguarde sincronização (2-5 min)

# 6. Teste no preview do Lovable
```

---

## ⚠️ POSSÍVEIS ERROS E SOLUÇÕES

### ❌ "authentication failed" ao fazer push
```bash
# Solução: Gerar token GitHub
# 1. Vá para: https://github.com/settings/tokens
# 2. Clique em "Generate new token"
# 3. Permissões: repo, workflow
# 4. Use token como password:
git push origin main
# Digite username: seu-usuario
# Digite password: seu-token-aqui
```

### ❌ "failed to connect to GitHub repository" no Lovable
```bash
# Solução: Verificar permissões
# 1. Lovable precisa de acesso ao seu GitHub
# 2. Vá para: Settings → Authorized OAuth Apps
# 3. Verifique se Lovable está autorizado
# 4. Se não, autorize novamente
```

### ❌ "branch main does not exist"
```bash
# Solução: Verificar branch atual
git branch
# Se em 'main', tudo certo
# Se em outra, fazer:
git checkout main
```

### ❌ Lovable não carrega os arquivos novos
```bash
# Solução: Fazer re-import manual
# 1. No Lovable Settings
# 2. Desconecte GitHub
# 3. Conecte novamente
# 4. Faça sync
```

---

## 📊 VERIFICAÇÃO PÓS-SINCRONIZAÇÃO

### ✅ No GitHub
```bash
# Verificar commits
git log --oneline -10

# Verificar branch
git branch -v

# Verificar remote
git remote -v
```

### ✅ No Lovable
1. Todos os 12 arquivos novos visíveis? ✓
2. Todas as 12 modificações presentes? ✓
3. Build executa sem erros? ✓
4. Preview funciona? ✓

### ✅ Testes Finais
- [ ] Fazer login no Lovable preview
- [ ] Navegar para Dashboard
- [ ] Clicar em "Consultas"
- [ ] Verificar ErrorBoundary (erros globais tratados)
- [ ] Testar Chat IA (deve carregar)
- [ ] Testar Configurações (proxy config)

---

## 💭 DÚVIDAS FREQUENTES

**P: Preciso de permissão no GitHub para fazer push?**
R: Sim, você precisa ser owner ou ter acesso write ao repositório.

**P: Lovable vai atualizar automaticamente?**
R: Depende da integração. Se GitHub está conectado, pode fazer sync automático. Caso contrário, fazer manualmente.

**P: Quanto tempo leva sincronizar?**
R: Geralmente 2-5 minutos. Se demorar mais, verificar conexão.

**P: Posso fazer alterações no Lovable e depois trazer para GitHub?**
R: Sim, Lovable pode exportar código. Mas recomendado usar GitHub como "source of truth".

**P: E se eu fizer alterações em ambos?**
R: Use Git branching. Crie branch separada no GitHub, faça alterações, e depois faça merge.

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Git commit: `git commit -am "..."`
2. ✅ Git push: `git push origin main`
3. ✅ Lovable sync: Settings → Sync from GitHub
4. ✅ Verificar no preview
5. ✅ Deploy para produção quando tudo OK

---

## 📞 SUPORTE

Se algo não funcionar:
1. Verificar erro no Lovable console
2. Fazer backup local: `git stash`
3. Fazer pull do GitHub: `git pull origin main`
4. Tentar sincronizar novamente
5. Se persistir, criar issue no GitHub

**Status:** 🟢 Pronto para sincronizar com Lovable! 🚀
