#!/usr/bin/env bash
# Rebuilds every local dependency inside the project. Nothing is installed globally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IC_DIR="$ROOT/instantclient/instantclient_23_4"

if [ ! -d "$IC_DIR" ]; then
  echo "Oracle Instant Client not found at $IC_DIR"
  echo "Download the Basic Lite Linux x64 zip from Oracle and extract it into instantclient/."
  exit 1
fi

python3 -m venv "$ROOT/backend/.venv"
"$ROOT/backend/.venv/bin/pip" install --quiet --upgrade pip
"$ROOT/backend/.venv/bin/pip" install --quiet -r "$ROOT/backend/requirements.txt"

if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "Created backend/.env from the example. Fill in the values before starting the server."
fi

(cd "$ROOT/frontend" && npm ci --no-audit --no-fund && npx vite build)

echo "Setup complete."
