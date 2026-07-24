"""
Server-side RAG: hybrid retrieval + strictly grounded Groq Llama answers.

Rules for generation:
- Answer ONLY from retrieved vector/keyword context.
- LLM may clarify/organize/elaborate wording, but must NOT add or change facts.
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

STOPWORDS = {
    "the", "and", "for", "about", "this", "that", "with", "from", "tell", "more",
    "what", "must", "persons", "role", "regarding", "please", "give", "have",
    "does", "did", "how", "why", "when", "where", "which", "who", "are", "is",
    "was", "were", "been", "being", "into", "onto", "over", "under", "than",
    "then", "them", "they", "their", "there", "these", "those", "your", "you",
    "can", "could", "would", "should", "will", "shall", "may", "might", "also",
    "only", "just", "any", "all", "each", "every", "some", "such", "not",
}


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


def _supabase_get(path_query: str) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{path_query}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data if isinstance(data, list) else []


def significant_tokens(text: str) -> list[str]:
    tokens = re.findall(r"[\u0600-\u06FF]{2,}|[a-zA-Z0-9]{3,}", text or "")
    out: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        k = t.lower()
        if k in STOPWORDS or k in seen:
            continue
        seen.add(k)
        out.append(t)
    return out


def lexical_overlap(query: str, text: str) -> float:
    """Fraction of query tokens that appear in text (0..1)."""
    q = [t.lower() for t in significant_tokens(query)]
    if not q:
        return 0.0
    blob = (text or "").lower()
    hits = sum(1 for t in q if t in blob)
    return hits / len(q)


def is_toc_noise(text: str) -> bool:
    if not text:
        return True
    if text.count(".") > 40 and len(re.findall(r"\.{4,}", text)) >= 3:
        return True
    if len(re.findall(r"\d+\s+of\s+\d+", text, flags=re.I)) >= 4:
        return True
    return len(re.sub(r"[\W_\d]+", "", text)) < 40


def clean_chunk(text: str) -> str:
    return clean_ocr_noise(text or "")


def snippet_around(content: str, term: str, window: int = 1400) -> str:
    """Pull a window around the best match for term (prefer Article N hits)."""
    if not content:
        return ""
    lower = content.lower()
    term_l = (term or "").lower()
    idx = lower.find(term_l) if term_l else -1
    if idx < 0:
        return content[: window * 2]
    start = max(0, idx - window // 4)
    end = min(len(content), idx + window)
    return content[start:end]


def best_article_snippet(content: str, query: str, fallback_term: str = "") -> str:
    """Prefer a window around Article (N) from the question inside document content."""
    if not content:
        return ""
    nums = re.findall(r"(?:Article|المادة)\s*\(?\s*(\d+)\s*\)?", query, flags=re.I)
    for n in nums:
        patterns = [
            rf"Article\s*\(\s*{n}\s*\)",
            rf"Article\s+{n}\b",
            rf"المادة\s*\(\s*{n}\s*\)",
            rf"المادة\s+{n}\b",
        ]
        for pat in patterns:
            m = re.search(pat, content, flags=re.I)
            if m:
                start = max(0, m.start() - 80)
                end = min(len(content), m.start() + 1600)
                return content[start:end]
    if fallback_term:
        return snippet_around(content, fallback_term)
    return content[:2000]


def _search_terms(query: str) -> list[str]:
    terms: list[str] = []
    for m in re.finditer(
        r"(Article\s*\(?\s*\d+\s*\)?|المادة\s*\(?\s*\d+\s*\)?)",
        query,
        flags=re.I,
    ):
        terms.append(m.group(0).strip())

    art_nums = re.findall(r"(?:Article|المادة)\s*\(?\s*(\d+)\s*\)?", query, flags=re.I)
    for n in art_nums[:2]:
        terms.extend([
            f"Article ({n})",
            f"Article {n}",
            f"المادة ({n})",
            f"Role of Persons",  # common Article(6) soil heading fragment
        ])

    # Topic phrases
    for m in re.finditer(
        r"(Soil Pollution|تلوث التربة|Air Quality|جودة الهواء|"
        r"Environmental Law|Environmental Compliance|EIA|نطاق)",
        query,
        flags=re.I,
    ):
        terms.append(m.group(0).strip())

    for t in significant_tokens(query):
        if len(t) >= 4:
            terms.append(t)

    seen: set[str] = set()
    out: list[str] = []
    for t in terms:
        k = t.lower()
        if k not in seen:
            seen.add(k)
            out.append(t)
    return out[:10]


def _ilike_path(table_select: str, column: str, term: str, limit: int) -> str:
    """Build a PostgREST path with a proven ilike.*term* filter."""
    # Keep terms simple for PostgREST; strip chars that break filters
    safe = re.sub(r'[,"\\]', " ", term).strip()
    if not safe:
        safe = term.strip()
    pattern = urllib.parse.quote(f"*{safe}*", safe="")
    return f"{table_select}&{column}=ilike.{pattern}&limit={limit}"


def keyword_search(query: str, limit: int = 8) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    terms = _search_terms(query)
    # Always include short high-signal singles (Soil, Pollution, Article)
    for extra in re.findall(r"\b(Soil|Pollution|Article|Air|Marine|Coastal|المادة|تربة)\b", query, flags=re.I):
        if extra not in terms:
            terms.insert(0, extra)
    if not terms:
        return []

    results: list[dict] = []
    seen: set[str] = set()

    def _add(name: str, text: str, base_sim: float):
        text = clean_chunk(text)
        if is_toc_noise(text):
            return
        key = f"{name}::{text[:90]}"
        if key in seen:
            return
        seen.add(key)
        overlap = lexical_overlap(query, f"{name}\n{text}")
        results.append(
            {
                "document_name": name or "Unknown",
                "chunk_text": text[:2500],
                "similarity": base_sim + overlap * 0.35,
                "lexical": overlap,
                "source": "keyword",
            }
        )

    for search_term in terms:
        if len(results) >= limit * 3:
            break
        # 1) chunk text
        try:
            path = _ilike_path(
                "document_chunks?select=chunk_text,documents(name)",
                "chunk_text",
                search_term,
                limit,
            )
            for row in _supabase_get(path):
                docs = row.get("documents") or {}
                name = docs.get("name") if isinstance(docs, dict) else "Unknown"
                _add(name or "Unknown", row.get("chunk_text") or "", 0.7)
        except Exception as e:
            print(f"chunk keyword warning ({search_term}): {e}")

        # 2) document name (helps when content OCR is messy)
        try:
            path = _ilike_path(
                "documents?select=name,content",
                "name",
                search_term,
                4,
            )
            for row in _supabase_get(path):
                name = row.get("name", "Unknown")
                content = row.get("content") or ""
                _add(name, best_article_snippet(content, query, search_term), 0.75)
        except Exception as e:
            print(f"name keyword warning ({search_term}): {e}")

        # 3) document content
        try:
            path = _ilike_path(
                "documents?select=name,content",
                "content",
                search_term,
                4,
            )
            for row in _supabase_get(path):
                name = row.get("name", "Unknown")
                content = row.get("content") or ""
                _add(name, best_article_snippet(content, query, search_term), 0.65)
        except Exception as e:
            print(f"doc keyword warning ({search_term}): {e}")

    results.sort(key=lambda c: (c.get("lexical", 0), c.get("similarity", 0)), reverse=True)
    return results[:limit]


DOCUMENT_SYSTEM = """You are the NCEC AI Document Assistant — an expert system for the Saudi National Center for Environmental Compliance (NCEC).

