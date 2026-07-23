#!/bin/bash
set -euo pipefail

echo "═══════════════════════════════════════════"
echo " NCEC Backend — PaddleOCR + Vicuna-68M"
echo " Open-weight GGUF ~40 MB (no Ollama)"
echo "═══════════════════════════════════════════"

export MODEL_DIR="${MODEL_DIR:-/app/models}"
export CHAT_MODEL="${CHAT_MODEL:-vicuna-68m}"

# Ensure weights exist (no-op if already baked into image)
python - <<'PY'
from llm_engine import ensure_gguf, engine_status
try:
    ensure_gguf()
    print("→", engine_status())
except Exception as e:
    print("→ Model prepare warning:", e)
PY

echo "→ Starting FastAPI on PORT=${PORT:-8100}"
exec python main.py
