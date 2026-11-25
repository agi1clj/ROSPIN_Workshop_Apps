# AGENTS.md

Workshop project (ROSPIN Space Talks): a satellite-data app that is built, tested and deployed to Azure Container Apps by GitHub Actions. The Infra repository (`*-rospin-infra`) creates the Azure resources. Keep it simple: no database, no auth, no extra services unless asked.

## What the app does
Shows vegetation health (NDVI) of four Romanian regions from Sentinel-2 satellite data. NDVI = (NIR - Red) / (NIR + Red); above 0.6 is healthy vegetation.

## Layout
- `backend/` FastAPI on port 8000. `app/main.py` routes, `app/ndvi.py` NDVI logic, `app/regions.py` study regions, `app/sample_ndvi.json` precomputed series (default data source), `tests/` pytest.
- `frontend/` React + Vite + Leaflet, served by Nginx on port 8080. Backend URL is read at runtime from `/config.js` (env var `API_BASE_URL`), never compiled in.
- `docker-compose.yml` local stack: frontend http://localhost:3000, backend http://localhost:8000/docs.
- `.github/workflows/` `backend.yml` and `frontend.yml`: test -> OIDC login -> docker build -> push to ACR -> update container app -> verify version.

## Verify before finishing
- `cd backend && pip install -r requirements-dev.txt && python -m pytest`
- `cd frontend && npm ci && npm run build`
- `docker compose up --build` and open http://localhost:3000

## Rules
- Keep `GET /health` (backend, returns `version`) and `GET /healthz` (frontend, Nginx). Azure probes and CI use them.
- Never put secrets or Azure IDs in code, workflows or commits. Azure access uses GitHub OIDC variables, no passwords.
- Do not commit `.env` files. Images run as non-root.
- Add a region: append to `backend/app/regions.py`, then `docker compose run --rm -v "$PWD/backend/app:/app/app" backend python -m app.export_sample <region-id>` (needs internet, about 1 minute; writes `backend/app/sample_ndvi.json` on the host). Without sample data the test `test_every_region_has_sample_data` fails and CI blocks the deploy.
- Commits follow Conventional Commits: `type(scope): summary` (feat, fix, docs, refactor, test, ci, chore).
- Never run `terraform apply/destroy` or Azure commands without explicit user approval.

## Agent skills (optional, recommended)
Claude Code offers the plugins in `.claude/settings.json` when you trust the folder. Other agents (Codex, Copilot, Cursor, Gemini CLI): see `docs/ai-setup.md` in the Infra repository.
