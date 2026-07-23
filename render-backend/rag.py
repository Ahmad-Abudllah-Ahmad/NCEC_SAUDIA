"""
Server-side RAG pipeline: Ollama embeddings + Supabase pgvector retrieval + Ollama generation.
Uses locally pulled Ollama model weights (nomic-embed-text, llama3.2:1b by default).
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
CHAT_MODEL = os.getenv("CHAT_MODEL", "llama3.2:1b")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class RAGError(Exception):
    pass


def _http_json(url: str, payload: dict, timeout: int = 120) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def ollama_embed(text: str) -> list[float]:
    try:
        res = _http_json(
            f"{OLLAMA_HOST}/api/embeddings",
            {"model": EMBED_MODEL, "prompt": text},
            timeout=60,
        )
        embedding = res.get("embedding")
        if not embedding or not isinstance(embedding, list):
            raise RAGError(f"Ollama returned no embedding (model={EMBED_MODEL})")
        return embedding
    except urllib.error.URLError as e:
        raise RAGError(
            f"Cannot reach Ollama at {OLLAMA_HOST}. Pull models: ollama pull {EMBED_MODEL} && ollama pull {CHAT_MODEL}. Error: {e}"
        ) from e


def ollama_generate(prompt: str, system: str, model: str = CHAT_MODEL) -> str:
    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": False,
    }
    try:
        res = _http_json(f"{OLLAMA_HOST}/api/generate", payload, timeout=180)
        text = (res.get("response") or "").strip()
        if not text:
            raise RAGError("Ollama returned an empty response")
        return text
    except urllib.error.URLError as e:
        raise RAGError(f"Cannot reach Ollama at {OLLAMA_HOST}: {e}") from e


def supabase_rpc(fn: str, params: dict) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RAGError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the backend")

    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn}"
    data = json.dumps(params).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result if isinstance(result, list) else []
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RAGError(f"Supabase RPC {fn} failed ({e.code}): {body}") from e


def keyword_search(query: str, limit: int = 5) -> list[dict]:
    """Fallback: full-text keyword match when vector similarity is weak."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    # Extract meaningful tokens (Arabic + Latin words, min 3 chars)
    tokens = re.findall(r"[\u0600-\u06FF]{2,}|[a-zA-Z]{3,}", query)
    if not tokens:
        return []

    search_term = tokens[0]
    url = (
        f"{SUPABASE_URL}/rest/v1/documents"
        f"?select=name,content"
        f"&content=ilike.*{urllib.parse.quote(search_term)}*"
        f"&limit={limit}"
    )
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            docs = json.loads(resp.read().decode("utf-8"))
            return [
                {
                    "document_name": d.get("name", "Unknown"),
                    "chunk_text": (d.get("content") or "")[:2000],
                    "similarity": 0.5,
                }
                for d in docs
            ]
    except Exception:
        return []


def clean_chunk(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\[Page \d+\] \d+ of \d+", "", text, flags=re.I)
    cleaned = re.sub(r"Page \d+ of \d+", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


DOCUMENT_SYSTEM = """You are a professional environmental AI assistant for the Saudi National Center for Environmental Compliance (NCEC).
CRITICAL RULES:
1. Answer ONLY using the Context Documents below. Do NOT use outside knowledge.
2. If the answer is not in the context, say: "I do not have enough information in the provided documents to answer this question."
3. Respond in the same language as the user's question (Arabic or English).
4. Quote specific clauses/articles from the context when possible."""

LEGAL_SYSTEM = """You are a specialized Executive AI Legal & Policy Assistant for NCEC staff.
CRITICAL RULES:
1. Answer ONLY using the Context Documents from the vector database below. Do NOT hallucinate.
2. Format in Markdown with headings (## Executive Legal Summary, ## Applicable Articles).
3. If the answer is not in the context, say: "I do not have legal or policy information in the database to answer this request."
4. Respond in the same language as the user's question."""


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.15,
    match_count: int = 5,
) -> dict:
    embedding = ollama_embed(question)

    chunks = supabase_rpc(
        "match_document_chunks",
        {
            "query_embedding": embedding,
            "match_threshold": match_threshold,
            "match_count": match_count,
        },
    )

    # Keyword fallback when vector search returns nothing or weak results
    if not chunks or (chunks and chunks[0].get("similarity", 0) < 0.25):
        kw = keyword_search(question, limit=3)
        if kw:
            seen = {c.get("document_name") for c in chunks}
            for k in kw:
                if k["document_name"] not in seen:
                    chunks.append(k)

    if not chunks:
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0}

    context = "\n\n---\n\n".join(
        f"Document: {c.get('document_name', 'Unknown')}\nSimilarity: {c.get('similarity', 0):.2f}\nText: {clean_chunk(c.get('chunk_text', ''))}"
        for c in chunks
    )

    system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
    full_system = f"{system}\n\nContext Documents:\n{context}"
    prompt = f"User Question:\n{question}"

    answer = ollama_generate(prompt, full_system)

    citations = []
    for c in chunks[:3]:
        citations.append(
            {
                "document_name": c.get("document_name", "Unknown"),
                "chunk_text": clean_chunk(c.get("chunk_text", "")),
                "similarity": c.get("similarity", 0),
            }
        )

    return {
        "answer": answer,
        "citations": citations,
        "chunks_used": len(chunks),
    }
