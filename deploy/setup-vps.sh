#!/bin/bash
# Setup inicial do VPS (rodar UMA VEZ como root)
# AlmaLinux 9.5 · IP 104.234.186.129 · Node 24 já instalado

set -e

APP_DIR=/var/www/salestracker

# 1. Nginx
echo "→ Instalando Nginx..."
dnf install -y nginx
systemctl enable nginx

# 2. Diretório da aplicação
echo "→ Criando diretório $APP_DIR..."
mkdir -p "$APP_DIR"

# 3. Copiar configuração do Nginx
echo "→ Configurando Nginx..."
cp "$(dirname "$0")/nginx.conf" /etc/nginx/conf.d/salestracker.conf
# Desabilita o server block padrão se existir
sed -i 's/^server {/# server {/' /etc/nginx/nginx.conf 2>/dev/null || true
nginx -t
systemctl restart nginx

echo ""
echo "✓ Setup concluído. Agora rode ./deploy.sh para enviar o build."
