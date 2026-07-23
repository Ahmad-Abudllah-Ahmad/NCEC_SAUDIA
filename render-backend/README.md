# NCEC Render Backend

Production FastAPI service: **PaddleOCR** + **Groq Llama 3.1 8B Instant** (open-weight) + **Supabase pgvector**.

No Ollama and no local GGUF. Chat runs on Groq’s API. Embeddings use a light 768-d vector plus keyword/phrase search (Article numbers, etc.).

## Env vars (Render)

| Key | Example |
|-----|---------|
| `PORT` | `8100` |
| `CHAT_MODEL` | `llama-3.1-8b-instant` |
| `GROQ_API_KEY` | your Groq key |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |

## Health

`GET /api/health` returns OCR + Groq engine status.
