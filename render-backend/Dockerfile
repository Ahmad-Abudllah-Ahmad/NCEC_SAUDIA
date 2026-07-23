# NCEC OCR + RAG backend — embeddings-only Ollama (Render Starter RAM safe)
# Embed: nomic-embed-text (768-d). Chat LLM disabled by default (extractive RAG).
FROM python:3.10-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    zstd \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama (CPU) — requires zstd for archive extraction
RUN curl -fsSL https://ollama.com/install.sh | sh

# Pre-pull embed model only (chat models OOM on Starter ~512MB)
ENV OLLAMA_HOST=0.0.0.0:11434
ENV OLLAMA_MAX_LOADED_MODELS=1
RUN ollama serve >/tmp/ollama-build.log 2>&1 & \
    sleep 10 && \
    ollama pull nomic-embed-text && \
    pkill ollama || true && \
    sleep 2

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/start.sh

ENV OLLAMA_HOST=http://127.0.0.1:11434
ENV EMBED_MODEL=nomic-embed-text
ENV CHAT_MODEL=extractive
ENV USE_LLM_GENERATE=false
ENV OLLAMA_KEEP_ALIVE=30s
ENV OLLAMA_NUM_PARALLEL=1
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV PORT=8100

EXPOSE 8100

CMD ["/app/start.sh"]
