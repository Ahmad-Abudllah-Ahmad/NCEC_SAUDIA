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
    
    # 1. Exact Article & Clause matches
    for m in re.finditer(
        r"(?:Article|المادة)\s*\(?\s*\d+\s*\)?",
        query,
        flags=re.I,
    ):
        terms.append(m.group(0).strip())

    art_nums = re.findall(r"(?:Article|المادة)\s*\(?\s*(\d+)\s*\)?", query, flags=re.I)
    for n in art_nums[:3]:
        terms.extend([
            f"Article ({n})",
            f"Article {n}",
            f"المادة ({n})",
            f"المادة {n}",
            f"Role of Persons",
        ])

    # 2. Key Domain Concepts (Bilingual)
    domain_map = [
        (r"\b(eia|eiar)\b", ["EIA", "EIAR", "Environmental Impact Assessment", "تقييم الأثر البيئي", "دراسة تقييم الأثر البيئي"]),
        (r"\bcat(?:egory)?\s*1\b|\bالفئة\s+الأولى\b", ["Category 1", "الفئة الأولى", "High environmental impact", "الأثر البيئي المرتفع"]),
        (r"\bcat(?:egory)?\s*2\b|\bالفئة\s+الثانية\b", ["Category 2", "الفئة الثانية", "Medium environmental impact", "الأثر البيئي المتوسط"]),
        (r"\bsoil\b|\bتربة\b", ["Soil Pollution", "تلوث التربة", "Remediation of Soil", "حماية التربة"]),
        (r"\bair\b|\bهواء\b|\bانبعاث\b|\bemiss", ["Air Quality", "جودة الهواء", "Emission", "انبعاثات", "Fugitive Organic Matter"]),
        (r"\bnoise\b|\bضوضاء\b", ["Noise", "ضوضاء", "Noise Level", "مستويات الضوضاء"]),
        (r"\bcoastal\b|\bmarine\b|\bساحل\b|\bبحر\b", ["Coastal", "Marine", "بيئة ساحلية", "البيئة البحرية"]),
        (r"\bpermit\b|\blicense\b|\bتصريح\b|\bترخيص\b", ["Permit", "License", "تصريح بيئي", "ترخيص"]),
        (r"\bpenalt\w*|\bfine\w*|\bviolat\w*|\bغرام\w*|\bعقوب\w*|\bمخالف\w*", ["Penalty", "Fine", "Violation", "غرامة", "عقوبة", "مخالفة", "جدول المخالفات"]),
    ]
    for pattern, syns in domain_map:
        if re.search(pattern, query, flags=re.I):
            terms.extend(syns)

    # 3. Bigrams / Multi-word phrases from query
    words = significant_tokens(query)
    for i in range(len(words) - 1):
        phrase = f"{words[i]} {words[i+1]}"
        if len(phrase) >= 6:
            terms.append(phrase)

    # 4. Significant single tokens
    for t in words:
        if len(t) >= 3:
            terms.append(t)

    seen: set[str] = set()
    out: list[str] = []
    for t in terms:
        k = t.lower()
        if k not in seen:
            seen.add(k)
            out.append(t)
    return out[:15]


def _ilike_path(table_select: str, column: str, term: str, limit: int) -> str:
    """Build a PostgREST path with a proven ilike.*term* filter."""
    safe = re.sub(r'[,"\\]', " ", term).strip()
    if not safe:
        safe = term.strip()
    pattern = urllib.parse.quote(f"*{safe}*", safe="")
    return f"{table_select}&{column}=ilike.{pattern}&limit={limit}"


def keyword_search(query: str, limit: int = 15) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    terms = _search_terms(query)
    for extra in re.findall(r"\b(Soil|Pollution|Article|Air|Marine|Coastal|EIA|المادة|تربة|تصريح|عقوبة|مخالفة)\b", query, flags=re.I):
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
        key = f"{name}::{text[:120]}"
        if key in seen:
            return
        seen.add(key)
        overlap = lexical_overlap(query, f"{name}\n{text}")
        results.append(
            {
                "document_name": name or "Unknown",
                "chunk_text": text[:3500],
                "similarity": base_sim + overlap * 0.4,
                "lexical": overlap,
                "source": "keyword",
            }
        )

    for search_term in terms:
        if len(results) >= limit * 4:
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
                _add(name or "Unknown", row.get("chunk_text") or "", 0.75)
        except Exception as e:
            print(f"chunk keyword warning ({search_term}): {e}")

        # 2) document name
        try:
            path = _ilike_path(
                "documents?select=name,content",
                "name",
                search_term,
                5,
            )
            for row in _supabase_get(path):
                name = row.get("name", "Unknown")
                content = row.get("content") or ""
                _add(name, best_article_snippet(content, query, search_term), 0.8)
        except Exception as e:
            print(f"name keyword warning ({search_term}): {e}")

        # 3) document content
        try:
            path = _ilike_path(
                "documents?select=name,content",
                "content",
                search_term,
                5,
            )
            for row in _supabase_get(path):
                name = row.get("name", "Unknown")
                content = row.get("content") or ""
                _add(name, best_article_snippet(content, query, search_term), 0.7)
        except Exception as e:
            print(f"doc keyword warning ({search_term}): {e}")

    results.sort(key=lambda c: (c.get("lexical", 0), c.get("similarity", 0)), reverse=True)
    return results[:limit]


