#!/bin/bash
# 証明書自動更新を登録する（1 日 2 回）
# cron が無い環境では systemd の certbot.timer を上書きする
# 使い方: bash scripts/setup-ssl-cron.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RENEW_SCRIPT="${PROJECT_DIR}/scripts/renew-ssl.sh"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/ssl-renew.log"
CRON_TAG="# teracode-ssl-renew"

if [ ! -x "$RENEW_SCRIPT" ]; then
  chmod +x "$RENEW_SCRIPT"
fi

mkdir -p "$LOG_DIR"

if command -v crontab >/dev/null 2>&1; then
  if groups | grep -q '\bdocker\b'; then
    RUN_PREFIX=""
  else
    RUN_PREFIX="sudo "
  fi

  CRON_LINE="17 3,15 * * * cd ${PROJECT_DIR} && ${RUN_PREFIX}/bin/bash ${RENEW_SCRIPT} >> ${LOG_FILE} 2>&1 ${CRON_TAG}"

  TMP="$(mktemp)"
  crontab -l 2>/dev/null | grep -v "$CRON_TAG" >"$TMP" || true
  echo "$CRON_LINE" >>"$TMP"
  crontab "$TMP"
  rm -f "$TMP"

  echo "cron を登録しました:"
  echo "  $CRON_LINE"
else
  OVERRIDE_DIR="/etc/systemd/system/certbot.service.d"
  sudo mkdir -p "$OVERRIDE_DIR"
  sudo tee "${OVERRIDE_DIR}/teracode.conf" >/dev/null <<EOF
[Service]
ExecStart=
ExecStart=/bin/bash ${RENEW_SCRIPT}
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable certbot.timer
  sudo systemctl restart certbot.timer

  echo "systemd certbot.timer を設定しました（webroot + nginx reload）:"
  systemctl status certbot.timer --no-pager | head -5
fi

echo "ログ: ${LOG_FILE}（手動実行時は scripts/renew-ssl.sh の標準出力）"
