#!/usr/bin/env bash
# Starts the API and the built web app on one port.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LD_LIBRARY_PATH="$ROOT/instantclient/instantclient_23_4${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
PORT="${PORT:-8001}"

cd "$ROOT/backend"
exec .venv/bin/uvicorn app.main:create_app --factory --host 127.0.0.1 --port "$PORT"
