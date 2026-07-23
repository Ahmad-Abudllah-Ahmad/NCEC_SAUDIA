"""
Server-side RAG: Gemini API (0 MB local weights) + Supabase pgvector.
Chat: gemini-2.0-flash-lite  |  Embed: text-embedding-004 (768-d, matches pgvector)
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
CHAT_MODEL = os.getenv("CHAT_MODEL", "gemini-2.0-flash-lite")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-004")
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"


class RAGError(Exception):
    pass


def _require_gemini_key() -> str:
    if not GEMINI_API_KEY:
        raise RAGError(
            "GEMINI_API_KEY must be set on the Render backend "
            "(Dashboard → Environment). Get a free key at https://aistudio.google.com/apikey"
        )
    return GEMINI_API_KEY


def _gemini_json(path: str, payload: dict, timeout: int = 90) -> dict:
    key = _require_gemini_key()
    url = f"{GEMINI_BASE}/{path}?key={urllib.parse.quote(key)}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RAGError(f"Gemini API error ({e.code}): {body[:500]}") from e
    except urllib.error.URLError as e:
        raise RAGError(f"Cannot reach Gemini API: {e}") from e


def gemini_embed(text: str) -> list[float]:
    """768-dimensional embedding via text-embedding-004 (matches document_chunks schema)."""
    clipped = (text or "")[:8000]
    res = _gemini_json(
        f"models/{EMBED_MODEL}:embedContent",
        {
            "model": f"models/{EMBED_MODEL}",
            "content": {"parts": [{"text": clipped}]},
            "taskType": "RETRIEVAL_QUERY",
        },
        timeout=60,
    )
    values = (res.get("embedding") or {}).get("values")
    if not values or not isinstance(values, list):
        raise RAGError(f"Gemini returned no embedding (model={EMBED_MODEL})")
    return values


def gemini_generate(prompt: str, system: str, model: str = CHAT_MODEL) -> str:
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
        },
    }
    res = _gemini_json(f"models/{model}:generateContent", payload, timeout=90)
    candidates = res.get("candidates") or []
    if not candidates:
        raise RAGError("Gemini returned no candidates")
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RAGError("Gemini returned an empty response")
    return text


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


def llm_status() -> dict:
    return {
        "provider": "gemini",
        "api_key_configured": bool(GEMINI_API_KEY),
        "chat_model": CHAT_MODEL,
        "embed_model": EMBED_MODEL,
        "local_weights_mb": 0,
        "reachable": bool(GEMINI_API_KEY),
    }


# Back-compat alias used by main.py health endpoint
def ollama_status() -> dict:
    return llm_status()


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.15,
    match_count: int = 5,
) -> dict:
    embedding = gemini_embed(question)

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

    if not chunks:
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL}

    context = "\n\n---\n\n".join(
        f"Document: {c.get('document_name', 'Unknown')}\nSimilarity: {c.get('similarity', 0):.2f}\nText: {clean_chunk(c.get('chunk_text', ''))}"
        for c in chunks
    )

    system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
    answer = gemini_generate(
        prompt=f"Context Documents:\n{context}\n\nUser Question:\n{question}",
        system=system,
    )

    citations = [
        {
            "document_name": c.get("document_name", "Unknown"),
            "chunk_text": clean_chunk(c.get("chunk_text", "")),
            "similarity": c.get("similarity", 0),
        }
        for c in chunks[:3]
    ]

    return {
        "answer": answer,
        "citations": citations,
        "chunks_used": len(chunks),
        "engine": CHAT_MODEL,
    }
