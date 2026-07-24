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
    "هي", "ما", "من", "في", "على", "إلى", "عن", "هل", "أو", "ان", "أن",
}

# Arabic / colloquial → English search anchors for English-titled PDFs in the KB
AR_EN_TOPIC_MAP = [
    (r"تلوث\s*التربة|منع.*التربة|معالجة\s*التربة", ["Soil Pollution", "Prevention and Remediation of Soil", "Soil"]),
    (r"جودة\s*الهواء|تلوث\s*الهواء|انبعاث", ["Air Quality", "Fugitive", "Ambient Air"]),
    (r"بحر|ساحل|ساحلية|البيئة\s*البحرية", ["Marine", "Coastal", "Sustainable Management of the Marine"]),
    (r"تأهيل|مواقع\s*متدهورة|إعادة\s*التأهيل", ["Rehabilitation", "Degraded Sites", "Remediation of Polluted"]),
    (r"أوزون|مركبات\s*فلور", ["Ozone", "Hydrofluorocarbons"]),
    (r"أوساط\s*مائية|مياه", ["Aqueous Media", "Water"]),
    (r"ضوضاء|ضجيج", ["Noise"]),
    (r"تفتيش|تدقيق", ["Inspection", "Audit"]),
    (r"تصاريح|تراخيص|مقابل\s*مالي", ["Controls and Procedures", "Financial Due", "License"]),
    (r"المادة", ["Article"]),
]

OOD_PATTERNS = [
    r"\b(python|javascript|java|code|function|sort a list|algorithm|capital of|who won|weather|recipe)\b",
    r"اكتب\s*(كود|دالة|برنامج)",
    r"عاصمة\s+",
]


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
    """Prefer a wide window around Article (N) or topic headings for deeper answers."""
    if not content:
        return ""
    lower = content.lower()
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
                start = max(0, m.start() - 120)
                end = min(len(content), m.start() + 2400)
                return content[start:end]

    for heading in (
        "Article (6) – Role of Persons regarding Soil",
        "Emissions of Fugitive Organic Matter",
        "Ambient Air Quality Standards",
        "Violations Apprehension and Penalties",
        "Scope of Application",
        "Sustainable Management of the Marine",
        "License for Marine Wildlife",
        "License for Planting Mangroves",
        "Financial Due",
        "Review of the Rehabilitation Plans",
    ):
        idx = lower.find(heading.lower())
        if idx >= 0:
            # Use heading if query shares a strong token with it, or Arabic soil/air/marine mapped
            h_tokens = set(significant_tokens(heading))
            q_tokens = set(significant_tokens(query))
            mapped = expand_bilingual_terms(query)
            if h_tokens & q_tokens or any(m.lower() in heading.lower() for m in mapped):
                start = max(0, idx - 80)
                end = min(len(content), idx + 2200)
                return content[start:end]

    if fallback_term:
        snip = snippet_around(content, fallback_term, window=2000)
        if len(snip) > 200:
            return snip
    return content[:2800]


def expand_bilingual_terms(query: str) -> list[str]:
    """Map Arabic / topic cues to English PDF title fragments stored in Supabase."""
    extra: list[str] = []
    for pat, en_terms in AR_EN_TOPIC_MAP:
        if re.search(pat, query, flags=re.I):
            extra.extend(en_terms)
    # English topic cues → document-name anchors
    if re.search(r"\bsoil\b", query, re.I):
        extra.extend(["Soil Pollution", "Prevention and Remediation of Soil"])
    if re.search(r"\bair quality\b|\bfugitive\b|\bambient\b", query, re.I):
        extra.extend(["Air Quality", "Fugitive Organic"])
    if re.search(r"\bmarine\b|\bcoastal\b|\bmangrove\b|\bmooring\b", query, re.I):
        extra.extend(["Marine and Coastal", "Sustainable Management of the Marine", "Mooring", "Mangrove"])
    if re.search(r"\brehabilitat|\bdegraded site|\bpolluted site", query, re.I):
        extra.extend(["Environmental Rehabilitation", "Degraded Sites"])
    if re.search(r"\blicen[cs]e|\bpermit|\bfinancial due|\bfee\b", query, re.I):
        extra.extend(["Controls and Procedures", "Financial Due"])
    return extra