DOCUMENT_SYSTEM = """You are the Senior Executive AI Document Specialist for the Saudi National Center for Environmental Compliance (NCEC).

Your primary mission is to deliver comprehensive, highly professional, accurate, and deeply structured analysis based strictly on official document context from the NCEC knowledge base.

MANDATORY EXECUTIVE RESPONSE STRUCTURE:
1. 📋 **Executive Summary / الموجز التنفيذي**: Direct, authoritative summary addressing the user's inquiry.
2. ⚖️ **Detailed Technical & Regulatory Analysis / التحليل الفني والنظامي المفصل**: In-depth breakdown of all relevant articles, sections, requirements, operational standards, definitions, and technical parameters found in the context.
3. 📌 **Operational & Compliance Requirements / الإجراءات والاشتراطات التنفيذية**: Exhaustive bulleted or numbered breakdown of obligations, mandatory timeframes (e.g. 30/60 days), fine structures (SAR amounts), inspection protocols, or approval procedures.
4. 📚 **Official Source Citations / المراجع واللوائح الرسمية**: Precise document names, Article numbers, and table references from the context.

STRICT GROUNDING & QUALITY RULES (non-negotiable):
1. Use ONLY the provided Context Documents below. Do NOT hallucinate, infer outside facts, or use general memory.
2. Unpack EVERY single detail, threshold, number, penalty, timeline, and condition present in the retrieved sources. Do NOT give brief vague summaries when detailed data is available.
3. If the context lacks sufficient information, clearly state: "The available indexed documents do not contain sufficient data to address this specific query."
4. Maintain a highly professional, authoritative executive tone suitable for senior regulators and environmental compliance officers.
5. Respond in the exact language of the user's inquiry (Arabic or English) with precise technical/legal terminology.
6. Use clean, rich Markdown layout (headers, bold key terms, tables, callout blocks where helpful)."""


LEGAL_SYSTEM = """You are the Senior Executive AI Legal & Policy Counsel for the Saudi National Center for Environmental Compliance (NCEC).

Your primary mission is to provide authoritative, in-depth, precise, and professionally structured legal analyses of NCEC environmental regulations, executive decrees, and policy frameworks.

MANDATORY LEGAL RESPONSE STRUCTURE:
1. 📋 **Executive Legal Summary / الموجز النظامي التنفيذي**: Clear, authoritative summary of the legal position and applicable framework.
2. ⚖️ **Detailed Statutory & Clause Analysis / التحليل النظامي والمادي المفصل**: Exhaustive clause-by-clause analysis of all applicable Articles, legal definitions, scope of application, rights, and regulatory restrictions.
3. 📌 **Penalties, Compliance Obligations & Procedures / العقوبات والالتزام والإجراءات**: Detailed breakdown of statutory penalties (SAR amounts, escalation degrees, suspension rights), corrective timelines, and mandatory compliance procedures.
4. 📚 **Statutory Citations / الاستناد النظامي والمراجع**: Explicit listing of regulation titles, Article numbers, and executive table clauses.

STRICT GROUNDING & QUALITY RULES (non-negotiable):
1. Rely EXCLUSIVELY on the Context Documents provided below from the NCEC knowledge base.
2. Do NOT invent legal interpretations, introduce outside laws, or speculate beyond the provided text.
3. Provide maximum depth — detail every fine, percentage, timeline, warning level, and article condition.
4. Maintain a formal, high-level legal tone appropriate for government legal advisors and compliance inspectors.
5. Respond in the exact language of the prompt (Arabic or English) using official regulatory terminology (e.g. النظام البيئي, اللائحة التنفيذية, المركز الوطني للرقابة على الالتزام البيئي).
6. Format with clean, structured Markdown (bold text, numbered lists, bullet points, headers)."""


