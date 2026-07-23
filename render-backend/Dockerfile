# NCEC OCR + RAG backend — Gemini API (0 MB local LLM weights)
FROM python:3.10-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV CHAT_MODEL=gemini-2.0-flash-lite
ENV EMBED_MODEL=text-embedding-004
ENV PORT=8100

EXPOSE 8100

CMD ["python", "main.py"]
