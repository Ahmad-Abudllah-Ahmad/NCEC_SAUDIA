"""
Server-side RAG — accurate answers without a tiny local LLM.

Retrieval: keyword search on document_chunks (primary) + optional vector match.
Answers: grounded extractive synthesis from retrieved text (no hallucination).
Optional: if GEMINI_API_KEY is set, use Gemini Flash Lite for embed + generate.
"""

from __future__ import annotations

import json
import math
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
CHAT_MODEL = os.getenv("CHAT_MODEL", "extractive-rag")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-004")
GEMINI_CHAT = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.0-flash-lite")
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"

# Stopwords — keep legal/domain terms
_STOP = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "about",
    "this", "that", "these", "those", "is", "are", "was", "were", "be", "been",
    "tell", "me", "more", "it", "please", "what", "which", "who", "how", "when",
    "from", "into", "than", "then", "also", "any", "all", "can", "could", "would",
    "regarding", "concerning",
}


class RAGError(Exception):
    pass


def engine_status() -> dict:
    return {
        "engine": "gemini" if GEMINI_API_KEY else "extractive-rag",
        "chat_model": GEMINI_CHAT if GEMINI_API_KEY else "extractive",
        "embed_model": EMBED_MODEL if GEMINI_API_KEY else "keyword+light-768",
        "gemini_configured": bool(GEMINI_API_KEY),
        "local_weights_mb": 0,
        "mode": "grounded-documents-only",
    }


def _supabase_headers() -> dict:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RAGError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set on the Render backend."
        )
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def supabase_rpc(fn: str, params: dict) -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/rpc/{fn}"
    data = json.dumps(params).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=_supabase_headers(), method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result if isinstance(result, list) else []
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RAGError(f"Supabase RPC {fn} failed ({e.code}): {body}") from e


def clean_chunk(text: str) -> str:
    if not text:
        return ""
    cleaned = text
    # Strip OCR page footers / running headers that tiny models loop on
    cleaned = re.sub(r"\[Page\s*\d+\]\s*\d+\s*of\s*\d+", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\bPage\s*\d+\s*of\s*\d+\b", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\b\d+\s+of\s+\d+\b", " ", cleaned)
    cleaned = re.sub(r"\*{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def extract_query_terms(question: str) -> list[str]:
    """Pull searchable phrases: Article (6), Soil Pollution, Arabic tokens, etc."""
    q = question or ""
    phrases: list[str] = []

    # Legal article patterns
    for m in re.finditer(
        r"(?:article|المادة|ماده)\s*[\(\[]?\s*(\d+)\s*[\)\]]?",
        q,
        flags=re.I,
    ):
        num = m.group(1)
        phrases.extend([f"Article ({num})", f"Article {num}", f"المادة ({num})", f"المادة {num}"])

    # Quoted phrases
    phrases.extend(re.findall(r'"([^"]{3,80})"|«([^»]{3,80})»', q))
    flat = []
    for p in phrases:
        if isinstance(p, tuple):
            flat.extend([x for x in p if x])
        elif p:
            flat.append(p)

    # Significant words (EN + AR)
    words = re.findall(r"[\u0600-\u06FF]{2,}|[A-Za-z][A-Za-z\-]{2,}", q)
    for w in words:
        if w.lower() not in _STOP and len(w) > 2:
            flat.append(w)

    # Dedupe preserve order
    seen: set[str] = set()
    out: list[str] = []
    for t in flat:
        key = t.lower().strip()
        if key and key not in seen:
            seen.add(key)
            out.append(t.strip())
    return out[:12]


def _score_chunk(text: str, terms: list[str]) -> float:
    low = (text or "").lower()
    if not low or not terms:
        return 0.0
    score = 0.0
    for t in terms:
        tl = t.lower()
        count = low.count(tl)
        if count:
            # Longer phrases weigh more
            score += count * (1.0 + min(len(t), 40) / 20.0)
    # Prefer chunks that look like real prose (not footer noise)
    footer_hits = len(re.findall(r"\d+\s+of\s+\d+", low))
    score -= footer_hits * 0.5
    return score


def keyword_search_chunks(question: str, limit: int = 8) -> list[dict]:
    """Search document_chunks by ilike — reliable regardless of embedding space."""
    terms = extract_query_terms(question)
    if not terms or not SUPABASE_URL:
        return []

    headers = _supabase_headers()
    # Prefer Prefer: return=representation not needed for GET
    headers.pop("Content-Type", None)

    collected: dict[str, dict] = {}

    for term in terms[:8]:
        try:
            # Join document name via foreign key embed
            url = (
                f"{SUPABASE_URL}/rest/v1/document_chunks"
                f"?select=id,chunk_text,document_id,documents(name)"
                f"&chunk_text=ilike.*{urllib.parse.quote(term)}*"
                f"&limit={limit}"
            )
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=25) as resp:
                rows = json.loads(resp.read().decode("utf-8"))
            for row in rows or []:
                cid = row.get("id") or row.get("chunk_text", "")[:40]
                text = row.get("chunk_text") or ""
                doc = row.get("documents") or {}
                name = doc.get("name") if isinstance(doc, dict) else "Unknown"
                score = _score_chunk(text, terms)
                prev = collected.get(cid)
                if not prev or score > prev["similarity"]:
                    collected[cid] = {
                        "document_name": name or "Unknown",
                        "chunk_text": text,
                        "similarity": min(0.95, 0.45 + score / 10.0),
                        "_score": score,
                    }
        except Exception as e:
            print(f"keyword chunk search warning ({term}): {e}")
            continue

    ranked = sorted(collected.values(), key=lambda x: x.get("_score", 0), reverse=True)
    for r in ranked:
        r.pop("_score", None)
    return ranked[:limit]


