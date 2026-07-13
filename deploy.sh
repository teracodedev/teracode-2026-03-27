#!/bin/bash
set -e

echo "=== テラコード デプロイ ==="

cd "$(dirname "$0")"

# デプロイ常時: Next ビルドと付帯処理を速める（next.config の SKIP_TYPECHECK も参照）
export NEXT_TELEMETRY_DISABLED=1
export GIT_TERMINAL_PROMPT=0
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_PROGRESS=false
export SKIP_TYPECHECK=1
case " ${NODE_OPTIONS:-} " in
  *"max-old-space-size"*) ;;
  *) export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=6144" ;;
esac

prev_sha="$(git rev-parse HEAD 2>/dev/null || true)"

echo "[1/5] git pull..."
git pull
new_sha="$(git rev-parse HEAD 2>/dev/null || true)"

standalone_ready=false
if [ -f ".next/standalone/server.js" ]; then
  standalone_ready=true
fi

if [ -n "$prev_sha" ] && [ -n "$new_sha" ] && [ "$prev_sha" = "$new_sha" ] && [ -z "${FORCE_BUILD:-}" ]; then
  # 変更が無いのに毎回 build/pm2/nginx を叩くと時間が無駄になるためスキップする
  if [ "$standalone_ready" = true ]; then
    echo "[0/5] 変更なし: build をスキップします（FORCE_BUILD=1 で強制）"
    # サーバー死活に備えて再起動と nginx リロードだけ実施（ビルドはしない）
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 0.25
    pm2 restart teracode 2>/dev/null || pm2 start ecosystem.config.cjs
    docker compose exec -T nginx nginx -s reload 2>/dev/null || \
      docker compose restart nginx 2>/dev/null || true
    exit 0
  fi
fi

changed_files=""
if [ -n "$prev_sha" ] && [ -n "$new_sha" ] && [ "$prev_sha" != "$new_sha" ]; then
  changed_files="$(git diff --name-only "$prev_sha" "$new_sha" 2>/dev/null || true)"
fi

need_npm_ci=false
need_prisma_generate=false
need_prisma_migrate=false
need_next_build=false
need_nginx_reload=false

if [ ! -d node_modules ]; then
  need_npm_ci=true
fi

if [ "$standalone_ready" = false ] || [ -n "${FORCE_BUILD:-}" ]; then
  need_next_build=true
  need_nginx_reload=true
  need_prisma_migrate=true
fi

