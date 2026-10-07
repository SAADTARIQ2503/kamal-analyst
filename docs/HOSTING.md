# Hosting the Kamal Analyst app

This guide covers running the app on a server inside your network (or on a public server behind HTTPS). It assumes Linux with Python 3.10+, Node 22+, and network access to the Oracle database.

## 1. What runs where

- **Backend:** FastAPI served by uvicorn. It also serves the built web app from `frontend/dist`, so one process serves both the pages and the API.
- **Oracle Instant Client:** a local copy in `instantclient/instantclient_23_4`. The backend loads it from there.
- **Local data:** `backend/data/app.sqlite` holds saved views. Back it up.
- **Users:** one application login, set in `backend/.env`.

Keep uvicorn on `127.0.0.1` and put a reverse proxy with HTTPS in front of it. The app's own cookies, rate limits, caches, and AI daily limit all live in one process, so run **one** uvicorn worker.

## 2. Server prerequisites

```bash
sudo apt update
sudo apt install -y python3 python3-venv nodejs npm libaio1t64   # use libaio1 on older Ubuntu
```

Check that the database port is reachable from the server:

```bash
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/DB_HOST/1521' && echo open || echo blocked
```

## 3. Get the code and Oracle Instant Client

1. Copy the project folder to the server, for example `/opt/kamal-analyst`.
2. Download Oracle Instant Client **Basic Lite, Linux x64** and extract it so that this folder exists:
   `/opt/kamal-analyst/instantclient/instantclient_23_4/`
   The `libaio` package is needed on the host, or you can copy `libaio.so.1` into that folder as we did in development.

## 4. Build the dependencies

From the project folder:

```bash
cd /opt/kamal-analyst
scripts/setup.sh
```

This creates `backend/.venv`, installs pinned Python packages, creates `backend/.env` from the example if it's missing, installs frontend packages, and builds `frontend/dist`.

## 5. Configure secrets

Edit `backend/.env`. Every value is described in `backend/.env.example`. Generate the values that need it:

```bash
# Session secret (paste into KT_SESSION_SECRET)
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Login password hash (paste into KT_APP_PASSWORD_HASH)
backend/.venv/bin/python -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('CHOOSE-A-PASSWORD'))"
```

Set `KT_SESSION_HTTPS_ONLY=true` once the site is served over HTTPS. Browsers will not send the session cookie over plain HTTP when this is on.

File permissions:

```bash
chmod 600 backend/.env
```

## 6. Start the app

Quick test:

```bash
cd /opt/kamal-analyst
scripts/run.sh          # listens on 127.0.0.1:8001 (set PORT=... to change)
curl http://127.0.0.1:8001/api/health    # should return {"status":"ok",...}
```

For a long-running service, create a systemd unit at `/etc/systemd/system/kamal-analyst.service`:

```ini
[Unit]
Description=Kamal Analyst
After=network-online.target
Wants=network-online.target

[Service]
User=kamal
WorkingDirectory=/opt/kamal-analyst/backend
Environment=LD_LIBRARY_PATH=/opt/kamal-analyst/instantclient/instantclient_23_4
ExecStart=/opt/kamal-analyst/backend/.venv/bin/uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8001 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo useradd --system --home /opt/kamal-analyst kamal    # if the user does not exist
sudo chown -R kamal: /opt/kamal-analyst/backend/data
sudo systemctl daemon-reload
sudo systemctl enable --now kamal-analyst
sudo journalctl -u kamal-analyst -f                     # watch the logs
```

## 7. HTTPS with a reverse proxy

Any reverse proxy works. Example with **Caddy**, which gets certificates automatically when the name is public:

```
analyst.example.com {
    reverse_proxy 127.0.0.1:8001
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
}
```

For an **internal-only** server, use an internal DNS name with a certificate from your own CA, or Caddy's internal CA (`tls internal`). Browsers must trust the certificate.

With the proxy in place, set `KT_SESSION_HTTPS_ONLY=true`, restart the service, and check the login cookie is marked Secure.

## 8. Before you let anyone use it

These items come from `claude.md` and from the review in this project. Do them before a wider rollout.

1. **Rotate the database password.** It was stored in plain text in `info.txt` and has appeared in chat. Change it in Oracle, update `KT_DB_PASSWORD`, then delete `info.txt`.
2. **Use a read-only database account.** The app's account currently has broad read rights and some write-capable grants. The SQL editor is allowed for the demo only. Before production, create an account with `SELECT` on the approved views only, and point the app at it.
3. **Decide on the SQL editor.** It runs free-form SELECT statements for all users. Remove it or restrict it to an admin role before opening the app beyond a trusted group. The demo exception is recorded in `claude.md`.
4. **Login rate limiting is not built.** Keep the app on an internal network, or add rate limiting at the reverse proxy.
5. **Only one login.** Everyone signs in with the same account. Per-user logins are not built.
6. **Keep secrets out of git.** `backend/.env` and `backend/data/` are in `.gitignore`. Check before any push.
7. **Back up** `backend/data/app.sqlite` (saved views) and `backend/.env` (store it in your secrets vault, not in the backup folder).

## 9. Updating the app

```bash
sudo systemctl stop kamal-analyst
# copy the new code over, keeping backend/.env and backend/data/
cd /opt/kamal-analyst && scripts/setup.sh
sudo systemctl start kamal-analyst
curl http://127.0.0.1:8001/api/health
```

