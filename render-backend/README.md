# NCEC Render Backend

Production FastAPI: **PaddleOCR** + **grounded RAG** over Supabase.

- **Default answers:** extractive (quotes real retrieved passages — no tiny LLM hallucinations)
- **Optional:** set `GEMINI_API_KEY` for Gemini Flash Lite generation + embeddings (0 MB local weights)
- **Retrieval:** keyword search on `document_chunks` first, then vector match

## Env vars

| Key | Required | Notes |
|-----|----------|-------|
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role |
| `GEMINI_API_KEY` | optional | Improves fluency; get free key at https://aistudio.google.com/apikey |
| `PORT` | no | Default `8100` |

## Health

`GET /api/health` → OCR + RAG engine status.