def is_out_of_domain(query: str) -> bool:
    return any(re.search(p, query, flags=re.I) for p in OOD_PATTERNS)


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
            "Role of Persons",
        ])

    for m in re.finditer(
        r"(Soil Pollution|تلوث التربة|Air Quality|جودة الهواء|"
        r"Marine|Coastal|Mangrove|Mooring|Financial Due|"
        r"Environmental Law|Environmental Compliance|EIA|نطاق|"
        r"Rehabilitation|Degraded)",
        query,
        flags=re.I,
    ):
        terms.append(m.group(0).strip())

    terms.extend(expand_bilingual_terms(query))

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
    return out[:14]


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
    # Always include short high-signal singles
    for extra in re.findall(
        r"\b(Soil|Pollution|Article|Air|Marine|Coastal|Mangrove|Mooring|المادة|تربة|الهواء|بحر)\b",
        query,
        flags=re.I,
    ):
        if extra not in terms:
            terms.insert(0, extra)
    for t in expand_bilingual_terms(query):
        if t not in terms:
            terms.insert(0, t)
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


DOCUMENT_SYSTEM = """You are the NCEC Executive Document Intelligence Assistant for the Saudi National Center for Environmental Compliance.

MISSION: Produce professional, in-depth briefings from the organization's vector knowledge base for NCEC staff.

STRICT GROUNDING (non-negotiable):
1. Use ONLY the Context Documents below. Every fact, figure, obligation, definition, fee, and article citation must appear in that context.
2. You MAY elaborate, clarify, and professionally reorganize the material for executive readability — but you must NOT invent, update, or import outside knowledge.
3. If the context is insufficient, state that clearly and stop. Do NOT fill gaps with general knowledge, code, world facts, or speculation.
4. Ignore OCR page markers and table-of-contents dotted leaders.

PROFESSIONAL ANSWER STANDARD:
1. Open with a one-sentence executive summary.
2. Then provide structured depth: headings, numbered obligations/clauses, and bullet lists where useful.
3. Quote or closely paraphrase operative language; always cite Document name + Article/clause when available.
4. Cover ALL relevant sources in the context — synthesize without contradiction; if sources differ, note both.
5. Where fees, limits, timelines, or penalties appear, present them precisely (amounts, units, conditions).
6. Close with a short "Sources used" list of document names referenced.
7. Match the user's language (Arabic or English).
8. Tone: formal, precise, suitable for regulatory staff — not casual, not marketing."""

LEGAL_SYSTEM = """You are the NCEC Executive Legal & Policy Assistant for internal NCEC staff.

MISSION: Deliver accurate, in-depth legal briefings grounded solely in uploaded laws, executive regulations, and policy documents.

STRICT GROUNDING (non-negotiable):
1. Answer ONLY from Context Documents. Do not invent articles, penalties, or procedures.
2. You MAY elaborate and organize for clarity; you must NOT change legal meaning.
3. If unsupported by context, say the legal documents do not contain enough information — then stop.
4. Never answer coding, general trivia, or non-regulatory requests from outside knowledge.

PROFESSIONAL LEGAL FORMAT:
1. Executive summary (1–2 sentences).
2. Applicable instrument(s) and scope.
3. Operative provisions (Articles/clauses) with precise obligations, prohibitions, fees, or penalties.
4. Cross-references if multiple regulations in context address the same point.
5. Sources used (document names).
6. Same language as the user. Formal regulatory tone."""