## 10. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `DPI-1047 Cannot locate a 64-bit Oracle Client library` | `LD_LIBRARY_PATH` does not point at the Instant Client folder, or `libaio` is missing. |
| `ORA-12543` or `ORA-12541` | The database host or port is unreachable from the server. Check firewalls and the `KT_DB_DSN` value. |
| `ORA-01017` | Wrong database user or password. |
| Login works but pages are blank | `frontend/dist` is missing. Run `scripts/setup.sh` or `npx vite build` in `frontend/`. |
| Summaries say "not available right now" | `KT_ANTHROPIC_API_KEY` is empty or invalid. |
| Login cookie missing over HTTP | `KT_SESSION_HTTPS_ONLY=true` requires HTTPS. Use the proxy, or set it to `false` on an HTTP-only test server. |
| `401` on every page after restart | The session secret changed. Users must sign in again. |

## 11. Quick checklist

- [ ] Server reaches the database port.
- [ ] Instant Client in `instantclient/instantclient_23_4`.
- [ ] `scripts/setup.sh` finished without errors.
- [ ] `backend/.env` filled in, permissions 600, database password rotated.
- [ ] Service running with one worker, `curl /api/health` returns ok.
- [ ] HTTPS in front, `KT_SESSION_HTTPS_ONLY=true`.
- [ ] `info.txt` deleted.
- [ ] SQL editor decision made.

## 12. Running on Windows

The application code is already cross-platform (the backend uses `pathlib` throughout and has no Linux-specific calls), so nothing in `backend/app` or `frontend/src` needs to change. What's different is the tooling: Linux shell scripts, the Oracle Instant Client build, and how you run it as a background service. PowerShell equivalents of the two scripts are in `scripts/setup.ps1` and `scripts/run.ps1`. I wrote these from the same logic as the bash versions, but could not test them on an actual Windows machine, so verify each step the first time.

### Prerequisites

- **Python 3.10+ (64-bit)** and **Node 22+**, both on `PATH`. Check with `python --version` and `node --version` in PowerShell.
- **Microsoft Visual C++ Redistributable 2017 or later (x64)**. Oracle's Windows Instant Client needs it; without it you'll see a missing-DLL error, not an Oracle-specific one.
- An **Oracle Instant Client Basic Lite, Windows x64** zip, not the Linux one. Extract it so this folder exists:
  `instantclient\instantclient_23_4\`
  Unlike Linux, Windows does not need a separate `libaio` package — that requirement was Linux-only.

### Setup and run

```powershell
cd C:\path\to\KamalTextile
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # allow this session to run local scripts
.\scripts\setup.ps1
```

Fill in `backend\.env` as described in section 5 above (the `python3` commands there become `python`, and venv paths become `backend\.venv\Scripts\python.exe`).

```powershell
.\scripts\run.ps1          # listens on 127.0.0.1:8001; set $env:PORT first to change it
curl http://127.0.0.1:8001/api/health
```

Note what's *not* needed on Windows: `run.ps1` does not set anything equivalent to `LD_LIBRARY_PATH`. On Linux that variable is required because `dlopen` won't resolve the Instant Client's internal library dependencies from the directory you pass in. On Windows, `oracledb.init_oracle_client(lib_dir=...)` — already in `db.py`, no code change needed — registers that directory for DLL search on your behalf. If you still see `DPI-1047`, double check the Instant Client is the Windows build and matches your Python's bitness (64-bit with 64-bit).

### Running it as a background service

systemd doesn't exist on Windows. The simplest equivalent is [NSSM](https://nssm.cc/) (free, widely used):

```powershell
nssm install KamalAnalyst "C:\path\to\KamalTextile\backend\.venv\Scripts\uvicorn.exe" `
  "app.main:create_app --factory --host 127.0.0.1 --port 8001 --proxy-headers --forwarded-allow-ips=127.0.0.1"
nssm set KamalAnalyst AppDirectory "C:\path\to\KamalTextile\backend"
nssm start KamalAnalyst
```

Alternatively, a Scheduled Task set to run at startup with "restart on failure" works, though NSSM gives cleaner log handling and restarts.

### HTTPS in front of it

Caddy ships an official Windows binary and uses the exact same Caddyfile shown in section 7 — run it the same way, as an NSSM service pointed at `caddy.exe run`. IIS with URL Rewrite + Application Request Routing is the native Windows alternative if you already run IIS.

### Command translations used throughout this guide

| Linux (bash) | Windows (PowerShell) |
| --- | --- |
| `python3` | `python` |
| `backend/.venv/bin/python` | `backend\.venv\Scripts\python.exe` |
| `export VAR=value` | `$env:VAR = "value"` |
| `chmod 600 backend/.env` | `icacls backend\.env /inheritance:r /grant:r "$env:USERNAME:F"` |
| `mkdir -p path` | `New-Item -ItemType Directory -Force -Path path` |
| `timeout 5 bash -c 'cat < /dev/null > /dev/tcp/HOST/1521'` | `Test-NetConnection -ComputerName HOST -Port 1521` |
| `systemctl` service | NSSM service (see above) |

### Windows-specific troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `The term 'uvicorn' is not recognized` | You're calling `uvicorn` directly instead of `.venv\Scripts\uvicorn.exe`, or setup didn't finish. |
| A `VCRUNTIME140.dll` or similar missing-DLL error on startup | Install the Visual C++ Redistributable x64. |
| `DPI-1047` even though the Instant Client folder exists | You extracted the Linux zip, or a 32-bit Instant Client with 64-bit Python (or vice versa). |
| Scripts refuse to run ("running scripts is disabled") | PowerShell's default execution policy. Use the `Set-ExecutionPolicy -Scope Process` line above, or `Unblock-File` on the `.ps1` files. |
