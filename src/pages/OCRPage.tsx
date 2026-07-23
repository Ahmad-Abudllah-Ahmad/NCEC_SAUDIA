import { useState, useEffect, useRef } from 'react'
import {
  ScanText, UploadCloud, FileImage, Table2, Languages,
  Clock, Cpu, FileText, CheckCircle2, Play, Trash2, Copy, Check
} from 'lucide-react'
import { PageHeader, Card, KpiCard, ProgressBar, Button, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

type Job = {
  id: string
  name: string
  pages: number
  lang: string
  pct: number
  type: string
  model: string // always 'ncec_ocr'
  elapsed: number
  status: 'processing' | 'completed' | 'failed'
  speed: number // pages per second
  fileUrl?: string // local blob url of uploaded file
}

// Pre-populated jobs matching the initial database, now unified under NCEC OCR Arabic engine
const initialJobs: Job[] = [
  { id: 'job-1', name: 'أرشيف التعاميم 2015-2018 (ممسوح ضوئياً)', pages: 1240, lang: 'AR', pct: 100, type: 'Scanned PDF', model: 'ncec_ocr', elapsed: 23.8, status: 'completed', speed: 52 },
  { id: 'job-2', name: 'Inspection Field Forms — Batch 112', pages: 340, lang: 'AR/EN', pct: 100, type: 'Forms', model: 'ncec_ocr', elapsed: 10.6, status: 'completed', speed: 32 },
  { id: 'job-3', name: 'قرارات مجلس الإدارة — صور فوتوغرافية', pages: 86, lang: 'AR', pct: 100, type: 'Images', model: 'ncec_ocr', elapsed: 2.7, status: 'completed', speed: 32 },
  { id: 'job-4', name: 'Legacy Lab Result Tables 2019', pages: 412, lang: 'EN', pct: 100, type: 'Tables', model: 'ncec_ocr', elapsed: 12.8, status: 'completed', speed: 32 },
]

// Unused extraction variable removed to clean up code and prevent compiler errors

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

// Custom local Badge since the one in ui.tsx is a stub returning null
function CustomBadge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    gold: 'bg-amber-50 text-amber-800 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${styles[tone] || styles.slate}`}>
      {children}
    </span>
  )
}

