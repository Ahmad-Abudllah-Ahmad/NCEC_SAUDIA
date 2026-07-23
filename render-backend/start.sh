#!/bin/bash
set -euo pipefail

echo "═══════════════════════════════════════════"
echo " NCEC Backend — PaddleOCR + Groq Llama"
echo " Model: ${CHAT_MODEL:-llama-3.1-8b-instant}"
echo "═══════════════════════════════════════════"

export CHAT_MODEL="${CHAT_MODEL:-llama-3.1-8b-instant}"

python - <<'PY'
from llm_engine import engine_status
print("→", engine_status())
PY

echo "→ Starting FastAPI on PORT=${PORT:-8100}"
exec python main.py
