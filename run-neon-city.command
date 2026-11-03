#!/bin/zsh
cd "$(dirname "$0")"
NODE18="$HOME/.nvm/versions/node/v18.20.8/bin/node"
MODE="${1:-http}"
if [[ "$MODE" != http && "$MODE" != https ]]; then
  echo 'Usage: ./run-neon-city.command [http|https]'; exit 1
fi
if [[ "$MODE" == https && ( ! -f key.key || ! -f cert.cer ) ]]; then
  echo 'Quest HTTPS requires key.key and cert.cer in this repository (ignored by Git).'
  echo 'Use a certificate trusted by the headset for your server hostname.'
  exit 1
fi
if [ ! -x "$NODE18" ]; then
  echo 'This course server uses Node 18. With Node 18 selected, run:'
  echo "node server/main.js 2026 2026 $MODE"; exit 1
fi
echo "Open $MODE://localhost:2026 and select neon_city_2099."
exec "$NODE18" server/main.js 2026 2026 "$MODE"
