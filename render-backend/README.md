# NCEC AI Platform — Render Backend Deployment

This directory contains the production-ready Python FastAPI + PaddleOCR backend service, pre-configured for **Render** deployment via Docker.

---

## 📁 Files Included

- **`main.py`**: FastAPI application handling PDF/Image uploads and PaddleOCR text extraction.
- **`requirements.txt`**: Python dependencies (`paddlepaddle`, `paddleocr`, `fastapi`, `uvicorn`, `PyMuPDF`, etc.).
- **`Dockerfile`**: Docker container setup with required system libraries (`libgl1-mesa-glx`, `libglib2.0-0`, etc.).
- **`render.yaml`**: Render Blueprint configuration file for 1-click deployment.

---

## 🚀 How to Deploy on Render

### Option A: Using Render Blueprints (Recommended)
1. Push your repository to **GitHub**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render-backend/render.yaml` and create the Web Service!

---

### Option B: Manual Web Service Setup
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `ncec-ocr-backend`
   - **Root Directory**: `render-backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Starter` (or higher, minimum 1GB RAM recommended for PaddleOCR)
5. Click **Create Web Service**.

---

## 🔗 Connecting Frontend to your Render Backend

Once your Render Web Service is deployed, copy its live URL (e.g. `https://ncec-ocr-backend.onrender.com`).

Set the environment variable in your Vercel frontend:
```env
VITE_OCR_API_URL=https://ncec-ocr-backend.onrender.com
```
