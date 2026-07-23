#!/bin/bash
set -euo pipefail

EMBED_MODEL="${EMBED_MODEL:-nomic-embed-text}"
CHAT_MODEL="${CHAT_MODEL:-extractive}"
USE_LLM_GENERATE="${USE_LLM_GENERATE:-false}"

echo "═══════════════════════════════════════════"
echo " NCEC Backend — Ollama + FastAPI"
echo " Embed: ${EMBED_MODEL}"
echo " Chat:  ${CHAT_MODEL} (USE_LLM_GENERATE=${USE_LLM_GENERATE})"
echo "═══════════════════════════════════════════"

# Bind address for the daemon only (do NOT export this into the Python process)
ollama_bind="0.0.0.0:11434"
# Client URL used by rag.py / FastAPI
export OLLAMA_HOST="http://127.0.0.1:11434"

OLLAMA_HOST="$ollama_bind" ollama serve >/tmp/ollama.log 2>&1 &
OLLAMA_PID=$!
echo "→ Ollama PID ${OLLAMA_PID} (bind ${ollama_bind})"

wait_for_ollama() {
  local i=0
  while [ "$i" -lt 90 ]; do
    if curl -sf "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
      echo "→ Ollama is ready"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "✗ Ollama failed to start. Last log lines:"
  tail -n 50 /tmp/ollama.log || true
  return 1
}

wait_for_ollama

ensure_model() {
  local model="$1"
  if ollama list 2>/dev/null | awk 'NR>1 {print $1}' | grep -F "$model"; then
    echo "→ Model weights ready: $model"
  else
    echo "→ Pulling model weights: $model ..."
    ollama pull "$model"
    echo "→ Pulled: $model"
  fi
}

ensure_model "$EMBED_MODEL"

# Only pull a chat model when explicitly enabled (needs more RAM than Starter)
if [ "$USE_LLM_GENERATE" = "true" ] || [ "$USE_LLM_GENERATE" = "1" ] || [ "$USE_LLM_GENERATE" = "yes" ]; then
  if [ "$CHAT_MODEL" != "extractive" ] && [ -n "$CHAT_MODEL" ]; then
    ensure_model "$CHAT_MODEL"
  fi
fi

echo "→ Models available:"
ollama list || true

echo "→ Starting FastAPI on PORT=${PORT:-8100}"
exec python main.py
