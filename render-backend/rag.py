"""
Server-side RAG: hybrid retrieval (pgvector + keyword) + Groq Llama generation.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

from llm_engine import CHAT_MODEL_LABEL, clean_ocr_noise, embed_text, engine_status, generate_text

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


def _search_terms(query: str) -> list[str]:
    terms: list[str] = []
    # Prefer article / regulation phrases for legal docs
    for m in re.finditer(
        r"(Article\s*\(?\s*\d+\s*\)?|المادة\s*\(?\s*\d+\s*\)?|Soil Pollution|تلوث التربة)",
        query,
        flags=re.I,
    ):
        terms.append(m.group(0).strip())
    tokens = re.findall(r"[\u0600-\u06FF]{2,}|[a-zA-Z]{3,}", query)
    # Drop ultra-generic words
    stop = {"the", "and", "for", "about", "this", "that", "with", "from", "tell", "more", "what"}
    for t in tokens:
        if t.lower() in stop:
            continue
        if t not in terms:
            terms.append(t)
    return terms[:8]


def keyword_search(query: str, limit: int = 6) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    terms = _search_terms(query)
    if not terms:
        return []

    results: list[dict] = []
    seen: set[str] = set()

    def _add(name: str, text: str, sim: float = 0.6):
        key = f"{name}::{text[:80]}"
        if key in seen or not text.strip():
            return
        seen.add(key)
        results.append(
            {
                "document_name": name or "Unknown",
                "chunk_text": text[:2500],
                "similarity": sim,
            }
        )

    for search_term in terms:
        if len(results) >= limit:
            break
        q = urllib.parse.quote(f"*{search_term}*")
        # Prefer chunk-level hits (better for Article N questions)
        endpoints = [
            (
                f"{SUPABASE_URL}/rest/v1/document_chunks"
                f"?select=chunk_text,documents(name)"
                f"&chunk_text=ilike.{q}"
                f"&limit={limit}",
                "chunk",
            ),
            (
                f"{SUPABASE_URL}/rest/v1/documents"
                f"?select=name,content"
                f"&content=ilike.{q}"
                f"&limit={limit}",
                "doc",
            ),
        ]
        for url, kind in endpoints:
            try:
                req = urllib.request.Request(
                    url,
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                    },
                    method="GET",
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    rows = json.loads(resp.read().decode("utf-8"))
                for row in rows or []:
                    if kind == "chunk":
                        docs = row.get("documents") or {}
                        name = docs.get("name") if isinstance(docs, dict) else "Unknown"
                        _add(name or "Unknown", row.get("chunk_text") or "", 0.72)
                    else:
                        _add(row.get("name", "Unknown"), (row.get("content") or "")[:2500], 0.55)
            except Exception:
                continue

    return results[:limit]


def clean_chunk(text: str) -> str:
    return clean_ocr_noise(text)


DOCUMENT_SYSTEM = """You are a professional environmental AI assistant for the Saudi National Center for Environmental Compliance (NCEC).

CRITICAL RULES:
1. Answer ONLY using the Context Documents. Do NOT invent facts.
2. If the context does not contain the answer, say you do not have enough information.
3. Respond in the same language as the user's question (Arabic or English).
4. Be specific: quote Article/clause numbers and the actual obligations from the text.
5. Do NOT repeat page footers, "Page X of Y", or citation markers like [Page N].
6. Write a clear, structured answer in Markdown. No gibberish or looping text."""

LEGAL_SYSTEM = """You are a specialized Executive AI Legal & Policy Assistant for NCEC staff.

CRITICAL RULES:
1. Answer ONLY using the Context Documents. Do NOT hallucinate law.
2. Use Markdown headings and bullet points for duties/obligations.
3. Quote Article numbers and operative language from the context.
4. If the answer is not in the context, say so clearly.
5. Respond in the same language as the user's question.
6. Never output page footers or repeating "Page X of Y" noise."""


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.0,
    match_count: int = 6,
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

    # Keyword / phrase search is critical for Article-number queries
    kw = keyword_search(question, limit=match_count)
    if kw:
        seen_keys = {
            f"{c.get('document_name')}::{(c.get('chunk_text') or '')[:60]}" for c in chunks
        }
        for k in kw:
            key = f"{k['document_name']}::{(k.get('chunk_text') or '')[:60]}"
            if key not in seen_keys:
                chunks.append(k)
                seen_keys.add(key)

    # Rank: prefer chunks that mention article terms from the question
    article_hits = re.findall(r"(?:Article|المادة)\s*\(?\s*\d+\s*\)?", question, flags=re.I)
    if article_hits:
        def score(c: dict) -> float:
            text = (c.get("chunk_text") or "").lower()
            bonus = 0.0
            for a in article_hits:
                if a.lower().replace(" ", "") in text.replace(" ", "").lower() or any(
                    tok in text for tok in re.findall(r"\d+", a)
                ):
                    # stronger if "article" + number nearby
                    if re.search(rf"(?:article|المادة)\s*\(?\s*{re.escape(re.findall(r'\d+', a)[0])}\s*\)?", text, re.I):
                        bonus += 0.5
                    else:
                        bonus += 0.15
            return float(c.get("similarity") or 0) + bonus

        chunks = sorted(chunks, key=score, reverse=True)

    if not chunks:
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL_LABEL}

    # Clean context aggressively so the model does not echo OCR footers
    context_parts = []
    for c in chunks[:5]:
        text = clean_chunk(c.get("chunk_text", ""))
        if len(text) < 40:
            continue
        context_parts.append(
            f"Document: {c.get('document_name', 'Unknown')}\nText:\n{text[:1800]}"
        )
    context = "\n\n---\n\n".join(context_parts)

    if not context.strip():
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL_LABEL}

    system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
    prompt = (
        f"Context Documents:\n{context}\n\n"
        f"User Question:\n{question}\n\n"
        "Write a precise answer using only the context above. "
        "Cite Article numbers when present. Do not repeat page markers."
    )

    answer = generate_text(prompt, system)
    # Strip any residual footer spam the model might echo
    answer = clean_chunk(answer)
    answer = re.sub(r"(\[Page\s*\d+\]\s*)+", "", answer, flags=re.I).strip()

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
