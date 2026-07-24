#!/bin/bash
set -euo pipefail

echo "NCEC Backend — PaddleOCR + Groq Llama"

# Force open-weight Llama on Groq (ignore stale dashboard model names)
export CHAT_MODEL="llama-3.3-70b-versatile"
PORT="${PORT:-8100}"

python - <<'PY' || true
try:
    from llm_engine import engine_status
    print("llm:", engine_status())
except Exception as e:
    print("llm status warning:", e)
PY

echo "Starting uvicorn on 0.0.0.0:${PORT}"
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT}"
