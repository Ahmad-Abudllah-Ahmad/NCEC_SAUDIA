# NCEC OCR + RAG backend — lightweight Ollama for Render
# Chat: qwen2:0.5b (~352MB)  |  Embed: nomic-embed-text (768-d, matches pgvector)
FROM python:3.10-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama (CPU)
RUN curl -fsSL https://ollama.com/install.sh | sh

# Pre-pull lightweight model weights (fits Render Starter/Standard RAM)
ENV OLLAMA_HOST=0.0.0.0:11434
ENV OLLAMA_MAX_LOADED_MODELS=1
RUN ollama serve >/tmp/ollama-build.log 2>&1 & \
    sleep 8 && \
    ollama pull nomic-embed-text && \
    ollama pull qwen2:0.5b && \
    pkill ollama || true && \
    sleep 2

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/start.sh

ENV OLLAMA_HOST=http://127.0.0.1:11434
ENV EMBED_MODEL=nomic-embed-text
ENV CHAT_MODEL=qwen2:0.5b
ENV OLLAMA_KEEP_ALIVE=30s
ENV OLLAMA_NUM_PARALLEL=1
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV PORT=8100

EXPOSE 8100

CMD ["/app/start.sh"]
