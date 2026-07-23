# NCEC AI Platform — Render Backend (OCR + RAG with Ollama weights)

Production FastAPI service: **PaddleOCR** + **Ollama** (`nomic-embed-text`, `llama3.2:1b`) + **Supabase pgvector**.

Ollama runs **inside the Docker container** with model weights baked in at image build time. No ngrok / laptop tunnel is required.

---

## Files

| File | Role |
|------|------|
| `main.py` | FastAPI — OCR, LLM proxy, `/api/rag/chat` |
| `rag.py` | Embed → vector search → generate from context |
| `start.sh` | Starts `ollama serve`, verifies models, then FastAPI |
| `Dockerfile` | Installs Ollama + pulls model weights |
| `render.yaml` | Render Blueprint |

---

## Render environment variables (required)

Set these in **Dashboard → Environment**:

| Key | Value |
|-----|--------|
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` (default — in-container) |
| `EMBED_MODEL` | `nomic-embed-text` |
| `CHAT_MODEL` | `llama3.2:1b` |
| `PORT` | `8100` |

> **Plan:** use **Standard (2 GB RAM)** or higher. Starter (512 MB) cannot run Ollama + PaddleOCR together.

---

## Deploy

1. Push repo to GitHub.
2. Render → **New Web Service** → Docker.
3. **Root Directory:** `render-backend`
4. **Dockerfile Path:** `./Dockerfile`
5. Set env vars above → Deploy.
6. First build pulls model weights (~1.5 GB) — expect 10–20 minutes.

### Verify Ollama after deploy

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expect:

```json
{
  "ollama": {
    "reachable": true,
    "embed_ready": true,
    "chat_ready": true,
    "models": ["nomic-embed-text:latest", "llama3.2:1b"]
  },
  "supabase_configured": true
}
```

---

## Frontend (Vercel)

```env
VITE_OCR_API_URL=https://YOUR-SERVICE.onrender.com
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Re-index documents after switching to real embeddings

If documents were uploaded while the backend used fake/hash embeddings, **re-upload them in Knowledge Base** so chunks are embedded with `nomic-embed-text`. Otherwise vector search will miss relevant passages.
