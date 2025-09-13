# Deploying Backend API on Render

This guide covers deploying the FastAPI backend to Render using either Docker or Render’s native Python environment, with production envs and health checks.

## 1) Service Type
- Choose “Web Service” in Render.
- Region: closest to your users.
- Name: `clinical-corvus-backend` (or any name)
- Domain: configure `api.clinical-corvus.app` in Render’s custom domains.

## 2) Deploy Method A — Docker (recommended)
- Select “Docker” and set the `Dockerfile` path to `backend-api/Dockerfile.prod`.
- Render auto-detects the port from the Dockerfile/cmd (`8000`).
- Health Check Path: `/api/health`
- Auto deploy: your preference.

## 3) Deploy Method B — Native Python
- Environment: `Python 3.10`
- Build Command:
  ```bash
  pip install --upgrade pip
  pip install -r backend-api/requirements.txt
  ```
- Start Command:
  ```bash
  cd backend-api && uvicorn main:app --host 0.0.0.0 --port 8000
  ```
- Health Check Path: `/api/health`

## 4) Required Environment Variables (Render → Settings → Environment)
- Core
  - `ENVIRONMENT=production`
  - `DATABASE_URL=...`
  - `SECRET_KEY=...`
  - `GROUP_SESSION_ENCRYPTION_KEY=...` (base64 urlsafe 32-byte Fernet key)
- Clerk (Auth)
  - `CLERK_SECRET_KEY=...`
  - `CLERK_API_URL=https://api.clerk.com` (default)
  - `CLERK_API_VERSION=v1` (default)
  - `CLERK_JWT_ISSUER=...` (strict issuer check)
  - `CLERK_JWT_AUDIENCE=...` (strict audience check)
- Frontend/CORS
  - `FRONTEND_URL=https://www.clinical-corvus.app`
  - `CORS_ORIGINS=https://www.clinical-corvus.app`
- External APIs (as needed)
  - `DEEPL_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `LLAMA_CLOUD_API_KEY`, `BRAVE_API_KEY`, `NCBI_API_KEY`
- Optional
  - `MCP_SERVER_URL` (if using MCP)

## 5) Scaling & Health Checks
- Instance type: pick appropriate CPU/RAM for your workload.
- Health check: `/api/health` (200 OK)
- Auto restarts on failure can be enabled.

## 6) Logs & Metrics
- Use Render logs to validate startup.
- Ensure no PHI or secrets are logged.

## 7) DNS & TLS
- Add `api.clinical-corvus.app` as a custom domain in Render.
- Render will provision a managed TLS certificate.

