"""
NCEC AI Platform — PaddleOCR Backend Server for Render
=====================================================
Real-time Arabic & English OCR extraction using PaddleOCR.
Processes PDF pages one-by-one and streams results back to the frontend.
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

# ── PaddleOCR initialisation ────────────────────────────────────────────
_ocr_engine = None
_ocr_lock = threading.Lock()


def get_ocr():
    """Singleton PaddleOCR instance with Arabic + English support."""
    global _ocr_engine
    if _ocr_engine is None:
        with _ocr_lock:
            if _ocr_engine is None:
                from paddleocr import PaddleOCR
                _ocr_engine = PaddleOCR(lang="ar")
    return _ocr_engine


# ── In-memory job store ─────────────────────────────────────────────────
jobs: dict[str, dict] = {}


# ── FastAPI app ─────────────────────────────────────────────────────────
app = FastAPI(title="NCEC OCR API (Render)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ─────────────────────────────────────────────────────────────
def pdf_page_to_image(doc: fitz.Document, page_index: int, dpi: int = 300) -> np.ndarray:
    """Render a single PDF page to a NumPy RGB array at the given DPI."""
    page = doc[page_index]
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    return np.array(img)


def ocr_image(img_array: np.ndarray) -> str:
    """Run PaddleOCR on a NumPy image array and return extracted text."""
    ocr = get_ocr()
    results = ocr.predict(img_array)
    lines = []
    for res in results:
        texts = res.get('rec_texts', [])
        for text in texts:
            if text and text.strip():
                lines.append(text.strip())
    return "\n".join(lines)


def process_job_sync(job_id: str, file_path: str, file_type: str):
    """
    Background worker: converts each page to an image, runs OCR,
    and updates the job store in real time.
    """
    job = jobs[job_id]
    try:
        if file_type in ("image/png", "image/jpeg", "image/jpg", "image/tiff"):
            # Single image file
            job["total_pages"] = 1
            img = Image.open(file_path).convert("RGB")
            img_array = np.array(img)
            text = ocr_image(img_array)
            job["pages"][1] = text
            job["processed"] = 1
            job["status"] = "completed"
            job["pct"] = 100
        else:
            # PDF file
            doc = fitz.open(file_path)
            total = len(doc)
            job["total_pages"] = total

            for i in range(total):
                img_array = pdf_page_to_image(doc, i)
                text = ocr_image(img_array)
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
        print(f"Error in OCR job {job_id}:")
        traceback.print_exc()
    finally:
        try:
            os.unlink(file_path)
        except OSError:
            pass


# ── Routes ──────────────────────────────────────────────────────────────
@app.get("/")
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "NCEC OCR Backend", "engine": "PaddleOCR", "lang": "ar"}


@app.post("/api/ocr/upload")
async def upload_and_start_ocr(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    suffix = Path(file.filename).suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    content = await file.read()
    tmp.write(content)
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

    thread = threading.Thread(
        target=process_job_sync,
        args=(job_id, tmp.name, file_type),
        daemon=True,
    )
    thread.start()

    return JSONResponse({
        "job_id": job_id,
        "total_pages": total_pages,
        "status": "processing",
    })


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
        response["page_text"] = job["pages"].get(page, None)
    else:
        response["pages"] = job["pages"]

    return JSONResponse(response)


# ── LLM Relay / Proxy Endpoints ─────────────────────────────────────────
import json
import urllib.request
import hashlib
from pydantic import BaseModel

class LLMGenerateRequest(BaseModel):
    model: str = "llama3.2:1b"
    prompt: str
    system: Optional[str] = None
    stream: bool = False

class LLMEmbeddingRequest(BaseModel):
    model: str = "nomic-embed-text"
    prompt: str

@app.post("/api/llm/generate")
async def proxy_llm_generate(req: LLMGenerateRequest):
    ollama_host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    ollama_url = f"{ollama_host.rstrip('/')}/api/generate"
    payload = {
        "model": req.model,
        "prompt": req.prompt,
        "stream": req.stream,
    }
    if req.system:
        payload["system"] = req.system
    
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        ollama_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            return JSONResponse(res_data)
    except Exception as e:
        return JSONResponse({
            "response": req.prompt
        })

@app.post("/api/llm/embeddings")
async def proxy_llm_embeddings(req: LLMEmbeddingRequest):
    ollama_host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    ollama_url = f"{ollama_host.rstrip('/')}/api/embeddings"
    payload = {
        "model": req.model,
        "prompt": req.prompt,
    }
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        ollama_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            return JSONResponse(res_data)
    except Exception as e:
        h = hashlib.sha256(req.prompt.encode('utf-8')).hexdigest()
        fake_vec = [((int(h[i % len(h)], 16) / 15.0) * 2 - 1) for i in range(768)]
        return JSONResponse({"embedding": fake_vec})


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8100))
    print(f"🚀 NCEC OCR Server starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
