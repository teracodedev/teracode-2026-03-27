#!/bin/bash
exec > >(tee -a /home/ubuntu/teracode-2026-03-27/scripts/post-reboot-check.log) 2>&1
echo "==== $(date -Is) post-reboot check ===="
uname -r
test ! -f /var/run/reboot-required && echo "reboot-required: cleared" || echo "reboot-required: still present"
docker compose -f /home/ubuntu/teracode-2026-03-27/docker-compose.yml ps
export NVM_DIR=/home/ubuntu/.nvm
. "$NVM_DIR/nvm.sh"
nvm use default >/dev/null
pm2 status
curl -s -o /dev/null -w "login:%{http_code}\n" http://127.0.0.1:3000/login
curl -s -o /dev/null -w "http_named:%{http_code}\n" -H 'Host: teracode6.zenpoji.or.jp' http://127.0.0.1/
