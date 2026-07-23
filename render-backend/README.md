# NCEC AI Platform — Render Backend (OCR + Gemini RAG)

**PaddleOCR** + **Gemini API** (`gemini-2.0-flash-lite`, `text-embedding-004`) + **Supabase pgvector**.

No local LLM weights are stored on Render (**0 MB**). Gemini runs in Google’s cloud — fits Starter plan easily.

---

## Required environment variables

| Key | Value |
|-----|--------|
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `CHAT_MODEL` | `gemini-2.0-flash-lite` (default) |
| `EMBED_MODEL` | `text-embedding-004` (768-d, matches schema) |
| `PORT` | `8100` |

---

## Verify

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expect `"llm.api_key_configured": true` and `"llm.local_weights_mb": 0`.

---

## Re-index note

Documents uploaded before Gemini embeddings should be **re-uploaded in Knowledge Base** so chunks use `text-embedding-004` (same 768 dimensions as the DB schema).
