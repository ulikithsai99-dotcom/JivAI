# JivAI Backend (FastAPI)

This directory contains the FastAPI backend powering the JivAI frontend. It provides classification, guidance, escalation, translation (mock), and a RAG retrieval layer backed by FAISS.

Quick start (native / development):

1. Create a Python environment (recommended: venv or conda)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and adjust any keys (optional)

3. Run the app with Uvicorn:

```powershell
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

API routes (selected):
- `POST /speech` — classify transcript -> `{ category, urgency }`
- `POST /guidance` — get guidance for a category -> `{ helpline, steps }`
- `POST /escalate` — escalation recommendations
- `POST /api/emergency/analyze` — compatibility analysis
- `POST /api/translate` — translation (mock by default)

Integration with the existing frontend:
- The frontend expects a client at `jivai/src/services/api.ts`. A file was added with functions `classifyEmergency`, `getGuidance`, `getEscalation`, `translateResponse`, and compatibility helpers.
- Configure the frontend environment variable `VITE_API_BASE_URL` to point to the backend base URL (e.g. `http://localhost:8000`).

Notes:
- The RAG layer uses an offline deterministic embedding function (no external model) and FAISS — the index will be built on first run if missing.
- Translation, Gemini, and Maps integrations have mock implementations by default. Provide API keys via `.env` and toggle flags in `utils/config.py`.
- Endpoints are async where appropriate, use dependency injection, and load knowledge JSON files from `backend/data/`.

If you'd like, I can:
- Run a quick smoke test script to call `/speech` and `/guidance`.
- Add unit tests or a Dockerfile for production deployment.
