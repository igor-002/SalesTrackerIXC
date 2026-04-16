#!/bin/bash
# Deploy do SalesTracker no VPS
# Rode este script na sua máquina local (Windows: use Git Bash ou WSL)
#
# Pré-requisitos locais:
#   - Node 24, npm
#   - .env.production preenchido com VITE_SUPABASE_* e VITE_IXC_*
#   - SSH configurado: ssh root@104.234.186.129 (ou chave SSH)
#
# Uso:
#   bash deploy/deploy.sh
#   bash deploy/deploy.sh --host usuario@meudominio.com.br   (sobrescreve host)

set -e

VPS_HOST="${VPS_HOST:-root@104.234.186.129}"
APP_DIR=/var/www/salestracker

# Sobrescrever host via argumento --host
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --host) VPS_HOST="$2"; shift ;;
  esac
  shift
done

echo "→ Build de produção..."
npm run build

echo "→ Enviando dist/ para $VPS_HOST:$APP_DIR ..."
rsync -avz --delete dist/ "$VPS_HOST:$APP_DIR/dist/"

echo "→ Recarregando Nginx..."
ssh "$VPS_HOST" "nginx -t && systemctl reload nginx"

echo ""
echo "✓ Deploy concluído! Acesse http://104.234.186.129"
