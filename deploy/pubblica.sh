#!/usr/bin/env bash
# Pubblica Deep Anatomy sulla VPS: copia i sorgenti, installa, costruisce la web app e riavvia il processo PM2.
#   bash deploy/pubblica.sh
# Il .env di produzione sta solo sul server (/srv/nodeapps/deep-anatomy/.env) e non viene toccato.
# La prima installazione (database, .env, nginx, https) è descritta in deploy/README.md.
set -euo pipefail

SERVER="${SERVER:-root@217.160.58.145}"
DIR="/srv/nodeapps/deep-anatomy"
cd "$(dirname "$0")/.."

rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .env --exclude .mongo \
  --exclude apps/web/dist --exclude .DS_Store \
  ./ "$SERVER:$DIR/"

# MONGOMS_DISABLE_POSTINSTALL: sul server non serve il mongod dei test
ssh "$SERVER" "cd $DIR && MONGOMS_DISABLE_POSTINSTALL=1 npm ci --no-audit --no-fund \
  && npm run build \
  && pm2 startOrReload deploy/ecosystem.config.cjs --update-env \
  && pm2 save"

echo "Pubblicato. Log: ssh $SERVER pm2 logs deep-anatomy"
