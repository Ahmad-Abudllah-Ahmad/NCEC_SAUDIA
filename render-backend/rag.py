"""
Server-side RAG: light embeddings + Supabase retrieval + tiny open-weight LLM (Vicuna-68M).
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from llm_engine import CHAT_MODEL_LABEL, embed_text, engine_status, generate_text

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class RAGError(Exception):
    pass


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

    results: list[dict] = []
    seen: set[str] = set()
    for search_term in tokens[:4]:
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
                for d in docs:
                    name = d.get("name", "Unknown")
                    if name in seen:
                        continue
                    seen.add(name)
                    results.append(
                        {
                            "document_name": name,
                            "chunk_text": (d.get("content") or "")[:2000],
                            "similarity": 0.55,
                        }
                    )
        except Exception:
            continue
        if len(results) >= limit:
            break
    return results[:limit]


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
2. If the answer is not in the context, say you do not have enough information.
3. Respond in the same language as the user's question (Arabic or English).
4. Quote specific clauses/articles from the context when possible."""

LEGAL_SYSTEM = """You are a specialized Executive AI Legal & Policy Assistant for NCEC staff.
CRITICAL RULES:
1. Answer ONLY using the Context Documents below. Do NOT hallucinate.
2. Format in Markdown with headings.
3. If the answer is not in the context, say you do not have legal information in the database.
4. Respond in the same language as the user's question."""


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.0,
    match_count: int = 5,
) -> dict:
    embedding = embed_text(question)

    chunks: list[dict] = []
    try:
        chunks = supabase_rpc(
            "match_document_chunks",
            {
                "query_embedding": embedding,
                "match_threshold": match_threshold,
                "match_count": match_count,
            },
        )
    except RAGError:
        raise
    except Exception as e:
        print(f"vector search warning: {e}")

    # Always enrich with keyword hits (reliable on light embeddings)
    kw = keyword_search(question, limit=match_count)
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
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL_LABEL}

    context = "\n\n---\n\n".join(
        f"Document: {c.get('document_name', 'Unknown')}\nSimilarity: {c.get('similarity', 0):.2f}\nText: {clean_chunk(c.get('chunk_text', ''))}"
        for c in chunks[:5]
    )

    system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
    prompt = f"Context Documents:\n{context}\n\nUser Question:\n{question}\n\nAnswer:"

    answer = generate_text(prompt, system)

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
        "engine": CHAT_MODEL_LABEL,
        "model_info": engine_status(),
    }