def merge_and_rank(question: str, keyword_chunks: list[dict], vector_chunks: list[dict], limit: int = 10) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()
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
        # Also score overlap against bilingual expanded English anchors
        expanded_q = " ".join(expand_bilingual_terms(question) + [question])
        overlap = max(overlap, lexical_overlap(expanded_q, f"{name}\n{text}"))
        if c.get("source") == "vector" and keyword_chunks and overlap < 0.05:
            continue
        if c.get("source") == "vector" and not keyword_chunks and overlap < 0.03:
            continue
        merged.append(
            {
                "document_name": name,
                "chunk_text": text[:3200],
                "similarity": float(c.get("similarity") or 0),
                "lexical": overlap,
                "source": c.get("source") or "vector",
            }
        )

    article_hits = re.findall(r"(?:Article|المادة)\s*\(?\s*\d+\s*\)?", question, flags=re.I)
    wants_soil = bool(re.search(r"soil|تربة", question, flags=re.I))
    wants_air = bool(re.search(r"air quality|جودة الهواء|fugitive|انبعاث", question, flags=re.I))
    wants_marine = bool(re.search(r"marine|coastal|mangrove|mooring|بحر|ساحل", question, flags=re.I))
    wants_fees = bool(re.search(r"fee|financial due|license|permit|مقابل|ترخيص|تصريح", question, flags=re.I))

    def score(c: dict) -> float:
        text = c.get("chunk_text") or ""
        name = c.get("document_name") or ""
        blob = f"{name}\n{text}".lower()
        s = float(c.get("similarity") or 0) + float(c.get("lexical") or 0) * 1.6
        if c.get("source") == "keyword":
            s += 0.3
        if wants_soil and ("soil" in blob or "تربة" in blob or "prevention and remediation of soil" in blob):
            s += 0.7
        if wants_soil and ("air quality" in blob or "marine" in blob) and "soil" not in blob:
            s -= 0.6
        if wants_air and ("air quality" in blob or "fugitive" in blob or "ambient" in blob):
            s += 0.55
        if wants_marine and ("marine" in blob or "coastal" in blob or "mangrove" in blob or "mooring" in blob):
            s += 0.7
        if wants_fees and ("financial due" in blob or "saudi riyals" in blob or "license" in blob):
            s += 0.45
        for a in article_hits:
            nums = re.findall(r"\d+", a)
            if not nums:
                continue
            if re.search(rf"(?:article|المادة)\s*\(?\s*{re.escape(nums[0])}\s*\)?", text, re.I):
                s += 0.65
        return s

    merged.sort(key=score, reverse=True)
    strong = [c for c in merged if c.get("lexical", 0) >= 0.08 or score(c) >= 0.55]
    return (strong or merged)[:limit]


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.0,
    match_count: int = 12,
) -> dict:
    question = (question or "").strip()

    if is_out_of_domain(question):
        no_info = (
            "This assistant answers only from NCEC document knowledge base content "
            "(environmental regulations, guidelines, and related records). "
            "The question is outside that scope, so no document-based answer can be provided."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "هذا المساعد يجيب فقط من وثائق قاعدة معرفة المركز الوطني للرقابة على الالتزام البيئي. "
            "السؤال خارج نطاق الوثائق المتاحة، لذا لا يمكن تقديم إجابة مستندة إلى قاعدة الوثائق."
        )
        return {
            "answer": no_info,
            "citations": [],
            "chunks_used": 0,
            "engine": CHAT_MODEL_LABEL,
            "model_info": engine_status(),
            "retrieval": {"keyword_hits": 0, "vector_hits": 0, "used": [], "ood": True},
        }

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
            expanded_q = " ".join(expand_bilingual_terms(question) + [question])
            vector_chunks.append(
                {
                    "document_name": name,
                    "chunk_text": text,
                    "similarity": float(c.get("similarity") or 0),
                    "lexical": max(
                        lexical_overlap(question, f"{name}\n{text}"),
                        lexical_overlap(expanded_q, f"{name}\n{text}"),
                    ),
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
        text = c.get("chunk_text", "")[:3200]
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
        "Produce a professional, in-depth answer for NCEC staff.\n"
        "Requirements:\n"
        "1) Executive summary first.\n"
        "2) Detailed body with Articles/clauses, obligations, fees, penalties, and conditions found in the context.\n"
        "3) Cite document names and Article numbers.\n"
        "4) Use only the context — no outside knowledge, no code, no world trivia.\n"
        "5) If context is incomplete, say what is missing after presenting what is available.\n"
        "6) End with a short Sources used list.\n"
        "7) Match the user's language."
    )

    answer = generate_text(prompt, system, max_tokens=2500)
    answer = clean_chunk(answer)
    answer = re.sub(r"(\[Page\s*\d+\]\s*)+", "", answer, flags=re.I).strip()

    citations = [
        {
            "document_name": c.get("document_name", "Unknown"),
            "chunk_text": (c.get("chunk_text") or "")[:700],
            "similarity": c.get("similarity", 0),
            "lexical": c.get("lexical", 0),
            "source": c.get("source"),
        }
        for c in chunks[:4]
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
                for c in chunks[:6]
            ],
        },
        "engine": CHAT_MODEL_LABEL,
        "model_info": engine_status(),
    }
