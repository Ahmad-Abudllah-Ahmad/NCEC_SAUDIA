FROM python:3.10-slim

# System libs for OpenCV / PyMuPDF / PaddleOCR + Ollama runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama (CPU) — model weights live under /root/.ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Pre-pull model weights into the image so Render boots ready (no first-request download)
ENV OLLAMA_HOST=0.0.0.0:11434
RUN ollama serve >/tmp/ollama-build.log 2>&1 & \
    sleep 5 && \
    ollama pull nomic-embed-text && \
    ollama pull llama3.2:1b && \
    pkill ollama || true && \
    sleep 2

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/start.sh

# Runtime defaults — in-container Ollama (no laptop tunnel required)
ENV OLLAMA_HOST=http://127.0.0.1:11434
ENV EMBED_MODEL=nomic-embed-text
ENV CHAT_MODEL=llama3.2:1b
ENV OLLAMA_KEEP_ALIVE=5m
ENV OLLAMA_NUM_PARALLEL=1
ENV OLLAMA_MAX_LOADED_MODELS=1
ENV PORT=8100

EXPOSE 8100

CMD ["/app/start.sh"]
