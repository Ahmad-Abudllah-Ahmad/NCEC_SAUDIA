"""
NCEC AI Platform — OCR + Groq Llama RAG backend
===============================================
PaddleOCR + Llama 3.1 8B (Groq, open-weight) + Supabase.
"""

import os
import uuid
import tempfile
import threading
import traceback
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from rag import RAGError, run_rag_chat
from llm_engine import CHAT_MODEL_LABEL, embed_text, engine_status, generate_text

# ── PaddleOCR ───────────────────────────────────────────────────────────
_ocr_engine = None
_ocr_lock = threading.Lock()
jobs: dict[str, dict] = {}


def get_ocr():
    global _ocr_engine
    if _ocr_engine is None:
        with _ocr_lock:
            if _ocr_engine is None:
                from paddleocr import PaddleOCR
                _ocr_engine = PaddleOCR(lang="ar")
    return _ocr_engine


app = FastAPI(title="NCEC OCR API (Render)", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def pdf_page_to_image(doc: fitz.Document, page_index: int, dpi: int = 300) -> np.ndarray:
    page = doc[page_index]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    return np.array(img)


def ocr_image(img_array: np.ndarray) -> str:
    ocr = get_ocr()
    results = ocr.predict(img_array)
    lines = []
    for res in results:
        for text in res.get("rec_texts", []):
            if text and text.strip():
                lines.append(text.strip())
    return "\n".join(lines)


def process_job_sync(job_id: str, file_path: str, file_type: str):
    job = jobs[job_id]
    try:
        if file_type in ("image/png", "image/jpeg", "image/jpg", "image/tiff"):
            job["total_pages"] = 1
            img = Image.open(file_path).convert("RGB")
            text = ocr_image(np.array(img))
            job["pages"][1] = text
            job["processed"] = 1
            job["status"] = "completed"
            job["pct"] = 100
        else:
            doc = fitz.open(file_path)
            total = len(doc)
            job["total_pages"] = total
            for i in range(total):
                text = ocr_image(pdf_page_to_image(doc, i))
                page_num = i + 1
                job["pages"][page_num] = text
                job["processed"] = page_num
                job["pct"] = round((page_num / total) * 100, 1)
            doc.close()
            job["status"] = "completed"
            job["pct"] = 100
    except Exception as exc:
        job["status"] = "failed"
        job["error"] = str(exc)
        traceback.print_exc()
    finally:
        try:
            os.unlink(file_path)
        except OSError:
            pass


@app.get("/")
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "NCEC OCR Backend",
        "engine": "PaddleOCR",
        "lang": "ar",
        "rag": "Groq Llama + Supabase",
        "llm": engine_status(),
        "supabase_configured": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
    }


@app.post("/api/ocr/upload")
async def upload_and_start_ocr(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    suffix = Path(file.filename).suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(await file.read())
    tmp.close()

    total_pages = 1
    file_type = file.content_type or "application/pdf"
    if "pdf" in file_type or suffix.lower() == ".pdf":
        try:
            doc = fitz.open(tmp.name)
            total_pages = len(doc)
            doc.close()
        except Exception:
            pass

    job_id = str(uuid.uuid4())[:12]
    jobs[job_id] = {
        "id": job_id,
        "filename": file.filename,
        "total_pages": total_pages,
        "processed": 0,
        "pct": 0,
        "status": "processing",
        "pages": {},
        "error": None,
    }
    threading.Thread(target=process_job_sync, args=(job_id, tmp.name, file_type), daemon=True).start()
    return JSONResponse({"job_id": job_id, "total_pages": total_pages, "status": "processing"})


@app.get("/api/ocr/status/{job_id}")
async def get_job_status(job_id: str, page: Optional[int] = None):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    response = {
        "id": job["id"],
        "filename": job["filename"],
        "total_pages": job["total_pages"],
        "processed": job["processed"],
        "pct": job["pct"],
        "status": job["status"],
        "error": job["error"],
    }
    if page is not None:
        response["page_text"] = job["pages"].get(page)
    else:
        response["pages"] = job["pages"]
    return JSONResponse(response)


class LLMGenerateRequest(BaseModel):
    model: str = "llama-3.1-8b-instant"
    prompt: str
    system: Optional[str] = None
    stream: bool = False


class LLMEmbeddingRequest(BaseModel):
    model: str = "light-768"
    prompt: str


class RAGChatRequest(BaseModel):
    question: str
    mode: str = "document"
    match_threshold: float = 0.0
    match_count: int = 5


@app.post("/api/rag/chat")
async def rag_chat(req: RAGChatRequest):
    try:
        return JSONResponse(
            run_rag_chat(
                question=req.question,
                mode=req.mode,
                match_threshold=req.match_threshold,
                match_count=req.match_count,
            )
        )
    except RAGError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"RAG pipeline error: {e}")


@app.post("/api/llm/generate")
async def llm_generate(req: LLMGenerateRequest):
    try:
        return JSONResponse(
            {"response": generate_text(req.prompt, req.system or ""), "model": CHAT_MODEL_LABEL}
        )
    except Exception as e:
        raise HTTPException(503, f"Groq LLM error: {e}")


@app.post("/api/llm/embeddings")
async def llm_embeddings(req: LLMEmbeddingRequest):
    try:
        return JSONResponse({"embedding": embed_text(req.prompt)})
    except Exception as e:
        raise HTTPException(503, f"Embedding error: {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8100))
    print(f"NCEC Backend starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
