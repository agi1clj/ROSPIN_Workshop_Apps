# Rospin NDVI Explorer (Apps repository)

Satellite-data app for the **ROSPIN Space Talks: Cloud Automation and Deployment Workshop**. It shows vegetation health (NDVI) of four Romanian regions from Sentinel-2 images.

```
Browser -> frontend (React + Leaflet, Nginx :8080) -> backend (FastAPI :8000) -> sample JSON | live Sentinel-2 (public AWS archive)
```

Data needs no account or API key. The default *Sample* source is instant and works offline. *Live Sentinel-2* reads real satellite files and takes about a minute.

## Run locally

```bash
docker compose up --build
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

Stop with `Ctrl+C`, then `docker compose down`.

## Deploy to Azure

Follow the walkthrough in the Infra repository (`docs/walkthrough.md`). After setup, every push to `main` that changes `backend/` or `frontend/` is tested, built into an image, pushed to Azure Container Registry and rolled out to Azure Container Apps.

## Your challenge (use your AI agent)

Open this folder in Claude Code, Gemini CLI, Codex or Copilot. They read `AGENTS.md` first. Ask the agent to add something, review the diff, push, and watch GitHub Actions deploy it. Ideas: a new region (your city), a forest-loss comparison, an NDVI colour legend on the map, a `/api/regions/{id}/ndvi` field for the best scene.

## Live deployment (fill in)

- Frontend: <https://...>
- Backend: <https://.../docs>
