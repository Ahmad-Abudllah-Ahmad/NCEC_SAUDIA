#!/bin/bash
set -euo pipefail

echo "═══════════════════════════════════════════"
echo " NCEC Backend — PaddleOCR + grounded RAG"
echo " Extractive answers (optional Gemini API)"
echo "═══════════════════════════════════════════"

echo "→ Starting FastAPI on PORT=${PORT:-8100}"
exec python main.py
