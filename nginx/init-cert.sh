#!/bin/bash
# Let's Encrypt 初回証明書取得スクリプト
# 使い方: sudo bash nginx/init-cert.sh your@email.com

EMAIL=${1:?"使い方: $0 メールアドレス"}
DOMAIN="teracode6.zenpoji.or.jp"

echo "=== 証明書取得開始: $DOMAIN ==="

# certbot コンテナで証明書取得（webroot 方式。standalone は使わない）
# 初回のみ init.conf.example を default.conf にコピーして nginx を起動してから実行する
docker compose --profile manual run -T --rm --entrypoint certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  -d "$DOMAIN"

echo "=== 証明書取得完了 ==="
echo "=== nginx を再起動します ==="
docker compose restart nginx
echo "=== 完了 ==="
