# Infisical → Vercel / Render Sync

Use Infisical as the source of truth and sync secrets to your hosting platforms without using the UI.

## Option A — Use Infisical Integrations (Recommended)
- In Infisical → Integrations:
  - Add Vercel, pick the project and Environments (Development/Preview/Production) to sync from your Infisical Project/Env.
  - If a Render integration is available, configure similarly. Otherwise, see Option B.
- Choose push-only (one-way) or bi-directional sync.

## Option B — GitHub Actions to Push Secrets
This job pulls secrets from Infisical via CLI and pushes to Vercel via API. Render can be added similarly using its API.

1) Create a Service Token in Infisical with read access to your Project/Production env. Save as `INFISICAL_TOKEN` in GitHub repo secrets.
2) In Vercel, create a Personal Token; save as `VERCEL_TOKEN`. Also note the `VERCEL_PROJECT_ID`.
3) (Optional) For Render, create `RENDER_API_KEY` and note your `RENDER_SERVICE_ID`.

Add `.github/workflows/sync-secrets.yml`:

```yaml
name: Sync Secrets from Infisical

on:
  workflow_dispatch:

jobs:
  vercel-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Infisical CLI
        run: npm i -g infisical
      - name: Export Infisical secrets (Production)
        env:
          INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
        run: |
          echo "Exporting secrets from Infisical..."
          infisical export --env=Production --format=json > secrets.json
          jq '. | length' secrets.json
      - name: Push to Vercel Project Env (production)
        env:
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          for row in $(jq -r 'to_entries[] | @base64' secrets.json); do
            _jq() { echo ${row} | base64 -d | jq -r ${1}; }
            KEY=$(_jq '.key')
            VAL=$(_jq '.value')
            curl -sS -X POST "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?upsert=1" \
              -H "Authorization: Bearer ${VERCEL_TOKEN}" \
              -H "Content-Type: application/json" \
              -d "{\"key\":\"${KEY}\",\"value\":\"${VAL}\",\"target\":[\"production\"],\"type\":\"plain\"}" > /dev/null
          done
          echo "Vercel sync complete"
  # render-sync:
  #   runs-on: ubuntu-latest
  #   if: ${{ secrets.RENDER_API_KEY && secrets.RENDER_SERVICE_ID }}
  #   steps:
  #     - uses: actions/checkout@v4
  #     - run: npm i -g infisical
  #     - env:
  #         INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
  #       run: infisical export --env=Production --format=json > secrets.json
  #     - name: Push to Render (example; confirm endpoint in Render API docs)
  #       env:
  #         RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
  #         RENDER_SERVICE_ID: ${{ secrets.RENDER_SERVICE_ID }}
  #       run: |
  #         for row in $(jq -r 'to_entries[] | @base64' secrets.json); do
  #           _jq() { echo ${row} | base64 -d | jq -r ${1}; }
  #           KEY=$(_jq '.key'); VAL=$(_jq '.value')
  #           # Example endpoint; replace with current Render API endpoint for env vars
  #           curl -sS -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars" \
  #             -H "Authorization: Bearer ${RENDER_API_KEY}" \
  #             -H "Content-Type: application/json" \
  #             -d "{\"key\":\"${KEY}\",\"value\":\"${VAL}\"}" > /dev/null
  #         done
  #         echo "Render sync complete"
```

> Note: The Vercel API path and payload are stable as of this writing; if your Vercel project is under a Team, include `?teamId=...` in the URL. For Render, consult their latest API docs for the correct endpoint and payload to create/update env vars.

## Option C — Export .env then use provider CLIs
- Export from Infisical: `infisical export --env Production --format=dotenv > .env.prod`
- Vercel: use Vercel CLI to add envs (interactive) or API (non-interactive as in Option B).
- Render: add envs via dashboard or API.

---

Once synced, deploy:
- Vercel (frontend): set `NEXT_PUBLIC_BACKEND_URL=https://api.clinical-corvus.app` and any CSP extras if needed.
- Render (backend): ensure `FRONTEND_URL` and `CORS_ORIGINS` are `https://www.clinical-corvus.app`.