while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    package.json|package-lock.json)
      need_npm_ci=true
      need_next_build=true
      ;;
    prisma/schema.prisma|prisma/schema/*|prisma.config.ts)
      need_prisma_generate=true
      need_next_build=true
      ;;
    prisma/migrations/*)
      need_prisma_generate=true
      need_prisma_migrate=true
      ;;
    nginx/*|docker-compose.yml|docker-compose.yaml)
      need_nginx_reload=true
      ;;
    src/*|public/*|middleware.ts|middleware.js|auth.ts|auth.config.ts|next.config.*|tsconfig*.json|postcss.config.*|tailwind.config.*|components.json)
      need_next_build=true
      ;;
    # ドキュメント・スクリプトのみの変更は本番ビルド不要
    *.md|docs/*|scripts/*|.gitignore|.cursor/*|CLAUDE.md|AGENTS.md)
      ;;
    *)
      # 不明なパスは安全側でビルドする
      need_next_build=true
      ;;
  esac
done <<EOF
$changed_files
EOF

# FORCE_MIGRATE=1 でマイグレーションを強制
if [ -n "${FORCE_MIGRATE:-}" ]; then
  need_prisma_migrate=true
fi

if [ "$need_npm_ci" = true ]; then
  echo "[2/5] npm ci..."
  npm ci
else
  echo "[2/5] npm ci skip（dependencies unchanged）..."
fi

# npm ci 時の postinstall で prisma generate は既に走るため、npm ci をスキップした場合のみ実行する
if [ "$need_npm_ci" = false ] && [ "$need_prisma_generate" = true ]; then
  echo "[3/5] Prisma クライアント生成..."
  npx prisma generate
else
  echo "[3/5] Prisma クライアント生成 skip..."
fi

if [ "$need_prisma_migrate" = true ]; then
  echo "[3b/5] Prisma マイグレーション適用..."
  npx prisma migrate deploy
else
  echo "[3b/5] Prisma マイグレーション skip（migrations unchanged / FORCE_MIGRATE=1 で強制）..."
fi

if [ "$need_next_build" = false ]; then
  echo "[4/5] Next.js ビルド skip（アプリ本体の変更なし）..."
  if [ "$need_nginx_reload" = true ]; then
    echo "[5d/5] nginx をリロード..."
    docker compose exec -T nginx nginx -s reload 2>/dev/null || \
      docker compose restart nginx 2>/dev/null || \
      docker-compose exec -T nginx nginx -s reload 2>/dev/null || \
      docker-compose restart nginx 2>/dev/null || true
  fi
  if [ "$need_prisma_migrate" = true ]; then
    echo "[5c/5] マイグレーション反映のため PM2 再起動..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 0.25
    pm2 restart teracode 2>/dev/null || pm2 start ecosystem.config.cjs
  fi
  echo "=== デプロイ完了（ビルド省略） ==="
  pm2 list
  exit 0
fi

# ビルド中は旧プロセスを生かしてダウンタイムを短縮（ビルド後に切替）
echo "[4/5] PM2 はビルド完了後に再起動します（ビルド中は現行プロセスを維持）..."

echo "[5/5] ビルド（Turbopack / 型チェック省略）..."
# 古いHTMLが旧ハッシュのCSS/JSを参照しても崩れないよう、既存staticを一時退避する
# FORCE_BUILD 時は旧世代とのマージを省略して I/O を削減（長時間開いたタブで稀に旧チャンク 404 の可能性あり）
STATIC_BACKUP_DIR=""
if [ -z "${FORCE_BUILD:-}" ]; then
  STATIC_BACKUP_DIR="$(mktemp -d)"
  if [ -d .next/standalone/.next/static ]; then
    mkdir -p "${STATIC_BACKUP_DIR}/static"
    cp -a .next/standalone/.next/static/. "${STATIC_BACKUP_DIR}/static/"
  fi
fi

# ビルドキャッシュを活かすため、.next 全消しはしない（standalone だけ作り直す）
rm -rf .next/standalone
npm run build

echo "[5b/5] standalone: public と .next/static を同期..."
mkdir -p .next/standalone/.next

if [ -d public ]; then
  mkdir -p .next/standalone/public
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete public/ .next/standalone/public/
  else
    cp -r public .next/standalone/
  fi
fi

if [ -d .next/static ]; then
  mkdir -p .next/standalone/.next/static
  if command -v rsync >/dev/null 2>&1; then
    # 現行ビルドの静的アセットを配置
    rsync -a .next/static/ .next/standalone/.next/static/
    # 旧HTML救済用に、過去ビルドのハッシュ資産も残す（同名は上書きしない）
    if [ -n "${STATIC_BACKUP_DIR:-}" ] && [ -d "${STATIC_BACKUP_DIR}/static" ]; then
      rsync -a --ignore-existing "${STATIC_BACKUP_DIR}/static/" .next/standalone/.next/static/
    fi
  else
    cp -r .next/static .next/standalone/.next/
    if [ -n "${STATIC_BACKUP_DIR:-}" ] && [ -d "${STATIC_BACKUP_DIR}/static" ]; then
      cp -rn "${STATIC_BACKUP_DIR}/static/." .next/standalone/.next/static/ || true
    fi
  fi
fi

if [ -n "${STATIC_BACKUP_DIR:-}" ]; then
  rm -rf "${STATIC_BACKUP_DIR}"
fi

echo "[5c/5] PM2 再起動..."
fuser -k 3000/tcp 2>/dev/null || true
sleep 0.25
pm2 restart teracode 2>/dev/null || pm2 start ecosystem.config.cjs

if [ "$need_nginx_reload" = true ]; then
  echo "[5d/5] nginx をリロード（失敗時は再起動）..."
  docker compose exec -T nginx nginx -s reload 2>/dev/null || \
    docker compose restart nginx 2>/dev/null || \
    docker-compose exec -T nginx nginx -s reload 2>/dev/null || \
    docker-compose restart nginx 2>/dev/null || true
else
  echo "[5d/5] nginx reload skip（nginx 設定に変更なし）..."
fi

echo "=== デプロイ完了 ==="
pm2 list
