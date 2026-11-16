#!/usr/bin/env sh
set -eu
PORT="${PORT:-4173}"
printf 'Starting FairShare at http://localhost:%s\n' "$PORT"
exec python3 -m http.server "$PORT"