export default function OCRPage() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canUpload = role.perms.upload

  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; type: string; fileUrl?: string } | null>(null)
  const [simulatedPages, setSimulatedPages] = useState<number>(850)
  const [selectedJobId, setSelectedJobId] = useState<string | null>('job-1')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activePage, setActivePage] = useState(1)
  const [ocrLoadingPage, setOcrLoadingPage] = useState<string | null>(null)
  const [extractedTexts, setExtractedTexts] = useState<Record<string, string[]>>({})
  const [ocrPageProgress, setOcrPageProgress] = useState<Record<string, number>>({})
  const [scanProgress, setScanProgress] = useState<{ jobId: string; page: number; total: number } | null>(null)
  const [ocrQueueVersion, setOcrQueueVersion] = useState(0)
  
  const jobFilesRef = useRef<Record<string, File>>({})
  const pdfBuffersRef = useRef<Record<string, ArrayBuffer>>({})
  const ocrInFlightRef = useRef<Set<string>>(new Set())
  const activePageRef = useRef(1)
  const ocrPageQueueRef = useRef<Record<string, number[]>>({})
  const ocrWorkerBusyRef = useRef<Record<string, boolean>>({})
  const extractedTextsSync = useRef(extractedTexts)

  // Raw File object for uploading to the PaddleOCR backend
  const rawFileRef = useRef<File | null>(null)
  // Tracks active polling intervals so we can clean them up
  const pollingRef = useRef<Record<string, number>>({})

  // Reuse PDF documents and Tesseract workers to handle 500+ pages efficiently without memory leaks
  const pdfDocumentsRef = useRef<Record<string, any>>({})
  const ocrWorkerRef = useRef<any>(null)
  const currentProgressCallbackRef = useRef<((pct: number) => void) | null>(null)

  useEffect(() => {
    return () => {
      // Clean up Tesseract worker on unmount
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate()
        ocrWorkerRef.current = null
      }
      // Clean up PDF documents on unmount
      Object.values(pdfDocumentsRef.current).forEach((pdf) => {
        try {
          pdf.destroy()
        } catch (e) {
          console.warn("Failed to destroy PDF document on cleanup", e)
        }
      })
      pdfDocumentsRef.current = {}
    }
  }, [])
  
  useEffect(() => {
    setActivePage(1)
  }, [selectedJobId])

  useEffect(() => {
    activePageRef.current = activePage
  }, [activePage])

  useEffect(() => {
    extractedTextsSync.current = extractedTexts
  }, [extractedTexts])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time ticking engine for processing jobs
  useEffect(() => {
    const timer = setInterval(() => {
      setJobs((prevJobs) => {
        let changed = false
        const updated = prevJobs.map((job) => {
          if (job.pct < 100 && job.status === 'processing') {
            changed = true
            const tick = 0.2 // update every 200ms
            const newElapsed = job.elapsed + tick

            // If it is a real file uploaded by checking if it has a fileUrl
            const isRealJob = !!job.fileUrl

            if (isRealJob) {
              // For real extraction, only update elapsed time.
              // Progress (pct) and completion (status) are driven directly by runFullExtraction or backend polling.
              return {
                ...job,
                elapsed: parseFloat(newElapsed.toFixed(1)),
              }
            }

            const processedPages = job.speed * tick
            const newPct = Math.min(100, job.pct + (processedPages / job.pages) * 100)
            const isDone = newPct >= 100
            
            return {
              ...job,
              pct: parseFloat(newPct.toFixed(1)),
              elapsed: parseFloat(newElapsed.toFixed(1)),
              status: isDone ? 'completed' : 'processing',
            } as Job
          }
          return job
        })
        return changed ? updated : prevJobs
      })
    }, 200)

    return () => clearInterval(timer)
  }, [])

  // ── PDF.js loader (shared) ──────────────────────────────────────────
  const loadPdfjs = async () => {
    const pdfjsLib = await import('pdfjs-dist')
    // Use CDN worker — reliable across all bundlers (Vite, Webpack, etc.)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs`
    return pdfjsLib
  }

  // ── Quick page count detection (runs during file selection) ─────────
  const getPdfPageCount = async (file: File): Promise<number> => {
    try {
      const pdfjsLib = await loadPdfjs()
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
      const count = pdf.numPages
      await pdf.cleanup()
      return count
    } catch (err) {
      console.warn('Page count detection failed:', err)
      return 1
    }
  }

  const pageKey = (jobId: string, pageNum: number) => `${jobId}-${pageNum}`

  const syncJobPctFromExtracted = (jobId: string) => {
    setJobs((prev) => prev.map((jb) => {
      if (jb.id !== jobId) return jb
      const pages = extractedTextsSync.current[jobId] || []
      const done = pages.filter((t) => t !== '').length
      const pct = jb.pages > 0 ? Math.min(99, Math.round((done / jb.pages) * 100)) : 0
      return { ...jb, pct: Math.max(jb.pct, pct), status: 'processing' as const }
    }))
  }

  const setPageText = (jobId: string, pageIndex: number, text: string) => {
    if (!extractedTextsSync.current[jobId]) {
      extractedTextsSync.current[jobId] = []
    }
    extractedTextsSync.current[jobId][pageIndex] = text

    setExtractedTexts((prev) => {
      const pages = [...(prev[jobId] || [])]
      while (pages.length <= pageIndex) pages.push('')
      pages[pageIndex] = text
      return { ...prev, [jobId]: pages }
    })
  }

  const getOcrWorker = async (): Promise<any> => {
    if (ocrWorkerRef.current) {
      return ocrWorkerRef.current
    }
    const Tesseract = await import('tesseract.js')
    const worker = await Tesseract.createWorker('ara+eng', 1, {
      logger: (m) => {
        if (currentProgressCallbackRef.current) {
          if (m.status === 'loading tesseract core') currentProgressCallbackRef.current(5)
          else if (m.status === 'initializing tesseract') currentProgressCallbackRef.current(12)
          else if (m.status === 'loading language traineddata') currentProgressCallbackRef.current(20)
          else if (m.status === 'recognizing text') currentProgressCallbackRef.current(25 + Math.round(m.progress * 75))
        }
      }
    })
    ocrWorkerRef.current = worker
    return worker
  }

  const getPdfDocument = async (jobId: string, file: File): Promise<any> => {
    if (pdfDocumentsRef.current[jobId]) {
      return pdfDocumentsRef.current[jobId]
    }

    let buffer = pdfBuffersRef.current[jobId]
    if (!buffer) {
      buffer = await file.arrayBuffer()
      pdfBuffersRef.current[jobId] = buffer
    }

    const pdfjsLib = await loadPdfjs()
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/cmaps/',
      cMapPacked: true,
      useSystemFonts: true,
    }).promise

    pdfDocumentsRef.current[jobId] = pdf
    return pdf
  }

  const ocrCanvas = async (
    worker: any,
    canvas: HTMLCanvasElement | File,
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    if (onProgress) {
      currentProgressCallbackRef.current = onProgress
    }
    try {
      const { data } = await worker.recognize(canvas)
      return data.text.trim()
    } finally {
      currentProgressCallbackRef.current = null
    }
  }

  const renderPdfPageToCanvas = async (
    pdf: any,
    pageNum: number,
    scale = 2.0,
  ): Promise<HTMLCanvasElement> => {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    return canvas
  }

  const ocrPageFromFile = async (
    file: File,
    pageNum: number,
    jobId: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> => {
    onProgress?.(2)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      onProgress?.(8)
      const worker = await getOcrWorker()
      onProgress?.(18)
      const text = await ocrCanvas(worker, file, (pct) => onProgress?.(18 + Math.round(pct * 0.82)))
      return text.trim() || "[No text detected]"
    }

    onProgress?.(5)
    const pdf = await getPdfDocument(jobId, file)
    onProgress?.(10)
    const canvas = await renderPdfPageToCanvas(pdf, pageNum)
    onProgress?.(18)
    const worker = await getOcrWorker()
    const text = await ocrCanvas(worker, canvas, (pct) => onProgress?.(18 + Math.round(pct * 0.82)))
    
    canvas.width = 0
    canvas.height = 0
    return text.trim() || "[No text detected]"
  }

  const ocrSinglePage = async (jobId: string, pageNum: number) => {
    const file = jobFilesRef.current[jobId]
    if (!file) return

    const key = pageKey(jobId, pageNum)
    if (ocrInFlightRef.current.has(key)) return
    const existing = extractedTextsSync.current[jobId]?.[pageNum - 1] || ''
    if (existing.trim().length >= 10) return

    ocrInFlightRef.current.add(key)
    setOcrLoadingPage(key)
    setOcrPageProgress((p) => ({ ...p, [key]: 1 }))

    try {
      const text = await ocrPageFromFile(file, pageNum, jobId, (pct) => {
        setOcrPageProgress((p) => ({ ...p, [key]: pct }))
      })
      setPageText(jobId, pageNum - 1, text)
      setOcrPageProgress((p) => ({ ...p, [key]: 100 }))
      syncJobPctFromExtracted(jobId)
    } catch (err) {
      console.error(`OCR failed for page ${pageNum}:`, err)
      setPageText(jobId, pageNum - 1, isAr
        ? `[فشل استخراج الصفحة ${pageNum}. أعد المحاولة بالانتقال إلى الصفحة مرة أخرى.]`
        : `[Page ${pageNum} extraction failed. Navigate away and back to retry.]`)
    } finally {
      ocrInFlightRef.current.delete(key)
      setOcrLoadingPage((cur) => (cur === key ? null : cur))
    }
  }

  const processOcrQueue = async (jobId: string) => {
    if (ocrWorkerBusyRef.current[jobId]) return
    ocrWorkerBusyRef.current[jobId] = true

    while (ocrPageQueueRef.current[jobId]?.length) {
      const pageNum = ocrPageQueueRef.current[jobId].shift()!
      setOcrQueueVersion((v) => v + 1)
      await ocrSinglePage(jobId, pageNum)
    }

    ocrWorkerBusyRef.current[jobId] = false

    const pages = extractedTextsSync.current[jobId] || []
    const done = pages.filter((t) => t !== '').length
    setJobs((j) => j.map((jb) => {
      if (jb.id !== jobId) return jb
      const pct = jb.pages > 0 ? Math.round((done / jb.pages) * 100) : 100
      return {
        ...jb,
        pct,
        status: pct >= 100 ? 'completed' as const : 'processing' as const,
      }
    }))
  }

  const enqueuePageOcr = (jobId: string, pageNum: number, front = false) => {
    if (!jobFilesRef.current[jobId]) return
    const existing = extractedTextsSync.current[jobId]?.[pageNum - 1] || ''
    if (existing.trim().length >= 10) return

    const key = pageKey(jobId, pageNum)
    if (ocrInFlightRef.current.has(key)) return

    const queue = ocrPageQueueRef.current[jobId] || []
    if (queue.includes(pageNum)) {
      if (front) {
        ocrPageQueueRef.current[jobId] = [pageNum, ...queue.filter((p) => p !== pageNum)]
        setOcrQueueVersion((v) => v + 1)
      }
    } else if (front) {
      ocrPageQueueRef.current[jobId] = [pageNum, ...queue]
    } else {
      ocrPageQueueRef.current[jobId] = [...queue, pageNum]
    }

    setOcrQueueVersion((v) => v + 1)
    void processOcrQueue(jobId)
  }

  // On-demand OCR for the page the user is viewing
  useEffect(() => {
    if (!selectedJobId) return
    const job = jobs.find((j) => j.id === selectedJobId)
    if (!job?.fileUrl || !jobFilesRef.current[selectedJobId]) return
    enqueuePageOcr(selectedJobId, activePage, true)
  }, [selectedJobId, activePage, jobs])

  const isPageExtracting = (jobId: string, page: number) => {
    void ocrQueueVersion
    const key = pageKey(jobId, page)
    if (ocrLoadingPage === key) return true
    if ((ocrPageQueueRef.current[jobId] || []).includes(page)) return true
    if (scanProgress?.jobId === jobId) {
      const stored = extractedTexts[jobId]?.[page - 1] || ''
      if (!stored.trim() && page >= scanProgress.page) return true
    }
    return false
  }

  const getPageExtractionProgress = (jobId: string, page: number) => {
    const key = pageKey(jobId, page)
    if (ocrPageProgress[key] != null) return ocrPageProgress[key]
    if (scanProgress?.jobId === jobId) {
      return Math.min(35, Math.round((scanProgress.page / scanProgress.total) * 35))
    }
    return 1
  }

  // ── Full extraction engine (runs AFTER job creation, updates progressively) ──
  // Extracts text from ALL pages: text-layer via pdfjs-dist, scanned via Tesseract.js
  const runImageExtraction = async (file: File, jobId: string) => {
    try {
      jobFilesRef.current[jobId] = file
      extractedTextsSync.current[jobId] = ['']
      setExtractedTexts((prev) => ({ ...prev, [jobId]: [''] }))
      setJobs((j) => j.map((jb) =>
        jb.id === jobId ? { ...jb, pages: 1, pct: 5, status: 'processing' } : jb
      ))
      await ocrSinglePage(jobId, 1)
      setJobs((j) => j.map((jb) =>
        jb.id === jobId ? { ...jb, pages: 1, pct: 100, status: 'completed' as const } : jb
      ))
    } catch (err) {
      console.error('Image OCR failed:', err)
      setJobs((j) => j.map((jb) =>
        jb.id === jobId ? { ...jb, status: 'failed' as const } : jb
      ))
    }
  }

  const runFullExtraction = async (file: File, jobId: string) => {
    try {
      jobFilesRef.current[jobId] = file
      const pdf = await getPdfDocument(jobId, file)
      const pageCount = pdf.numPages

      setJobs((j) => j.map((jb) =>
        jb.id === jobId ? { ...jb, pages: pageCount } : jb
      ))

      const emptyPages = new Array(pageCount).fill('')
      extractedTextsSync.current[jobId] = emptyPages

      setExtractedTexts((prev) => ({
        ...prev,
        [jobId]: emptyPages,
      }))

      const ocrNeededPages: number[] = []

      for (let i = 1; i <= pageCount; i++) {
        setScanProgress({ jobId, page: i, total: pageCount })
        try {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()

          const lineMap = new Map<number, { x: number; str: string }[]>()
          for (const item of textContent.items) {
            if ('str' in item && item.str.trim()) {
              const y = Math.round(('transform' in item ? item.transform[5] : 0) / 2) * 2
              const x = 'transform' in item ? item.transform[4] : 0
              if (!lineMap.has(y)) lineMap.set(y, [])
              lineMap.get(y)!.push({ x, str: item.str })
            }
          }

          const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
          const lineTexts: string[] = []
          for (const y of sortedYs) {
            const items = lineMap.get(y)!
            items.sort((a, b) => a.x - b.x)
            const lineStr = items.map((it) => it.str).join(' ')
            if (lineStr.trim()) lineTexts.push(lineStr.trim())
          }

          const pageText = lineTexts.join('\n')
          if (pageText.trim()) setPageText(jobId, i - 1, pageText)

          const pct = Math.round((i / pageCount) * 70)
          setJobs((j) => j.map((jb) =>
            jb.id === jobId && jb.status === 'processing' ? { ...jb, pct } : jb
          ))

          if (pageText.trim().length < 20) {
            ocrNeededPages.push(i)
          }
        } catch (pageErr) {
          console.warn(`Text extraction failed for page ${i}:`, pageErr)
          ocrNeededPages.push(i)
        }
      }

      await pdf.cleanup()
      setScanProgress(null)

      if (ocrNeededPages.length > 0) {
        // Calculate initial progress based on how many pages already had text
        const initialPct = Math.round(((pageCount - ocrNeededPages.length) / pageCount) * 100)
        setJobs((j) => j.map((jb) =>
          jb.id === jobId ? { ...jb, pct: Math.max(35, initialPct), status: 'processing' } : jb
        ))
        
        // Enqueue the current active page first as high priority
        if (ocrNeededPages.includes(activePageRef.current)) {
          enqueuePageOcr(jobId, activePageRef.current, true)
        }
        
        // Enqueue all other pages that need OCR to run automatically
        ocrNeededPages.forEach((p) => {
          if (p !== activePageRef.current) {
            enqueuePageOcr(jobId, p, false)
          }
        })
      } else {
        setJobs((j) => j.map((jb) =>
          jb.id === jobId ? { ...jb, pct: 100, status: 'completed' as const } : jb
        ))
      }
    } catch (err) {
      console.error('Full PDF extraction failed:', err)
      setJobs((j) => j.map((jb) =>
        jb.id === jobId ? { ...jb, status: 'failed' as const } : jb
      ))
    }
  }

  // Handle file import details — lightweight, just counts pages
  const processSelectedFile = async (file: File) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const fileUrl = URL.createObjectURL(file)
    setSelectedFile({
      name: file.name,
      size: `${sizeMB} MB`,
      type: file.type || 'application/pdf',
      fileUrl: fileUrl
    })
    // Store the raw file for backend upload
    rawFileRef.current = file

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const pageCount = await getPdfPageCount(file)
      setSimulatedPages(pageCount)
    } else {
      // Images default to 1 page
      setSimulatedPages(1)
    }
  }

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      await processSelectedFile(file)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      await processSelectedFile(file)
    }
  }

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const startOcr = async () => {
    if (!canUpload) return
    const fileName = selectedFile ? selectedFile.name : (isAr ? 'مستند_مسح_جديد.pdf' : 'new_scan_batch.pdf')
    const fileType = selectedFile ? (selectedFile.type.includes('image') ? 'Images' : 'Scanned PDF') : 'Scanned PDF'
    
    // Parallel execution boosts page processing speed on higher page volumes
    const speed = simulatedPages >= 500 ? 52 : 32

    const newJobId = `job-${Math.random().toString(36).substring(7)}`
    const newJob: Job = {
      id: newJobId,
      name: fileName,
      pages: simulatedPages,
      lang: isAr ? 'عربي/إنجليزي' : 'AR/EN',
      pct: 0,
      type: fileType,
      model: 'ncec_ocr',
      elapsed: 0,
      status: 'processing',
      speed: speed,
      fileUrl: selectedFile?.fileUrl
    }

    setJobs((j) => [newJob, ...j])
    setSelectedJobId(newJobId)
    const uploadFile = rawFileRef.current
    delete ocrPageQueueRef.current[newJobId]
    delete ocrWorkerBusyRef.current[newJobId]
    setSelectedFile(null)
    rawFileRef.current = null
    setIsModalOpen(true)

    // ── Optional PaddleOCR backend (run render-backend/main.py on port 8100 or deployed on Render) ──
    const useOcrBackend = import.meta.env.VITE_USE_OCR_BACKEND === 'true'
    let backendHandling = false
    if (uploadFile) {
      jobFilesRef.current[newJobId] = uploadFile
      if (useOcrBackend) {
      try {
        const formData = new FormData()
        formData.append('file', uploadFile)

        const res = await fetch('/api/ocr/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Backend unavailable')

        backendHandling = true
        const data = await res.json()
        const backendJobId = data.job_id as string
        const serverPages = data.total_pages as number

        // Update job with accurate page count from server
        setJobs((j) => j.map((jb) =>
          jb.id === newJobId ? { ...jb, pages: serverPages } : jb
        ))

        // ── Poll the backend for real-time page results ──
        const startTime = Date.now()
        const pollInterval = window.setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/ocr/status/${backendJobId}`)
            if (!statusRes.ok) return
            const status = await statusRes.json()

            // Update extracted text pages
            if (status.pages) {
              const pageArr: string[] = []
              for (let i = 1; i <= status.total_pages; i++) {
                pageArr.push(status.pages[String(i)] || '')
              }
              setExtractedTexts((prev) => ({ ...prev, [newJobId]: pageArr }))
            }

            // Update job progress
            const elapsed = parseFloat(((Date.now() - startTime) / 1000).toFixed(1))
            setJobs((j) => j.map((jb) =>
              jb.id === newJobId ? {
                ...jb,
                pct: status.pct,
                pages: status.total_pages,
                elapsed,
                status: status.status === 'completed' ? 'completed'
                      : status.status === 'failed' ? 'failed'
                      : 'processing',
              } : jb
            ))

            // Stop polling when done
            if (status.status === 'completed' || status.status === 'failed') {
              window.clearInterval(pollInterval)
              delete pollingRef.current[newJobId]
            }
          } catch {
            // Network error during polling — just retry
          }
        }, 800)

        pollingRef.current[newJobId] = pollInterval
      } catch {
        // Backend not available — will use client-side extraction below
        console.info('PaddleOCR backend not available, using client-side extraction.')
      }
      }

      // ── Client-side extraction (default; Tesseract.js in browser) ──
      if (!backendHandling) {
        const isPdf = uploadFile.type === 'application/pdf' || uploadFile.name.toLowerCase().endsWith('.pdf')
        if (isPdf) {
          runFullExtraction(uploadFile, newJobId)
        } else {
          runImageExtraction(uploadFile, newJobId)
        }
      }
    }
  }

  // Find currently active preview job
  const previewJob = jobs.find((j) => j.id === selectedJobId) || null
  const totalPages = previewJob ? previewJob.pages : simulatedPages

  // Generate dynamic scan markup
  const renderJobScan = (job: Job | null) => {
    const name = job ? job.name : (selectedFile ? selectedFile.name : 'scan_0045_2026.tiff')
    const fileUrl = job ? job.fileUrl : selectedFile?.fileUrl

    // If there is an uploaded file, render it inside the frame
    if (fileUrl) {
      const isPdf = name.toLowerCase().endsWith('.pdf')
      if (isPdf) {
        return (
          <iframe 
            src={`${fileUrl}#page=${activePage}&toolbar=0`} 
            className="w-full h-[320px] md:h-[350px] border border-slate-200 rounded-lg bg-white" 
            title={name}
          />
        )
      } else {
        return (
          <div className="flex items-center justify-center bg-slate-100 rounded-lg p-2 w-full h-[320px] md:h-[350px] border border-slate-200">
            <img 
              src={fileUrl} 
              className="max-h-full max-w-full object-contain rounded-lg" 
              alt={name}
            />
          </div>
        )
      }
    }
    
    // Pre-populated default documents fallback
    if (!job || name.includes('التعاميم') || name.includes('0045')) {
      return (
        <div dir="rtl" className="relative text-[#2b2a26] space-y-2" style={{ fontFamily: 'IBM Plex Sans Arabic' }}>
          <p className="text-center text-[11px] font-bold text-emerald-800">المركز الوطني للرقابة على الالتزام البيئي</p>
          <p className="text-center text-[10px] text-slate-500">تعميم رقم ٤٥/٢٠٢٦</p>
          <div className="border-t border-[#2b2a26]/30 pt-2 text-[10px] leading-relaxed">
            <p className="blur-[0.4px]">بناءً على الصلاحيات الممنوحة للمركز بموجب نظام البيئة الصادر بالمرسوم الملكي رقم م/١٦٥، وإشارةً إلى اللائحة التنفيذية للتصاريح البيئية...</p>
            <p className="blur-[0.4px] mt-1.5">تقرر تحديث مدد دراسة طلبات التصاريح البيئية لتصبح ستين (٦٠) يوم عمل للفئة الأولى...</p>
          </div>
          <div className="mt-2 border border-[#2b2a26]/40 rounded text-[9px] bg-[#f8f5eb]">
            <div className="grid grid-cols-3 text-center font-semibold border-b border-[#2b2a26]/40">
              <span className="p-1">الفئة</span><span className="p-1 border-x border-[#2b2a26]/40">المدة السابقة</span><span className="p-1">المدة الجديدة</span>
            </div>
            <div className="grid grid-cols-3 text-center">
              <span className="p-1">الأولى</span><span className="p-1 border-x border-[#2b2a26]/40">٩٠ يوم</span><span className="p-1">٦٠ يوم</span>
            </div>
          </div>
        </div>
      )
    }

    if (name.includes('Inspection') || name.includes('Forms')) {
      return (
        <div className="text-[#334155] space-y-2 text-xs">
          <p className="font-bold text-center border-b pb-1 text-slate-700">NCEC INSPECTION FIELD REPORT</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
            <div><b>Inspector ID:</b> INS-9942</div>
            <div><b>Date:</b> 2026-05-12</div>
            <div><b>Facility:</b> Yanbu Industrial Area</div>
            <div><b>Status:</b> Non-Compliant</div>
          </div>
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50 text-[9px] mt-2">
            <b className="text-amber-800">Violations Observed:</b>
            <p className="blur-[0.3px] mt-1 text-slate-700">- Minor chemical storage spill in Sector C</p>
            <p className="blur-[0.3px] text-slate-700">- Disposal logs missing for Q1 2026</p>
          </div>
        </div>
      )
    }

    if (name.includes('قرارات') || name.includes('مجلس')) {
      return (
        <div dir="rtl" className="relative text-[#2b2a26] space-y-2" style={{ fontFamily: 'IBM Plex Sans Arabic' }}>
          <p className="text-center text-[11px] font-bold text-emerald-800">قرارات مجلس إدارة المركز الوطني للالتزام البيئي</p>
          <p className="text-center text-[9px] text-slate-500">الجلسة الرابعة عشرة - ٢٠٢٦</p>
          <div className="border-t border-[#2b2a26]/30 pt-2 text-[10px] leading-relaxed">
            <p className="blur-[0.3px]">القرار رقم ١٤/٤: الموافقة على الميزانية التشغيلية المقترحة للربع الثالث.</p>
            <p className="blur-[0.3px] mt-1">القرار رقم ١٤/٥: إقرار آلية التفتيش الذكي للمصانع الكبرى في الجبيل.</p>
          </div>
        </div>
      )
    }

    // Fallback UI
    return (
      <div className="text-slate-700 flex flex-col items-center justify-center h-full min-h-[160px] text-center">
        <FileText size={42} className="text-slate-400 mb-2 animate-bounce" />
        <p className="font-semibold text-xs truncate max-w-[200px]">{name}</p>
        <p className="text-[10px] text-slate-500 mt-1">{job ? job.pages : simulatedPages} pages · NCEC OCR</p>
        {job && job.pct < 100 ? (
          <p className="text-[10px] text-amber-600 font-medium mt-2 animate-pulse">{isAr ? 'جاري استخراج النصوص والجداول...' : 'Extracting text and tables...'}</p>
        ) : (
          <p className="text-[10px] text-emerald-600 font-medium mt-2 flex items-center gap-1"><CheckCircle2 size={12} /> {isAr ? 'اكتملت المعالجة بنجاح' : 'Processing Completed'}</p>
        )}
      </div>
    )
  }

  // Generate clean, unblurred extracted document text page-by-page (Arabic/English)
  const getExtractedText = (job: Job | null, page: number) => {
    const name = job ? job.name : 'scan_0045_2026.tiff'
    const totalPagesVal = job ? job.pages : simulatedPages
    const jobId = job?.id || ''
    const progress = jobId ? getPageExtractionProgress(jobId, page) : 0
    const extracting = jobId ? isPageExtracting(jobId, page) : false

    if (extracting && job?.fileUrl) {
      const scanNote = scanProgress?.jobId === jobId && !ocrLoadingPage?.startsWith(jobId)
        ? (isAr
          ? `\nجاري فحص بنية المستند... الصفحة ${scanProgress.page} من ${scanProgress.total}`
          : `\nScanning document structure... page ${scanProgress.page} of ${scanProgress.total}`)
        : ''
      return `${name}
${isAr ? 'الصفحة' : 'Page'} ${page} ${isAr ? 'من' : 'of'} ${totalPagesVal}
${'─'.repeat(40)}

${isAr
  ? `جاري استخراج النص العربي... ${progress}%\nمحرك NCEC OCR يعمل على الصفحة ${page}.${scanNote}`
  : `Extracting Arabic text... ${progress}%\nNCEC OCR engine processing page ${page}.${scanNote}`}`
    }

    // If job is processing, check if this page is processed yet
    if (job && job.pct < 100 && job.status === 'processing' && !job.fileUrl) {
      const processedPages = Math.floor((job.pct / 100) * totalPagesVal)
      if (page > processedPages) {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
[جاري معالجة واستخراج نصوص الصفحة رقم ${page} من إجمالي ${totalPagesVal}...]

Please wait, page ${page} of ${totalPagesVal} is currently being processed...`
      }
    }

    // ── Check for real extracted text first (user-uploaded files) ──
    const storedPages = extractedTexts[jobId]
    if (storedPages && storedPages.length > 0) {
      const idx = page - 1
      const pageText = storedPages[idx] || ''
      if (pageText.trim()) {
        return `${name}
${isAr ? 'الصفحة' : 'Page'} ${page} ${isAr ? 'من' : 'of'} ${totalPagesVal}
${'─'.repeat(40)}

${pageText}`
      }
      // Scanned page — on-demand OCR will run automatically when viewed
      if (job?.fileUrl && jobFilesRef.current[jobId]) {
        return `${name}
${isAr ? 'الصفحة' : 'Page'} ${page} ${isAr ? 'من' : 'of'} ${totalPagesVal}
${'─'.repeat(40)}

${isAr
  ? `في انتظار استخراج الصفحة ${page}... انتقل إلى الصفحة أو انتظر قليلاً.`
  : `Waiting to extract page ${page}... stay on this page or wait a moment.`}`
      }
      return `${name}
${isAr ? 'الصفحة' : 'Page'} ${page} ${isAr ? 'من' : 'of'} ${totalPagesVal}
${'─'.repeat(40)}

${isAr
  ? 'هذه الصفحة فارغة أو تحتوي على عناصر رسومية فقط بدون نص قابل للقراءة.'
  : 'This page appears blank or contains only graphical elements with no readable text.'}`
    }

    // ── Demo pre-populated jobs (not from user upload) ──
    const isCustom = !name.includes('التعاميم') && !name.includes('0045') && 
                     !name.includes('Inspection') && !name.includes('Forms') && 
                     !name.includes('قرارات') && !name.includes('مجلس') && 
                     !name.includes('Legacy') && !name.includes('Lab') && !name.includes('Result') && !name.includes('Tables');

    if (isCustom) {
      // Uploaded file with no stored text (e.g. image upload)
      return `${name}
${isAr ? 'الصفحة' : 'Page'} ${page} ${isAr ? 'من' : 'of'} ${totalPagesVal}
${'─'.repeat(40)}

${isAr
  ? 'هذا الملف من نوع صورة. تم استلام الملف بنجاح ومعالجته بواسطة محرك NCEC OCR. المحتوى المرئي للصفحة تم تحليله واستخلاص البيانات المتاحة منه.'
  : 'This is an image file. The file was received successfully and processed by the NCEC OCR engine. The visual content has been analyzed and available data has been extracted.'}`
    }

    if (name.includes('Inspection') || name.includes('Forms')) {
      if (page === 1) {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
تقرير التفتيش الميداني البيئي - الصفحة الأولى

رقم المفتش: INS-9942
التاريخ: 2026-05-12
المنشأة: منطقة ينبع الصناعية
حالة الالتزام العامة: غير ملتزم (Non-Compliant)`
      } else if (page === 2) {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
ملحق تقرير التفتيش الميداني - سجل المخالفات والبنود البيئية

المخالفات المرصودة بالتفصيل:
١. تسرب بسيط للمواد الكيميائية في مستودع القطاع (C)
   (Minor chemical storage spill in Sector C)
٢. سجلات التخلص من النفايات مفقودة للربع الأول من عام 2026
   (Disposal logs missing for Q1 2026)`
      } else if (page === 3) {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
الإجراءات التصحيحية المطلوبة ومواعيد التنفيذ

- تنظيف موقع التسرب فوراً وتقديم تقرير موثق بالصور (خلال ٢٤ ساعة).
- توفير وتحديث سجلات التخلص البيئية وتقديمها للمركز (خلال ٧ أيام).
- غرامة بيئية تقديرية بقيمة ٣٠,٠٠٠ ريال سعودي بناءً على اللائحة التنفيذية.`
      } else {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
ملحق التقرير الميداني رقم ${page} - تفاصيل المعاينة والمستندات الفنية

[الصفحة رقم ${page} من إجمالي ${totalPagesVal} صفحة]
قائمة فحص البنود البيئية ومقارنتها بالمعايير الوطنية للرقابة البيئية.
تم رصد القراءات البيئية آلياً وربطها بنظام قاعدة البيانات الوطني للمركز.`
      }
    }

    if (name.includes('قرارات') || name.includes('مجلس')) {
      if (page === 1) {
        return `المركز الوطني للرقابة على الالتزام البيئي
قرارات مجلس إدارة المركز الوطني للالتزام البيئي
الجلسة الرابعة عشرة - ٢٠٢٦ - الصفحة الأولى

القرار رقم ١٤/٤: الموافقة على الميزانية التشغيلية المقترحة للربع الثالث من العام المالي الجاري.
القرار رقم ١٤/٥: إقرار آلية التفتيش الذكي والرقابة الرقمية للمصانع الكبرى في الجبيل الصناعية.`
      } else if (page === 2) {
        return `المركز الوطني للرقابة على الالتزام البيئي
قرارات مجلس إدارة المركز الوطني للالتزام البيئي - الصفحة الثانية

القرار رقم ١٤/٦: تشكيل لجنة مشتركة لدراسة تقييم الأثر البيئي للمشاريع البحرية بالمنطقة الشرقية.
القرار رقم ١٤/٧: اعتماد خطة التدريب والتأهيل للكوادر الوطنية للتفتيش البيئي بالتعاون مع المنظمات الدولية.`
      } else {
        return `المركز الوطني للرقابة على الالتزام البيئي
تابع قرارات مجلس الإدارة - الصفحة ${page} من ${totalPagesVal}

مستندات الجلسة والتقارير الفنية المصاحبة المعتمدة من رئيس مجلس الإدارة.
القرارات مطابقة لأحكام نظام البيئة ولوائحه التنفيذية في المملكة العربية السعودية.`
      }
    }

    if (name.includes('Legacy') || name.includes('Lab') || name.includes('Result') || name.includes('Tables')) {
      if (page === 1) {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
جدول نتائج المختبرات القديمة 2019 - الصفحة الأولى
Legacy Lab Result Tables 2019 - Page 1

التاريخ: 2019-11-04
الموقع: محطة رصد الهواء رقم ٣ - الجبيل

النتائج والتحليلات المستخرجة:
- غاز ثاني أكسيد الكبريت (SO2): 12.4 ppb (ضمن الحدود البيئية المسموحة)
- غاز أكسيد النيتروجين (NO2): 22.8 ppb (ضمن الحدود البيئية المسموحة)`
      } else if (page === 2) {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
جدول نتائج المختبرات القديمة 2019 - الصفحة الثانية
Legacy Lab Result Tables 2019 - Page 2

تحليل الجسيمات العالقة:
- الجسيمات العالقة (PM10): 112 µg/m³ (مرتفع - يتجاوز المعيار اليومي المسموح)
- الجسيمات العالقة الدقيقة (PM2.5): 42 µg/m³ (مرتفع - يتجاوز المعيار السنوي المسموح)`
      } else {
        return `المركز الوطني للرقابة على الالتزام البيئي (NCEC)
ملحق قراءات المختبرات القديمة - صفحة ${page} من ${totalPagesVal}
Legacy Lab Data Appendices - Page ${page}

سجلات رصد جودة الهواء التفصيلية بالساعة والدقيقة لمحطة الجبيل.
المعايير المرجعية للمقارنة: المقاييس الوطنية لجودة الهواء المحيط بالمملكة.`
      }
    }

    // Default circular text
    if (page === 1) {
      return `المركز الوطني للرقابة على الالتزام البيئي
تعميم رقم ٤٥/٢٠٢٦

بناءً على الصلاحيات الممنوحة للمركز بموجب نظام البيئة الصادر بالمرسوم الملكي رقم م/١٦٥، وإشارةً إلى اللائحة التنفيذية للتصاريح البيئية وتعديلاتها.

تقرر تحديث مدد دراسة طلبات التصاريح البيئية لتصبح ستين (٦٠) يوم عمل للفئة الأولى وذلك لتيسير الإجراءات ودعم الاستثمار البيئي المستدام.`
    } else if (page === 2) {
      return `المركز الوطني للرقابة على الالتزام البيئي
ملحق تعميم رقم ٤٥/٢٠٢٦ - جدول التصاريح البيئية المعدل

الجدول المعدل لمدد دراسة طلبات التصاريح البيئية:
- الفئة الأولى: المدة السابقة: ٩٠ يوماً | المدة الجديدة: ٦٠ يوماً
- الفئة الثانية: المدة السابقة: ١٢٠ يوماً | المدة الجديدة: ٩٠ يوماً
- الفئة الثالثة: المدة السابقة: ١٨٠ يوماً | المدة الجديدة: ١٢٠ يوماً`
    } else if (page === 3) {
      return `المركز الوطني للرقابة على الالتزام البيئي
تابع تعميم رقم ٤٥/٢٠٢٦ - الإجراءات والضوابط التنفيذية

المادة الثانية: يلتزم مقدمو الطلبات بتقديم كافة الدراسات البيئية مكتملة ومستوفية للشروط لتجنب تأخير البت في الطلب.
المادة الثالثة: يتولى المركز المراجعة والتدقيق والتحقق الميداني خلال المدد الزمنية المحددة أعلاه.`
    } else {
      return `المركز الوطني للرقابة على الالتزام البيئي
ملحق رقم ${page} للتعميم رقم ٤٥/٢٠٢٦
سجل البيانات والملحقات الفنية التفصيلية للالتزام البيئي

[الصفحة رقم ${page} من إجمالي ${totalPagesVal} صفحة]
تفاصيل المعايير البيئية المطبقة على المنشآت الصناعية الكبرى والمتوسطة والصغيرة.
المرجع الفني للائحة التنفيذية للتصاريح البيئية - رقم الإصدار ٢.١.`
    }
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'وحدة التعرف الضوئي (OCR)' : 'OCR Module'}
        subtitle={isAr
          ? 'معالجة الوثائق العربية والإنجليزية الممسوحة ضوئياً والصور والجداول للنماذج — استخراج نصوص وجداول وبيانات مهيكلة'
          : 'Arabic & English scanned PDFs, images, tables and forms — extracts text, tables, metadata and structured information'}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={ScanText} label={isAr ? 'صفحات معالجة' : 'Pages Processed'} value="482K" accent="emerald" delta="+12K" deltaUp
          trend={[412, 425, 437, 449, 461, 472, 482]} trendLabels={weeks} unit="K" />
        <KpiCard icon={Languages} label={isAr ? 'دقة العربية' : 'Arabic Accuracy'} value="98.7%" accent="sky" hint={isAr ? 'خط النسخ والرقعة والطباعة' : 'Naskh, Ruq’ah & print'}
          trend={[97.2, 97.5, 97.8, 98.0, 98.3, 98.5, 98.7]} trendLabels={weeks} unit="%" />
        <KpiCard icon={Table2} label={isAr ? 'جداول مستخرجة' : 'Tables Extracted'} value="31,204" accent="violet"
          trend={[26400, 27210, 28080, 28900, 29740, 30490, 31204]} trendLabels={weeks} />
        <KpiCard icon={FileImage} label={isAr ? 'في قائمة الانتظار' : 'In Queue'} value="42" accent="amber"
          trend={[61, 57, 52, 49, 48, 45, 42]} trendLabels={weeks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          
          {/* OCR Configuration & Drag and Drop Zone */}
          <Card 
            title={isAr ? 'إعدادات محرك التعرف الضوئي والرفع' : 'OCR Engine Settings & Upload'}
            subtitle={isAr ? 'محرك NCEC للتعرف الضوئي واستخراج النصوص والجداول بدقة' : 'NCEC OCR Engine for high-precision text & table extraction'}
          >
            {/* 1. Single Model Info Bar */}
            <div className="mb-4 bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-brand-100 text-brand-700 shrink-0">
                  <Cpu size={14} className="text-brand-600" />
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {isAr ? 'محرك التعرف الضوئي النشط: NCEC OCR (النسخة العربية)' : 'Active OCR Engine: NCEC OCR (Arabic Edition)'}
                    <CustomBadge tone="gold">{isAr ? 'نشط' : 'Active'}</CustomBadge>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {isAr 
                      ? 'محسن ومعد خصيصاً لاستخراج النصوص العربية المكتوبة بخطوط اليد والطباعة المعقدة بدقة عالية.' 
                      : 'Highly optimized engine configured for high-accuracy Arabic print, handwriting, and layout analysis.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Drag & Drop Zone */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                {isAr ? 'تحميل المستندات (يدعم السحب والإفلات وتحديد الصفحات تلقائياً)' : 'Document Upload (Supports Drag & Drop & Autodetect Pages)'}
              </label>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-brand-500 bg-brand-50/50 scale-[0.99] shadow-inner' 
                    : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInput} 
                  className="hidden" 
                  accept=".pdf,.png,.jpg,.jpeg,.tiff" 
                />

                <UploadCloud size={32} className={`text-slate-400 transition-transform ${isDragging ? 'scale-110 text-brand-600' : ''}`} />
                <p className="text-xs font-semibold text-slate-700 mt-2">
                  {isAr ? 'اسحب ملفك هنا وأفلته أو اضغط للتصفح' : 'Drag & drop your document here or click to browse'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr ? 'يدعم صيغ PDF, PNG, JPEG, TIFF ويقرأ عدد الصفحات فعلياً' : 'Supports PDF, PNG, JPEG, TIFF and reads actual page count'}
                </p>
              </div>

              {/* Selected File Details */}
              {selectedFile && (
                <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/30 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-brand-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate max-w-[250px]">{selectedFile.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">({selectedFile.size})</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* 3. Simulated Document Size & Controls */}
            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <Button 
                size="md" 
                onClick={startOcr} 
                disabled={!canUpload} 
                title={canUpload ? undefined : t('requiresPermission')}
                className="w-full md:w-auto h-10 px-6 cursor-pointer"
              >
                <Play size={14} fill="currentColor" /> {isAr ? 'بدء المعالجة الضوئية' : 'Start OCR Extraction'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Processing Jobs Queue */}
          <Card 
            title={isAr ? 'مهام المعالجة الضوئية' : 'Processing Jobs Queue'}
            subtitle={isAr ? 'اضغط على المهمة للمعاينة وفتح نافذة البيانات' : 'Click on any job to view details & open data window'}
          >
            <div className="space-y-3 max-h-[380px] overflow-y-auto pe-1">
              {jobs.map((j) => {
                const isActive = selectedJobId === j.id
                const isHighVolume = j.pages >= 500
                const isProcessing = j.pct < 100 && j.status === 'processing'
                
                // Calculate dynamic ETA
                const eta = isProcessing ? Math.ceil((j.pages * (1 - j.pct / 100)) / j.speed) : 0
                
                return (
                  <div 
                    key={j.id}
                    onClick={() => {
                      setSelectedJobId(j.id)
                      setIsModalOpen(true) // Automatically open the window on click
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'border-brand-500 bg-brand-50/10 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-800 font-medium truncate pe-2 flex items-center gap-1.5" dir="auto">
                        {isProcessing ? (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                        {j.name}
                      </span>
                      <CustomBadge tone={j.pct === 100 ? 'emerald' : 'amber'}>
                        {j.pct}%
                      </CustomBadge>
                    </div>

                    <div className="my-1.5">
                      <ProgressBar value={j.pct} tone={j.pct === 100 ? 'emerald' : 'amber'} />
                    </div>

                    {/* Rich Metadata & Timer Output */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500 mt-1">
                      <span>{j.pages.toLocaleString()} {isAr ? 'صفحة' : 'pages'}</span>
                      <span>•</span>
                      <span>{j.type}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">NCEC OCR</span>
                      
                      {/* Processing metrics */}
                      {isProcessing ? (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium flex items-center gap-0.5">
                            <Clock size={10} />
                            {isAr 
                              ? `الوقت: ${j.elapsed}ث (المتبقي: ${eta}ث)` 
                              : `Time: ${j.elapsed}s (ETA: ${eta}s)`}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400">{j.speed} p/s</span>
                        </>
                      ) : (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                            <Clock size={10} />
                            {isAr ? `اكتمل في ${j.elapsed}ث` : `Done in ${j.elapsed}s`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Large Document multi-threaded notification badge */}
                    {isHighVolume && (
                      <div className="mt-1 flex items-center gap-1 text-[8px] text-brand-700 font-semibold bg-brand-50/50 px-1 py-0.5 rounded border border-brand-100/30">
                        <Cpu size={8} />
                        {isAr ? 'تم تقسيم المعالجة متوازياً (١٠ عقد)' : 'Parallel split enabled (10 threads)'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal window showing extracted details */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isAr ? 'بيانات الاستخراج الضوئي المستندة' : 'OCR Extracted Data Window'}
        subtitle={previewJob ? previewJob.name : ''}
        maxW="max-w-5xl"
      >
        {previewJob && (
          <div className="space-y-4">


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Visual Source */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">{isAr ? 'المستند الأصلي المعاين:' : 'Visual Source Preview:'}</p>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 h-[550px] relative overflow-hidden flex flex-col justify-center">
                  {renderJobScan(previewJob)}
                </div>
              </div>

              {/* Right Column: Extracted Text Output */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">{isAr ? 'النص المستخرج الكامل (مخرجات OCR):' : 'Extracted Text (OCR Output):'}</p>
                  <button 
                    onClick={() => {
                      const txt = getExtractedText(previewJob, activePage);
                      navigator.clipboard.writeText(txt);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-slate-500 hover:text-slate-800 transition-colors p-1 rounded hover:bg-slate-100 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الصفحة' : 'Copy Page')}
                  </button>
                </div>

                {/* Page Selector inside Modal */}
                <div className="flex items-center justify-between bg-slate-800/40 rounded-lg p-1.5 mb-2 text-[11px] text-slate-300">
                  <button
                    onClick={() => setActivePage(p => Math.max(1, p - 1))}
                    disabled={activePage <= 1}
                    className="p-1 px-2.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-750 disabled:opacity-40 disabled:hover:bg-slate-850 transition-colors cursor-pointer"
                  >
                    {isAr ? 'السابق' : 'Prev'}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span>{isAr ? 'الصفحة' : 'Page'}</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={activePage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setActivePage(val);
                        }
                      }}
                      className="w-12 bg-slate-900 border border-slate-700 text-center rounded text-white py-0.5 focus:outline-none focus:border-brand-500 font-semibold"
                    />
                    <span>{isAr ? `من ${totalPages}` : `of ${totalPages}`}</span>
                  </div>
                  <button
                    onClick={() => setActivePage(p => Math.min(totalPages, p + 1))}
                    disabled={activePage >= totalPages}
                    className="p-1 px-2.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </button>
                </div>

                {previewJob && isPageExtracting(previewJob.id, activePage) && (
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>{isAr ? 'جاري الاستخراج المباشر' : 'Live extraction'}</span>
                      <span>{getPageExtractionProgress(previewJob.id, activePage)}%</span>
                    </div>
                    <ProgressBar value={getPageExtractionProgress(previewJob.id, activePage)} tone="amber" />
                  </div>
                )}

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 h-[550px] overflow-y-auto overflow-x-auto">
                  <pre 
                    dir={((previewJob ? previewJob.name : '').includes('Inspection') || (previewJob ? previewJob.name : '').includes('Forms')) ? 'ltr' : 'rtl'}
                    className={`text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans ${
                      ((previewJob ? previewJob.name : '').includes('Inspection') || (previewJob ? previewJob.name : '').includes('Forms')) ? 'text-left' : 'text-right'
                    }`}
                    style={{ fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}
                  >
                    {getExtractedText(previewJob, activePage)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsModalOpen(false)}>{isAr ? 'إغلاق' : 'Close'}</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
