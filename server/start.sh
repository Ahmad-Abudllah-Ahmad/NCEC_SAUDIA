#!/bin/bash
# ──────────────────────────────────────────────────────
#  NCEC AI Platform — Start PaddleOCR Backend
# ──────────────────────────────────────────────────────
#  Usage:  bash server/start.sh
# ──────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  NCEC OCR Backend — PaddleOCR (Arabic)          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python3 is required. Install it and try again."
  exit 1
fi

# Auto-install dependencies if paddleocr is not found
python3 -c "import paddleocr" 2>/dev/null || {
  echo "📦 Installing PaddleOCR dependencies..."
  pip3 install -r requirements.txt
}

echo "🚀 Starting NCEC OCR server on http://localhost:8100"
echo ""

python3 main.py
