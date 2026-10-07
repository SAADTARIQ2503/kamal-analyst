# Rebuilds every local dependency inside the project. Nothing is installed globally.
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot

python -m venv (Join-Path $Root "backend\.venv")
$Py = Join-Path $Root "backend\.venv\Scripts\python.exe"
& $Py -m pip install --quiet --upgrade pip
& $Py -m pip install --quiet -r (Join-Path $Root "backend\requirements.txt")

$EnvFile = Join-Path $Root "backend\.env"
$EnvExample = Join-Path $Root "backend\.env.example"
if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host "Created backend\.env from the example. Fill in the values before starting the server."
}

Push-Location (Join-Path $Root "frontend")
npm ci --no-audit --no-fund
npx vite build
Pop-Location

Write-Host "Setup complete."