def light_embed(text: str, dims: int = 768) -> list[float]:
    text = (text or "").lower().strip()
    vec = [0.0] * dims
    if not text:
        return vec
    tokens = re.findall(r"[\u0600-\u06ff]{2,}|[a-z0-9]{2,}", text)
    if not tokens:
        tokens = list(text[:200])
    for i, tok in enumerate(tokens[:400]):
        h = 2166136261
        for ch in tok:
            h ^= ord(ch)
            h = (h * 16777619) & 0xFFFFFFFF
        idx = h % dims
        vec[idx] += 1.0 + (i % 7) * 0.01
        vec[(h // dims) % dims] += 0.5
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _gemini_json(path: str, payload: dict, timeout: int = 90) -> dict:
    if not GEMINI_API_KEY:
        raise RAGError("GEMINI_API_KEY not configured")
    url = f"{GEMINI_BASE}/{path}?key={urllib.parse.quote(GEMINI_API_KEY)}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RAGError(f"Gemini API error ({e.code}): {body[:500]}") from e


def gemini_embed(text: str) -> list[float]:
    res = _gemini_json(
        f"models/{EMBED_MODEL}:embedContent",
        {
            "model": f"models/{EMBED_MODEL}",
            "content": {"parts": [{"text": (text or "")[:8000]}]},
            "taskType": "RETRIEVAL_QUERY",
        },
        timeout=60,
    )
    values = (res.get("embedding") or {}).get("values")
    if not values:
        raise RAGError("Gemini returned no embedding")
    return values


def gemini_generate(prompt: str, system: str) -> str:
    res = _gemini_json(
        f"models/{GEMINI_CHAT}:generateContent",
        {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1024},
        },
        timeout=90,
    )
    candidates = res.get("candidates") or []
    if not candidates:
        raise RAGError("Gemini returned no candidates")
    parts = ((candidates[0].get("content") or {}).get("parts")) or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RAGError("Gemini returned empty response")
    return text


def pick_relevant_sentences(text: str, terms: list[str], max_chars: int = 900) -> str:
    cleaned = clean_chunk(text)
    if not cleaned:
        return ""
    # Split on sentence-ish boundaries
    parts = re.split(r"(?<=[\.\!\?\u061F\u06D4])\s+|\n+", cleaned)
    scored: list[tuple[float, str]] = []
    for p in parts:
        p = p.strip()
        if len(p) < 25:
            continue
        s = _score_chunk(p, terms)
        if s > 0:
            scored.append((s, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        # Fall back to first clean paragraph
        return cleaned[:max_chars]

    out: list[str] = []
    total = 0
    for _, sent in scored:
        if total + len(sent) > max_chars:
            break
        out.append(sent)
        total += len(sent)
    return " ".join(out) if out else cleaned[:max_chars]


def build_extractive_answer(question: str, chunks: list[dict], mode: str) -> str:
    is_ar = bool(re.search(r"[\u0600-\u06FF]", question))
    terms = extract_query_terms(question)
    sections: list[str] = []

    for c in chunks[:4]:
        raw = c.get("chunk_text") or ""
        excerpt = pick_relevant_sentences(raw, terms, max_chars=850)
        if not excerpt or len(excerpt) < 40:
            continue
        name = c.get("document_name") or "Document"
        sections.append(f"**Source: {name}**\n\n{excerpt}")

    if not sections:
        return (
            "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
            if is_ar
            else "I do not have enough information in the provided documents to answer this question."
        )

    body = "\n\n---\n\n".join(sections)
    if is_ar:
        title = "## إجابة مستندة إلى الوثائق" if mode != "legal" else "## ملخص قانوني تنفيذي"
        note = "_الإجابة مأخوذة حصراً من مقاطع الوثائق المسترجعة (بدون توليد حر)._"
    else:
        title = "## Answer from your documents" if mode != "legal" else "## Executive Legal Summary"
        note = "_Answer is taken only from retrieved document passages (no free-form generation)._"

    # Lead-in that reflects the question topic when article detected
    lead = ""
    art = re.search(r"(?:article|المادة)\s*[\(\[]?\s*(\d+)", question, flags=re.I)
    if art:
        n = art.group(1)
        lead = (
            f"Regarding **Article ({n})**, the knowledge base contains the following:\n\n"
            if not is_ar
            else f"بخصوص **المادة ({n})**، تتضمن قاعدة الوثائق ما يلي:\n\n"
        )

    return f"{title}\n\n{lead}{body}\n\n{note}"


DOCUMENT_SYSTEM = """You are a professional environmental AI assistant for NCEC (Saudi Arabia).
Answer ONLY using the Context Documents. Do NOT use outside knowledge.
If the answer is not in the context, say you do not have enough information.
Respond in the same language as the user. Quote articles/clauses when present."""

LEGAL_SYSTEM = """You are an Executive AI Legal & Policy Assistant for NCEC staff.
Answer ONLY from Context Documents. Format in Markdown with clear headings.
If missing from context, say so. Respond in the user's language."""


def merge_chunks(*lists: list[dict], limit: int = 8) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for lst in lists:
        for c in lst:
            key = f"{c.get('document_name')}|{(c.get('chunk_text') or '')[:80]}"
            if key in seen:
                continue
            seen.add(key)
            out.append(c)
            if len(out) >= limit:
                return out
    return out


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.0,
    match_count: int = 5,
) -> dict:
    # 1) Keyword search on chunks (accurate for Article 6 / soil pollution etc.)
    kw_chunks = keyword_search_chunks(question, limit=match_count + 3)

    # 2) Vector search (Gemini embeddings if key set, else light hash — best-effort)
    vec_chunks: list[dict] = []
    try:
        if GEMINI_API_KEY:
            embedding = gemini_embed(question)
        else:
            embedding = light_embed(question)
        vec_chunks = supabase_rpc(
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

    # Prefer keyword hits first (they match the user's wording)
    chunks = merge_chunks(kw_chunks, vec_chunks, limit=max(match_count, 6))

    if not chunks:
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {
            "answer": no_info,
            "citations": [],
            "chunks_used": 0,
            "engine": engine_status()["chat_model"],
            "model_info": engine_status(),
        }

    # 3) Generate: Gemini if configured, else grounded extractive
    if GEMINI_API_KEY:
        context = "\n\n---\n\n".join(
            f"Document: {c.get('document_name', 'Unknown')}\nText: {clean_chunk(c.get('chunk_text', ''))}"
            for c in chunks[:5]
        )
        system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
        try:
            answer = gemini_generate(
                prompt=f"Context Documents:\n{context}\n\nUser Question:\n{question}",
                system=system,
            )
            engine = GEMINI_CHAT
        except Exception as e:
            print(f"gemini generate fallback to extractive: {e}")
            answer = build_extractive_answer(question, chunks, mode)
            engine = "extractive"
    else:
        answer = build_extractive_answer(question, chunks, mode)
        engine = "extractive"

    citations = [
        {
            "document_name": c.get("document_name", "Unknown"),
            "chunk_text": clean_chunk(c.get("chunk_text", ""))[:600],
            "similarity": c.get("similarity", 0),
        }
        for c in chunks[:3]
    ]

    return {
        "answer": answer,
        "citations": citations,
        "chunks_used": len(chunks),
        "engine": engine,
        "model_info": engine_status(),
    }


# Used by /api/llm/embeddings
def embed_text(text: str) -> list[float]:
    if GEMINI_API_KEY:
        try:
            return gemini_embed(text)
        except Exception as e:
            print(f"gemini embed fallback: {e}")
    return light_embed(text)


def generate_text(prompt: str, system: str = "") -> str:
    """Used by /api/llm/generate — prefer Gemini, else extractive from prompt."""
    if GEMINI_API_KEY:
        try:
            return gemini_generate(prompt, system or DOCUMENT_SYSTEM)
        except Exception as e:
            print(f"generate_text gemini warning: {e}")
    # Extractive from whatever context is in the prompt
    return build_extractive_answer(
        question=prompt[-500:],
        chunks=[{"document_name": "Context", "chunk_text": prompt, "similarity": 0.5}],
        mode="document",
    )
