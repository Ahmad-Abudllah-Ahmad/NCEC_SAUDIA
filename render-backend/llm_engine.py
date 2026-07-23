"""
Ultra-light open-weight LLM for Render (no Ollama).

Chat model: Vicuna-68M Q3_K_S GGUF (~40 MB) via llama-cpp-python.
  → Open-weight, CPU-friendly, fits tight Render memory budgets.
Embeddings: lightweight stable 768-d vectors for pgvector + keyword hybrid retrieval.
"""

from __future__ import annotations

import math
import os
import re
import threading
import urllib.request
from pathlib import Path
from typing import Optional

MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/models"))
GGUF_URL = os.getenv(
    "GGUF_URL",
    "https://huggingface.co/Felladrin/gguf-vicuna-68m/resolve/main/vicuna-68m.Q3_K_S.gguf",
)
GGUF_NAME = os.getenv("GGUF_NAME", "vicuna-68m.Q3_K_S.gguf")
CHAT_MODEL_LABEL = os.getenv("CHAT_MODEL", "vicuna-68m")

_llm = None
_llm_lock = threading.Lock()
_llm_error: Optional[str] = None


def ensure_gguf() -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    path = MODEL_DIR / GGUF_NAME
    if path.exists() and path.stat().st_size > 1_000_000:
        return path
    tmp = path.with_suffix(".partial")
    print(f"→ Downloading open-weight GGUF ({GGUF_NAME}) ...")
    urllib.request.urlretrieve(GGUF_URL, tmp)
    tmp.replace(path)
    print(f"→ Model ready: {path} ({path.stat().st_size / 1e6:.1f} MB)")
    return path


def get_llm():
    global _llm, _llm_error
    if _llm is not None:
        return _llm
    with _llm_lock:
        if _llm is not None:
            return _llm
        try:
            from llama_cpp import Llama

            gguf = ensure_gguf()
            _llm = Llama(
                model_path=str(gguf),
                n_ctx=1024,
                n_threads=max(1, (os.cpu_count() or 2) // 2),
                n_batch=64,
                verbose=False,
            )
            _llm_error = None
            return _llm
        except Exception as e:
            _llm_error = str(e)
            raise


def generate_text(prompt: str, system: str = "", max_tokens: int = 256) -> str:
    """Generate with Vicuna-68M; fall back to extractive answer from prompt context."""
    try:
        llm = get_llm()
        full = ""
        if system.strip():
            full += f"System: {system.strip()}\n\n"
        full += prompt.strip()
        # Keep prompt short for tiny model context
        if len(full) > 2800:
            full = full[:2800]
        out = llm(
            full,
            max_tokens=max_tokens,
            temperature=0.2,
            top_p=0.9,
            repeat_penalty=1.1,
            stop=["</s>", "User:", "System:", "\n\nUser"],
        )
        text = (out.get("choices") or [{}])[0].get("text", "").strip()
        if text:
            return text
    except Exception as e:
        print(f"tiny LLM generate warning: {e}")

    return extractive_answer(prompt, system)


def extractive_answer(prompt: str, system: str = "") -> str:
    """0-MB fallback: answer strictly by quoting retrieved context."""
    blob = f"{system}\n{prompt}"
    is_ar = bool(re.search(r"[\u0600-\u06FF]", blob))
    ctx = blob
    for marker in ("Context Documents:", "Context Documents from Vector Database:", "Text:"):
        if marker in blob:
            ctx = blob.split(marker, 1)[1]
            break
    for stop in ("\nUser Question:", "\nUser Question\n"):
        if stop in ctx:
            ctx = ctx.split(stop, 1)[0]
    pieces = [p.strip() for p in re.split(r"\n---\n", ctx) if p.strip()]
    body = "\n\n".join(pieces[:3])[:1800].strip()
    if not body:
        return (
            "لا تتوفر معلومات كافية في الوثائق المتاحة للإجابة على هذا السؤال."
            if is_ar
            else "I do not have enough information in the provided documents to answer this question."
        )
    if is_ar:
        return f"## ملخص من قاعدة الوثائق\n\n{body}\n\n- **ملاحظة**: الإجابة مستخلصة حصراً من الوثائق المسترجعة."
    return f"## Answer from document knowledge base\n\n{body}\n\n- **Note**: Answer is taken strictly from retrieved documents."


def embed_text(text: str, dims: int = 768) -> list[float]:
    """
    Lightweight deterministic 768-d embedding (no heavy model download).
    Combined with keyword search in RAG for reliable retrieval on Render.
    """
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
    path = MODEL_DIR / GGUF_NAME
    ready = path.exists() and path.stat().st_size > 1_000_000
    size_mb = round(path.stat().st_size / 1e6, 1) if path.exists() else 0
    return {
        "engine": "llama-cpp",
        "chat_model": CHAT_MODEL_LABEL,
        "gguf": GGUF_NAME,
        "weights_ready": ready,
        "weights_mb": size_mb,
        "target_size": "~40MB open-weight GGUF (Vicuna-68M Q3_K_S)",
        "error": _llm_error,
    }
