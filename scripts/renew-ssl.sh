#!/bin/bash
# Let's Encrypt 証明書の更新（webroot 方式）
# nginx が 80 番を使用中でも更新できる。standalone は使わないこと。
set -euo pipefail

cd "$(dirname "$0")/.."

if docker info >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="sudo docker compose"
fi

log() {
  echo "[$(date -Iseconds)] $*"
}

log "SSL 証明書の更新チェックを開始します"

$COMPOSE --profile manual run -T --rm --entrypoint certbot certbot renew \
  --webroot \
  --webroot-path=/var/www/certbot \
  --non-interactive \
  "$@"

log "nginx をリロードします"
$COMPOSE exec -T nginx nginx -s reload

log "完了"
