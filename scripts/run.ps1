# Starts the API and the built web app on one port.
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Port = if ($env:PORT) { $env:PORT } else { "8001" }

Set-Location (Join-Path $Root "backend")
& ".venv\Scripts\uvicorn.exe" app.main:create_app --factory --host 127.0.0.1 --port $Port
