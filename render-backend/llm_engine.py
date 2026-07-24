"""
Chat LLM via Groq (open-weight Llama) + light local embeddings.

Default model: llama-3.1-8b-instant — fast, open-weight, accurate enough for RAG.
No local GGUF / Ollama required on Render.
"""

from __future__ import annotations

import json
import math
import os
import re
import urllib.error
import urllib.request
from typing import Optional

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_BASE = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
# Lightweight open-weight Llama on Groq (ignore stale/non-Groq CHAT_MODEL values)
_ALLOWED_GROQ = {
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama3-8b-8192",
    "llama3-70b-8192",
}
_raw_model = os.getenv("CHAT_MODEL", "llama-3.1-8b-instant").strip()
CHAT_MODEL_LABEL = _raw_model if _raw_model in _ALLOWED_GROQ else "llama-3.1-8b-instant"

_last_error: Optional[str] = None


def _groq_chat(messages: list[dict], max_tokens: int = 1024) -> str:
    global _last_error
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set on the Render backend. "
            "Add it under Dashboard → Environment."
        )

    payload = {
        "model": CHAT_MODEL_LABEL,
        "messages": messages,
        "temperature": 0.15,
        "top_p": 0.9,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        f"{GROQ_BASE}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "ncec-ocr-backend/2.1 (+https://github.com/Ahmad-Abudllah-Ahmad/NCEC_SAUDIA)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        _last_error = None
        choice = (data.get("choices") or [{}])[0]
        msg = choice.get("message") or {}
        text = (msg.get("content") or "").strip()
        if not text:
            raise RuntimeError("Groq returned an empty response")
        return text
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        _last_error = f"Groq HTTP {e.code}: {body[:400]}"
        raise RuntimeError(_last_error) from e


def generate_text(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Generate with Groq Llama; fall back to extractive answer from context."""
    try:
        messages = []
        if system.strip():
            messages.append({"role": "system", "content": system.strip()})
        messages.append({"role": "user", "content": prompt.strip()})
        return _groq_chat(messages, max_tokens=max_tokens)
    except Exception as e:
        print(f"Groq generate warning: {e}")
        return extractive_answer(prompt, system)


def extractive_answer(prompt: str, system: str = "") -> str:
    """Fallback: answer strictly by quoting retrieved context."""
    blob = f"{system}\n{prompt}"
    is_ar = bool(re.search(r"[\u0600-\u06FF]", blob))

    # Pull the user question if present (for article targeting)
    question = ""
    if "\nUser Question:" in blob:
        question = blob.split("\nUser Question:", 1)[1].strip()

    ctx = blob
    for marker in ("Context Documents:", "Context Documents from Vector Database:"):
        if marker in blob:
            ctx = blob.split(marker, 1)[1]
            break
    for stop in ("\nUser Question:", "\nUser Question\n"):
        if stop in ctx:
            ctx = ctx.split(stop, 1)[0]

    pieces = [p.strip() for p in re.split(r"\n---\n", ctx) if p.strip()]
    cleaned_pieces = []
    for p in pieces[:6]:
        if "\nText:" in p:
            p = p.split("\nText:", 1)[1]
        elif p.startswith("Text:"):
            p = p.split("Text:", 1)[1]
        p = clean_ocr_noise(p)
        # Skip TOC / dotted-leader junk
        if p.count(".") > 40 and len(re.findall(r"\.{4,}", p)) >= 3:
            continue
        if len(re.sub(r"[\W_\d]+", "", p)) < 50:
            continue
        cleaned_pieces.append(p[:1200])

    # If question mentions an Article N, prefer the slice around that article
    article_nums = re.findall(
        r"(?:Article|المادة)\s*\(?\s*(\d+)\s*\)?", question, flags=re.I
    )
    if article_nums and cleaned_pieces:
        n = article_nums[0]
        focused = []
        for p in cleaned_pieces:
            m = re.search(
                rf"(?:Article|المادة)\s*\(?\s*{re.escape(n)}\s*\)?.{{0,1200}}",
                p,
                flags=re.I | re.S,
            )
            if m:
                focused.append(clean_ocr_noise(m.group(0))[:1100])
        if focused:
            cleaned_pieces = focused + [p for p in cleaned_pieces if p not in focused]

    body = "\n\n".join(cleaned_pieces[:3]).strip()
    if not body:
        return (
            "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
            if is_ar
            else "I do not have enough information in the provided documents to answer this question."
        )
    if is_ar:
        return (
            f"## ملخص من قاعدة الوثائق\n\n{body}\n\n"
            "- **ملاحظة**: وضع احتياطي — تعذر الاتصال بنموذج Llama عبر Groq."
        )
    return (
        f"## Answer from document knowledge base\n\n{body}\n\n"
        "- **Note**: Extractive fallback — Groq Llama was unavailable for this request."
    )


def clean_ocr_noise(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\[Page\s*\d+\]\s*\d+\s+of\s+\d+", " ", text, flags=re.I)
    cleaned = re.sub(r"\[Page\s*\d+\]", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"Page\s*\d+\s+of\s+\d+", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"(?:\d+\s+of\s+\d+\s*){2,}", " ", cleaned, flags=re.I)
    # Collapse long runs of page-footer spam
    cleaned = re.sub(r"(?:\s*\d+\s+of\s+\d+){3,}", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\*{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def embed_text(text: str, dims: int = 768) -> list[float]:
    """Lightweight deterministic 768-d embedding + keyword hybrid in RAG."""
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


def engine_status() -> dict:
    return {
        "engine": "groq",
        "chat_model": CHAT_MODEL_LABEL,
        "provider": "Groq Cloud",
        "weights": "open-weight Llama hosted by Groq (no local GGUF)",
        "api_key_configured": bool(GROQ_API_KEY),
        "error": _last_error,
    }
