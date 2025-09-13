# Infisical Integration (Secrets Management)

This project supports loading runtime secrets via Infisical (free plan available), so no secrets live in the repo.

## Why Infisical
- Central UI to manage per‑env secrets (dev/staging/prod)
- Simple CLI wrapper to inject env vars when starting the stack
- Works locally and on servers/CI without code changes

## Prerequisites
- Node.js installed (for the CLI)
- Infisical account (free tier)

## Setup
1) Install CLI
```
npm install -g @infisical/cli
```

2) Create a Project and Environments (e.g., Development, Production)

3) Add Secrets in Infisical UI
- Add all variables you currently keep in `.env` / `frontend/.env.local`.

4) Run Locally with Secrets
```
# Backend + MCP + Frontend (dev)
infisical run --env=Development -- docker compose -f docker-compose.dev.yml up -d

# If running backend API directly (example)
infisical run --env=Development -- uvicorn backend-api.main:app --reload
```

5) Run in Production
On the server, install the Infisical CLI and login once (or use a machine identity).
```
infisical run --env=Production -- docker compose -f docker-compose.prod.yml up -d
```

## Tips
- Keep `/.env.example` with variable names only (no secrets) for documentation.
- For CI, prefer Infisical’s Machine Identity or inject via CI secret store and `infisical run`.
- You can still support `--env-file` as a fallback; Infisical simply populates `process.env`/OS envs before the process starts.

