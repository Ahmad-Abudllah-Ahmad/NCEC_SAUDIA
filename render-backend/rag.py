"""
Server-side RAG pipeline: Ollama embeddings + Supabase pgvector + Ollama generation.
Uses model weights served by the in-container Ollama daemon (see start.sh).
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

# Chat LLMs OOM on Render Starter — embeddings-only Ollama + extractive answers by default.
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
CHAT_MODEL = os.getenv("CHAT_MODEL", "extractive")
USE_LLM_GENERATE = os.getenv("USE_LLM_GENERATE", "false").lower() in ("1", "true", "yes")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class RAGError(Exception):
    pass


def _http_json(url: str, payload: Optional[dict] = None, timeout: int = 120, method: str = "POST") -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def wait_for_ollama(retries: int = 8, delay: float = 1.5) -> None:
    last_err: Optional[Exception] = None
    for _ in range(retries):
        try:
            _http_json(f"{OLLAMA_HOST}/api/tags", payload=None, timeout=5, method="GET")
            return
        except Exception as e:
            last_err = e
            time.sleep(delay)
    raise RAGError(
        f"Ollama is not ready at {OLLAMA_HOST}. "
        f"Ensure the container start.sh launched `ollama serve` and pulled {EMBED_MODEL} / {CHAT_MODEL}. "
        f"Last error: {last_err}"
    )


def ollama_embed(text: str) -> list[float]:
    wait_for_ollama()
    try:
        res = _http_json(
            f"{OLLAMA_HOST}/api/embeddings",
            {"model": EMBED_MODEL, "prompt": text},
            timeout=90,
        )
        embedding = res.get("embedding")
        if not embedding or not isinstance(embedding, list):
            raise RAGError(f"Ollama returned no embedding (model={EMBED_MODEL})")
        return embedding
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RAGError(f"Embedding failed ({EMBED_MODEL}): {body}") from e
    except urllib.error.URLError as e:
        raise RAGError(
            f"Cannot reach Ollama at {OLLAMA_HOST} for embeddings. "
            f"Model weights must be available: ollama pull {EMBED_MODEL}. Error: {e}"
        ) from e


def ollama_generate(prompt: str, system: str, model: str = CHAT_MODEL) -> str:
    wait_for_ollama()
    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_ctx": 2048,
            "num_predict": 512,
        },
    }
    try:
        res = _http_json(f"{OLLAMA_HOST}/api/generate", payload, timeout=240)
        text = (res.get("response") or "").strip()
        if not text:
            raise RAGError("Ollama returned an empty response")
        return text
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RAGError(f"Generation failed ({model}): {body}") from e
    except urllib.error.URLError as e:
        raise RAGError(
            f"Cannot reach Ollama at {OLLAMA_HOST} for generation. "
            f"Pull model weights: ollama pull {model}. Error: {e}"
        ) from e


def supabase_rpc(fn: str, params: dict) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RAGError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the Render backend "
            "(Dashboard → Environment). Without them, vector retrieval cannot run."
        )

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

    tokens = re.findall(r"[\u0600-\u06FF]{2,}|[a-zA-Z]{3,}", query)
    if not tokens:
        return []

    search_term = tokens[0]
    try:
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


def synthesize_extractive(question: str, chunks: list[dict], mode: str) -> str:
    """Build an answer from retrieved chunks without loading a chat LLM (avoids OOM)."""
    is_ar = bool(re.search(r"[\u0600-\u06FF]", question))
    if mode == "legal":
        heading = "## الملخص القانوني" if is_ar else "## Executive Legal Summary"
        sub = "## المواد / البنود ذات الصلة" if is_ar else "## Applicable Excerpts"
    else:
        heading = "## ملخص من قاعدة المعرفة" if is_ar else "## Answer from Knowledge Base"
        sub = "## المقاطع المسترجعة" if is_ar else "## Retrieved Passages"

    intro = (
        "تمت الإجابة من قاعدة المعرفة (بحث دلالي). المقاطع التالية هي الأكثر صلة بسؤالك:"
        if is_ar
        else "Answered from the knowledge base (semantic search). The passages below are most relevant to your question:"
    )
    parts = [heading, "", intro, "", sub]
    for i, c in enumerate(chunks[:4], 1):
        name = c.get("document_name", "Document")
        text = clean_chunk(c.get("chunk_text", ""))[:1200]
        sim = float(c.get("similarity") or 0)
        parts.append(f"\n### {i}. {name} ({sim:.0%} match)\n\n{text}")
    return "\n".join(parts).strip()


def ollama_status() -> dict:
    """Diagnostic payload for /api/health."""
    try:
        tags = _http_json(f"{OLLAMA_HOST}/api/tags", payload=None, timeout=5, method="GET")
        models = [m.get("name", "") for m in tags.get("models", [])]
        embed_ready = any(EMBED_MODEL in m for m in models)
        chat_ready = (not USE_LLM_GENERATE) or any(CHAT_MODEL in m for m in models)
        return {
            "reachable": True,
            "host": OLLAMA_HOST,
            "models": models,
            "embed_model": EMBED_MODEL,
            "chat_model": CHAT_MODEL,
            "use_llm_generate": USE_LLM_GENERATE,
            "embed_ready": embed_ready,
            "chat_ready": chat_ready,
        }
    except Exception as e:
        return {
            "reachable": False,
            "host": OLLAMA_HOST,
            "error": str(e),
            "embed_model": EMBED_MODEL,
            "chat_model": CHAT_MODEL,
            "use_llm_generate": USE_LLM_GENERATE,
        }


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

    if not chunks or (chunks and chunks[0].get("similarity", 0) < 0.25):
        kw = keyword_search(question, limit=3)
        if kw:
            seen = {c.get("document_name") for c in chunks}
            for k in kw:
                if k["document_name"] not in seen:
                    chunks.append(k)

    engine = "extractive+nomic-embed" if not USE_LLM_GENERATE else CHAT_MODEL

    if not chunks:
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": engine}

    if USE_LLM_GENERATE:
        context = "\n\n---\n\n".join(
            f"Document: {c.get('document_name', 'Unknown')}\nSimilarity: {c.get('similarity', 0):.2f}\nText: {clean_chunk(c.get('chunk_text', ''))}"
            for c in chunks
        )
        system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
        full_system = f"{system}\n\nContext Documents:\n{context}"
        answer = ollama_generate(f"User Question:\n{question}", full_system)
    else:
        answer = synthesize_extractive(question, chunks, mode)

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
        "engine": engine,
    }
