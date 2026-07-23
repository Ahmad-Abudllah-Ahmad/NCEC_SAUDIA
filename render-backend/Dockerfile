# NCEC backend — OCR + grounded RAG (no local LLM weights)
FROM python:3.10-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
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
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x /app/start.sh

ENV CHAT_MODEL=extractive
ENV PORT=8100

EXPOSE 8100
CMD ["/app/start.sh"]
