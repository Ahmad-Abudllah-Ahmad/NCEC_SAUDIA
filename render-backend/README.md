# NCEC Render Backend

Production FastAPI service: **PaddleOCR** + **Vicuna-68M** (open-weight GGUF ~40 MB via `llama-cpp-python`) + **Supabase pgvector**.

No Ollama. Chat weights are tiny enough for Render starter memory. Embeddings use a light 768-d vector (plus keyword hybrid search) so retrieval still works without a heavy embed model.

## Layout

| File | Role |
|------|------|
| `main.py` | FastAPI: OCR jobs, `/api/rag/chat`, `/api/llm/*`, health |
| `rag.py` | Embed → Supabase match + keyword → tiny LLM / extractive fallback |
| `llm_engine.py` | Download/load Vicuna-68M GGUF; light embeddings |
| `start.sh` | Ensures GGUF present, starts uvicorn |
| `Dockerfile` | Slim Python image; prebuilt `llama-cpp-python` CPU wheel + ~40 MB GGUF |

## Env vars (Render)

| Key | Example |
|-----|---------|
| `PORT` | `8100` |
| `CHAT_MODEL` | `vicuna-68m` |
| `MODEL_DIR` | `/app/models` |
| `GGUF_NAME` | `vicuna-68m.Q3_K_S.gguf` |
| `GGUF_URL` | Hugging Face resolve URL for the GGUF |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |

## Health

`GET /api/health` returns OCR + LLM engine status (weights size, ready flag).

## Notes

- If older documents were embedded with a different scheme, re-upload in Knowledge Base so chunks match the light 768-d vectors.
- If the tiny LLM fails to load, RAG falls back to **extractive answers** from retrieved chunks (0 MB extra weights).
