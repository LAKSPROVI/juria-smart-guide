#!/bin/bash

# =====================================================================
# pre-deployment-check.sh
# Verifica se tudo está pronto para deployment
# =====================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       PRÉ-DEPLOYMENT CHECKLIST - Juria Smart Guide           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0

# Função para imprimir resultado
check() {
  local name=$1
  local condition=$2
  
  if [ "$condition" = true ]; then
    echo -e "${GREEN}✅${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}❌${NC} $name"
    ((FAILED++))
  fi
}

echo "1️⃣  BUILD VERIFICATION"
echo "─────────────────────────────────────────────────────────────"

# Verificar se dist/ existe
[ -d "dist" ] && check "Aplicação build (dist/)" true || check "Aplicação build (dist/)" false

# Verificar tamanho dos assets
if [ -f "dist/assets/index-*.js" ]; then
  SIZE=$(du -sh dist/assets/index-*.js 2>/dev/null | awk '{print $1}')
  echo -e "${YELLOW}ℹ️${NC}  Bundle size: $SIZE"
fi

echo ""
echo "2️⃣  ENVIRONMENT CONFIGURATION"
echo "─────────────────────────────────────────────────────────────"

# Verificar .env.production existe
[ -f ".env.production" ] && check ".env.production existe" true || check ".env.production existe" false

# Verificar VITE_ADMIN_EMAILS
if [ -f ".env.production" ]; then
  ADMIN_EMAILS=$(grep VITE_ADMIN_EMAILS .env.production | cut -d'=' -f2)
  if [ -z "$ADMIN_EMAILS" ] || [ "$ADMIN_EMAILS" = "admin@example.com,seu-email@example.com" ]; then
    echo -e "${RED}⚠️${NC}  VITE_ADMIN_EMAILS não configurado (ainda usa template)"
  else
    check "VITE_ADMIN_EMAILS configurado" true
  fi
fi

# Verificar VITE_SUPABASE_URL
if [ -f ".env.production" ]; then
  SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.production | cut -d'=' -f2)
  if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://seu-project-id.supabase.co" ]; then
    echo -e "${RED}⚠️${NC}  VITE_SUPABASE_URL não configurado (ainda usa template)"
  else
    check "VITE_SUPABASE_URL configurado" true
  fi
fi

echo ""
echo "3️⃣  MIGRATIONS & RLS POLICIES"
echo "─────────────────────────────────────────────────────────────"

# Verificar se migration RLS existe
[ -f "supabase/migrations/20260118_enable_rls_policies.sql" ] && \
  check "RLS Policies migration criada" true || \
  check "RLS Policies migration criada" false

# Contar policies
if [ -f "supabase/migrations/20260118_enable_rls_policies.sql" ]; then
  POLICY_COUNT=$(grep -c "CREATE POLICY" supabase/migrations/20260118_enable_rls_policies.sql)
  echo -e "${YELLOW}ℹ️${NC}  Policies definidas: $POLICY_COUNT"
fi

echo ""
echo "4️⃣  EDGE FUNCTIONS"
echo "─────────────────────────────────────────────────────────────"

# Verificar edge functions
FUNCTIONS=("gerenciar-proxy" "chat-ai" "consulta-intimacoes" "extrair-texto-pdf" "gerar-embedding" "processar-documento-rag" "executar-consultas-agendadas")

for func in "${FUNCTIONS[@]}"; do
  [ -d "supabase/functions/$func" ] && \
    check "Edge function: $func" true || \
    check "Edge function: $func (faltando)" false
done

echo ""
echo "5️⃣  APPLICATION CODE"
echo "─────────────────────────────────────────────────────────────"

# Verificar arquivos críticos
FILES=(
  "src/App.tsx"
  "src/components/ErrorBoundary.tsx"
  "src/lib/auth.ts"
  "src/lib/api.ts"
  "src/lib/database.ts"
  "src/lib/proxy.ts"
  "src/integrations/supabase/client.ts"
)

for file in "${FILES[@]}"; do
  [ -f "$file" ] && check "Arquivo: $file" true || check "Arquivo: $file (faltando)" false
done

echo ""
echo "6️⃣  DEPLOYMENT READINESS"
echo "─────────────────────────────────────────────────────────────"

# Verificar package.json
[ -f "package.json" ] && check "package.json existe" true || check "package.json existe" false

# Verificar npm scripts
if [ -f "package.json" ]; then
  grep -q '"build":' package.json && check "npm run build disponível" true || check "npm run build disponível" false
fi

# Verificar git status (no uncommitted changes em src/)
if command -v git &> /dev/null; then
  UNCOMMITTED=$(git status --short src/ 2>/dev/null | wc -l)
  if [ "$UNCOMMITTED" -eq 0 ]; then
    check "Código src/ commitado" true
  else
    echo -e "${YELLOW}⚠️${NC}  Arquivos não commitados em src/ ($UNCOMMITTED arquivos)"
  fi
fi

echo ""
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "📊 RESUMO"
echo "─────────────────────────────────────────────────────────────"
echo -e "${GREEN}✅ PASSOU:${NC} $PASSED"
echo -e "${RED}❌ FALHOU:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ PRONTO PARA DEPLOYMENT!${NC}"
  echo ""
  echo "Próximas etapas:"
  echo "1. supabase login"
  echo "2. supabase link --project-ref seu-project-id"
  echo "3. supabase db push"
  echo "4. supabase functions deploy"
  echo "5. Deploy da aplicação (Vercel, Netlify, etc.)"
  exit 0
else
  echo -e "${RED}✗ CONFIGURE OS ITENS ACIMA ANTES DE FAZER DEPLOY${NC}"
  echo ""
  echo "Ítens a configurar:"
  echo "- Preencha .env.production com seus valores reais"
  echo "- Execute: npm run build"
  echo "- Commit das mudanças"
  exit 1
fi
