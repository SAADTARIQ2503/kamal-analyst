#!/usr/bin/env bash
# Starts the API and the built web app on one port.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8001}"

cd "$ROOT/backend"
exec .venv/bin/uvicorn app.main:create_app --factory --host 127.0.0.1 --port "$PORT"