Your role is to help staff find and understand information from their uploaded documents (environmental regulations, executive regulations, guidelines, circulars, reports, EIA studies, etc.).

STRICT GROUNDING RULES (non-negotiable):
1. Answer ONLY from the Context Documents provided below. They come from the organization's vector knowledge base.
2. You MAY clarify, rephrase, organize, summarize, and elaborate for readability — but every fact, number, obligation, definition, and article reference MUST come from the context.
3. Do NOT invent, assume, update, or "correct" the source text. Do NOT use outside knowledge or general legal knowledge.
4. If the context is missing the answer, say clearly: "The available documents do not contain enough information to answer this question."
5. Prefer quoting or closely paraphrasing operative clauses. Always cite Article/clause numbers and document names when present.
6. Ignore OCR noise such as "[Page 2] 3 of 30" and table-of-contents dotted lines.
7. Respond in the same language as the user's question (Arabic or English).
8. Structure the answer in clear Markdown with headings, bullet points, and numbered lists.
9. Be thorough and comprehensive — include ALL relevant information found across ALL provided source documents.
10. If multiple documents contain relevant information, synthesize and present information from all of them."""

LEGAL_SYSTEM = """You are the NCEC AI Legal & Policy Assistant — a specialized legal expert system for NCEC staff.

Your role is to provide accurate legal and regulatory guidance by analyzing the organization's environmental laws, executive regulations, and policy documents.

