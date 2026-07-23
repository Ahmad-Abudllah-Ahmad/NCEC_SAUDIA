# NCEC backend — OCR + ultra-light open-weight LLM (no Ollama)
# Chat weights: Vicuna-68M Q3_K_S GGUF (~40 MB)
FROM python:3.10-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ca-certificates \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# CPU-only llama-cpp for tiny GGUF inference
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/start.sh \
    && mkdir -p /app/models

# Pre-download open-weight GGUF at build (~40 MB)
ENV MODEL_DIR=/app/models
ENV GGUF_NAME=vicuna-68m.Q3_K_S.gguf
ENV GGUF_URL=https://huggingface.co/Felladrin/gguf-vicuna-68m/resolve/main/vicuna-68m.Q3_K_S.gguf
ENV CHAT_MODEL=vicuna-68m
ENV PORT=8100

RUN python -c "from llm_engine import ensure_gguf; ensure_gguf()"

EXPOSE 8100
CMD ["/app/start.sh"]
