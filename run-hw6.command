#!/bin/zsh
cd "$(dirname "$0")"
NODE18="$HOME/.nvm/versions/node/v18.20.8/bin/node"
if [ -x "$NODE18" ]; then
  exec "$NODE18" server/main.js 2026 2026 http
else
  echo 'This legacy course server requires Node 18. Select Node 18, then run:'
  echo 'node server/main.js 2026 2026 http'
  exit 1
fi