def merge_and_rank(question: str, keyword_chunks: list[dict], vector_chunks: list[dict], limit: int = 15) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()

    ordered = list(keyword_chunks) + list(vector_chunks)

    for c in ordered:
        text = clean_chunk(c.get("chunk_text", ""))
        name = c.get("document_name", "Unknown")
        if is_toc_noise(text):
            continue
        key = f"{name}::{text[:120]}"
        if key in seen:
            continue
        seen.add(key)
        overlap = float(c.get("lexical") or lexical_overlap(question, f"{name}\n{text}"))
        
        merged.append(
            {
                "document_name": name,
                "chunk_text": text[:3500],
                "similarity": float(c.get("similarity") or 0),
                "lexical": overlap,
                "source": c.get("source") or "vector",
            }
        )

    article_hits = re.findall(r"(?:Article|المادة)\s*\(?\s*\d+\s*\)?", question, flags=re.I)
    wants_soil = bool(re.search(r"soil|تربة", question, flags=re.I))
    wants_air = bool(re.search(r"air|هواء|انبعاث|emiss", question, flags=re.I))
    wants_eia = bool(re.search(r"eia|eiar|أثر بيئي|تقييم", question, flags=re.I))

    def score(c: dict) -> float:
        text = c.get("chunk_text") or ""
        name = c.get("document_name") or ""
        blob = f"{name}\n{text}".lower()
        s = float(c.get("similarity") or 0) * 0.5 + float(c.get("lexical") or 0) * 2.0
        if c.get("source") == "keyword":
            s += 0.3
        if wants_soil and ("soil" in blob or "تربة" in blob):
            s += 0.6
        if wants_air and ("air" in blob or "هواء" in blob or "emission" in blob or "انبعاث" in blob):
            s += 0.6
        if wants_eia and ("eia" in blob or " impact" in blob or "الأثر البيئي" in blob):
            s += 0.6
        for a in article_hits:
            nums = re.findall(r"\d+", a)
            if not nums:
                continue
            if re.search(rf"(?:article|المادة)\s*\(?\s*{re.escape(nums[0])}\s*\)?", text, re.I):
                s += 1.2
        return s

    merged.sort(key=score, reverse=True)
    return merged[:limit]


def run_rag_chat(
    question: str,
    mode: str = "document",
    match_threshold: float = 0.0,
    match_count: int = 15,
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
            "The available indexed documents in the NCEC knowledge base do not contain sufficient information to answer this query."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة بقاعدة معرفة المركز الوطني للرقابة على الالتزام البيئي للإجابة على هذا الاستفسار."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL_LABEL}

    context_parts = []
    for i, c in enumerate(chunks[:12], start=1):
        text = c.get("chunk_text", "")[:3500]
        if len(text) < 30:
            continue
        context_parts.append(
            f"[Source {i}] Document: {c.get('document_name', 'Unknown')}\nContent:\n{text}"
        )
    context = "\n\n" + ("=" * 40) + "\n\n".join(context_parts)

    if not context.strip():
        no_info = (
            "The available indexed documents in the NCEC knowledge base do not contain sufficient information to answer this query."
            if not re.search(r"[\u0600-\u06FF]", question)
            else "لا تتوفر معلومات كافية في الوثائق المتاحة بقاعدة معرفة المركز الوطني للرقابة على الالتزام البيئي للإجابة على هذا الاستفسار."
        )
        return {"answer": no_info, "citations": [], "chunks_used": 0, "engine": CHAT_MODEL_LABEL}

    system = LEGAL_SYSTEM if mode == "legal" else DOCUMENT_SYSTEM
    prompt = (
        f"Context Documents from NCEC Vector Knowledge Base:\n{context}\n\n"
        f"User Inquiry:\n{question}\n\n"
        "Execution Instructions:\n"
        "- Provide an in-depth, highly professional executive answer following the mandatory response structure.\n"
        "- Base your analysis STRICTLY and ONLY on the provided Context Documents.\n"
        "- Extract and detail every relevant Article number, clause, numerical threshold, SAR fine amount, timeline, and procedural condition.\n"
        "- Synthesize insights across all relevant sources provided.\n"
        "- Maintain an authoritative, formal tone suitable for government legal and technical officers."
    )

    answer = generate_text(prompt, system, max_tokens=4096)
    answer = clean_chunk(answer)
    answer = re.sub(r"(\[Page\s*\d+\]\s*)+", "", answer, flags=re.I).strip()

    citations = [
        {
            "document_name": c.get("document_name", "Unknown"),
            "chunk_text": (c.get("chunk_text") or "")[:800],
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
                for c in chunks[:8]
            ],
        },
        "engine": CHAT_MODEL_LABEL,
        "model_info": engine_status(),
    }