STRICT GROUNDING RULES (non-negotiable):
1. Answer ONLY from the Context Documents provided below. They come from the organization's vector knowledge base.
2. You MAY elaborate, interpret, and organize legal text for clarity, but you must NOT change legal meaning, add rules not in the context, or speculate on legal outcomes.
3. Always quote Article numbers, clause numbers, and regulation names when present.
4. If the context does not support an answer, say: "The available legal documents do not contain enough information to answer this question."
5. Ignore page footers, OCR noise, and TOC dotted lines.
6. Respond in the same language as the user's question (Arabic or English).
7. Structure answers with Markdown headings, bullet points, and numbered lists for clarity.
8. When discussing penalties or obligations, quote the exact text and reference the specific article.
9. Be thorough — present ALL relevant legal provisions found across ALL provided source documents.
10. If different regulations address the same topic, compare and cross-reference them."""


def merge_and_rank(question: str, keyword_chunks: list[dict], vector_chunks: list[dict], limit: int = 10) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()

    # Prefer keyword hits first — hash embeddings are weak / often mismatched
    ordered = list(keyword_chunks) + list(vector_chunks)

    for c in ordered:
        text = clean_chunk(c.get("chunk_text", ""))
        name = c.get("document_name", "Unknown")
        if is_toc_noise(text):
            continue
        key = f"{name}::{text[:90]}"
        if key in seen:
            continue
        seen.add(key)
        overlap = float(c.get("lexical") or lexical_overlap(question, f"{name}\n{text}"))
        # Keep vector hits if they have any lexical relevance (relaxed thresholds)
        if c.get("source") == "vector" and keyword_chunks and overlap < 0.05:
            continue
        if c.get("source") == "vector" and not keyword_chunks and overlap < 0.03:
            continue
        merged.append(
            {
                "document_name": name,
                "chunk_text": text[:2500],
                "similarity": float(c.get("similarity") or 0),
                "lexical": overlap,
                "source": c.get("source") or "vector",
            }
        )

    article_hits = re.findall(r"(?:Article|المادة)\s*\(?\s*\d+\s*\)?", question, flags=re.I)
    wants_soil = bool(re.search(r"soil|تربة", question, flags=re.I))
    wants_air = bool(re.search(r"air quality|جودة الهواء|fugitive", question, flags=re.I))

    def score(c: dict) -> float:
        text = c.get("chunk_text") or ""
        name = c.get("document_name") or ""
        blob = f"{name}\n{text}".lower()
        s = float(c.get("similarity") or 0) + float(c.get("lexical") or 0) * 1.5
        if c.get("source") == "keyword":
            s += 0.25
        if wants_soil and ("soil" in blob or "تربة" in blob or "prevention and remediation of soil" in blob):
            s += 0.6
        if wants_soil and ("air quality" in blob or "marine" in blob) and "soil" not in blob:
            s -= 0.55
        if wants_air and "air" in blob:
            s += 0.3
        for a in article_hits:
            nums = re.findall(r"\d+", a)
            if not nums:
                continue
            if re.search(rf"(?:article|المادة)\s*\(?\s*{re.escape(nums[0])}\s*\)?", text, re.I):
                s += 0.6
        return s

    merged.sort(key=score, reverse=True)
    strong = [c for c in merged if c.get("lexical", 0) >= 0.1 or score(c) >= 0.6]
    return (strong or merged)[:limit]


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.0,
    match_count: int = 12,
) -> dict:
    question = (question or "").strip()
    embedding = embed_text(question)

    kw = keyword_search(question, limit=match_count)

    vector_chunks: list[dict] = []
    try:
        raw_vec = supabase_rpc(
            "match_document_chunks",
            {
                "query_embedding": embedding,
                "match_threshold": match_threshold,
                "match_count": match_count,
            },
        )
        for c in raw_vec:
            text = c.get("chunk_text") or ""
            name = c.get("document_name") or "Unknown"
            vector_chunks.append(
                {
                    "document_name": name,
                    "chunk_text": text,
                    "similarity": float(c.get("similarity") or 0),
                    "lexical": lexical_overlap(question, f"{name}\n{text}"),
                    "source": "vector",
                }
            )
    except RAGError:
        raise
    except Exception as e:
        print(f"vector search warning: {e}")

    chunks = merge_and_rank(question, kw, vector_chunks, limit=match_count)

    if not chunks:
        no_info = (
            "I do not have enough information in the provided documents to answer this question."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL_LABEL}

    context_parts = []
    for i, c in enumerate(chunks[:8], start=1):
        text = c.get("chunk_text", "")[:3000]
        if len(text) < 40:
            continue
        context_parts.append(
            f"[Source {i}] Document: {c.get('document_name', 'Unknown')}\n{text}"
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
        f"Context Documents (vector knowledge base excerpts):\n{context}\n\n"
        f"User Question:\n{question}\n\n"
        "Instructions:\n"
        "- Answer the user's question thoroughly and comprehensively using ONLY the context above.\n"
        "- Include ALL relevant information from ALL source documents provided.\n"
        "- You may elaborate, organize, and structure clearly, but do not add facts that are not in the context.\n"
        "- Always cite the specific document name, Article number, and clause number when present.\n"
        "- If the question asks about a specific topic, gather and present information from every source that mentions it.\n"
        "- Use Markdown formatting (headings, bullet points, numbered lists) to structure the answer clearly.\n"
        "- If the context does not contain the answer, say you do not have enough information.\n"
        "- Do NOT refuse to answer if the context contains relevant information — always provide what you can."
    )

    answer = generate_text(prompt, system, max_tokens=2048)
    answer = clean_chunk(answer)
    answer = re.sub(r"(\[Page\s*\d+\]\s*)+", "", answer, flags=re.I).strip()

    citations = [
        {
            "document_name": c.get("document_name", "Unknown"),
            "chunk_text": (c.get("chunk_text") or "")[:600],
            "similarity": c.get("similarity", 0),
            "lexical": c.get("lexical", 0),
            "source": c.get("source"),
        }
        for c in chunks[:3]
    ]

    return {
        "answer": answer,
        "citations": citations,
        "chunks_used": len(chunks),
        "retrieval": {
            "keyword_hits": len(kw),
            "vector_hits": len(vector_chunks),
            "used": [
                {
                    "document_name": c.get("document_name"),
                    "lexical": round(float(c.get("lexical") or 0), 3),
                    "source": c.get("source"),
                }
                for c in chunks[:5]
            ],
        },
        "engine": CHAT_MODEL_LABEL,
        "model_info": engine_status(),
    }
