import { useState, useRef } from 'react'
import {
  FileSearch, CheckCircle2, AlertTriangle, Wand2,
  ClipboardCheck, ScrollText, Replace, ScanSearch,
  Loader2, UploadCloud
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard, ProgressBar, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { extractPdfText } from '../utils/pdfExtractor'
import { globalStore } from '../store'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

/*
const checks = [
  { name: 'Completeness Check', ar: 'فحص الاكتمال', result: 'warn', detail: '2 mandatory annexes missing', detailAr: 'ملحقان إلزاميان مفقودان' },
  { name: 'Regulatory Compliance', ar: 'الالتزام التنظيمي', result: 'warn', detail: '1 clause conflicts with Exec. Reg. Art. 14', detailAr: 'بند يتعارض مع اللائحة التنفيذية م١٤' },
  { name: 'Standards Alignment', ar: 'مطابقة المعايير', result: 'pass', detail: 'Matches NCEC drafting standard v3', detailAr: 'مطابق لمعيار الصياغة ٣' },
  { name: 'Internal Consistency', ar: 'الاتساق الداخلي', result: 'fail', detail: '3 term inconsistencies detected', detailAr: '٣ حالات عدم اتساق في المصطلحات' },
  { name: 'Missing Clauses', ar: 'البنود المفقودة', result: 'warn', detail: 'Penalty escalation clause absent', detailAr: 'بند تصعيد العقوبات غائب' },
  { name: 'Formatting & Structure', ar: 'التنسيق والهيكل', result: 'pass', detail: 'Template NCEC-POL-02 preserved', detailAr: 'تم الحفاظ على القالب المعتمد' },
]
*/

const initialFindings = [
  {
    sev: 'high', clause: '§4.2',
    issue: 'Storage duration "90 days" conflicts with Hazardous Materials Regulation Art. 22 (60 days).',
    issueAr: 'مدة التخزين "٩٠ يوماً" تتعارض مع لائحة المواد الخطرة م٢٢ (٦٠ يوماً).',
    suggestion: 'Replace with: "On-site storage shall not exceed sixty (60) days unless renewed by the Center."',
    suggestionAr: 'استبدال بـ: "لا يتجاوز التخزين في الموقع ستين (٦٠) يوماً ما لم يُجدد من المركز."',
    applied: false,
  },
  {
    sev: 'medium', clause: '§7.1',
    issue: 'Term "environmental consultant" used; approved glossary term is "qualified environmental service provider".',
    issueAr: 'استخدم مصطلح "استشاري بيئي" والمصطلح المعتمد هو "مقدم خدمات بيئية مؤهل".',
    suggestion: 'Apply glossary substitution across 7 occurrences.',
    suggestionAr: 'تطبيق الاستبدال المعتمد في ٧ مواضع.',
    applied: false,
  },
  {
    sev: 'medium', clause: '§9',
    issue: 'Missing clause: appeal mechanism within 30 days required by drafting standard for all penalty policies.',
    issueAr: 'بند مفقود: آلية التظلم خلال ٣٠ يوماً مطلوبة لجميع سياسات العقوبات.',
    suggestion: 'Insert standard appeal clause NCEC-CL-118 after §9.3.',
    suggestionAr: 'إدراج بند التظلم المعياري NCEC-CL-118 بعد ٩٫٣.',
    applied: false,
  },
]

type QueueItem = {
  id: number
  name: string
  score: number | null
  status: 'active' | 'done' | 'queued' | 'analyzing'
  pct?: number
}

const initialQueue: QueueItem[] = [
  { id: 1, name: 'Hazardous Waste Policy v2.2 (draft)', score: 74, status: 'active' },
  { id: 2, name: 'Coastal Monitoring SOP update', score: 91, status: 'done' },
  { id: 3, name: 'Circular — Lab Accreditation Renewal', score: 88, status: 'done' },
  { id: 4, name: 'Air Quality Procedure v3.3 (draft)', score: null, status: 'queued' },
]

const reviewTypes = [
  { en: 'Policy', ar: 'سياسة' },
  { en: 'Procedure / SOP', ar: 'إجراء / دليل تشغيل' },
  { en: 'Technical Report', ar: 'تقرير فني' },
  { en: 'Circular', ar: 'تعميم' },
]

export default function DocReview() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canApply = role.perms.generate
  const [findings, setFindings] = useState(initialFindings)
  const [readiness, setReadiness] = useState(74)
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue)
  const [showForm, setShowForm] = useState(false)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState(0)
  const [extraReviews, setExtraReviews] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extractedData, setExtractedData] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsExtracting(true)
    setDocName(file.name)
    try {
      if (file.type === 'application/pdf') {
        const text = await extractPdfText(file)
        setExtractedData(text)
        globalStore.addDocument({ name: file.name, content: text })
      } else {
        setExtractedData(`File uploaded: ${file.name}. \nNote: Content extraction is optimized for PDF files.`)
      }
    } catch (err) {
      console.error(err)
      setExtractedData('Error extracting text from document.')
    } finally {
      setIsExtracting(false)
    }
  }

  const apply = (i: number) => {
    if (!canApply || findings[i].applied) return
    setFindings((f) => f.map((x, j) => (j === i ? { ...x, applied: true } : x)))
    setReadiness((r) => Math.min(96, r + 7))
  }

  const patchItem = (id: number, patch: Partial<QueueItem>) =>
    setQueue((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const startReview = () => {
    if (!role.perms.upload || !docName.trim()) return
    const id = Date.now()
    const name = docName.trim()
    const finalScore = 78 + ((name.length * 7) % 17) // deterministic demo score 78–94
    setQueue((q) => [{ id, name, score: null, status: 'analyzing', pct: 8 }, ...q])
    setShowForm(false)
    setDocName('')
    // Simulated pipeline: parse -> check -> score
    setTimeout(() => patchItem(id, { pct: 38 }), 700)
    setTimeout(() => patchItem(id, { pct: 71 }), 1500)
    setTimeout(() => patchItem(id, { pct: 92 }), 2300)
    setTimeout(() => {
      patchItem(id, { status: 'done', score: finalScore, pct: 100 })
      setExtraReviews((n) => n + 1)
    }, 3000)
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'مراجعة الوثائق' : 'Document Review'}
        subtitle={isAr
          ? 'فحص الاكتمال والالتزام والاتساق، كشف البنود المفقودة، واقتراح التصحيحات والصياغات البديلة'
          : 'Completeness, compliance and consistency checks — detects missing clauses, suggests corrections and alternative wording'}
        actions={
          <Button size="sm" onClick={() => setShowForm(true)} disabled={!role.perms.upload} title={role.perms.upload ? undefined : t('requiresPermission')}>
            <FileSearch size={14} /> {isAr ? 'مراجعة وثيقة' : 'Review Document'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={ClipboardCheck} label={isAr ? 'مراجعات هذا الشهر' : 'Reviews This Month'} value={String(312 + extraReviews)} accent="emerald" delta={`+${41 + extraReviews}`} deltaUp
          trend={[198, 221, 240, 258, 276, 295, 312 + extraReviews]} trendLabels={weeks} />
        <KpiCard icon={AlertTriangle} label={isAr ? 'ملاحظات لكل وثيقة' : 'Avg. Findings per Doc'} value="5.7" accent="amber"
          trend={[6.8, 6.6, 6.3, 6.1, 6.0, 5.8, 5.7]} trendLabels={weeks} />
        <KpiCard icon={Replace} label={isAr ? 'تصحيحات مقبولة' : 'Corrections Accepted'} value="87%" accent="sky"
          trend={[79, 81, 82, 84, 85, 86, 87]} trendLabels={weeks} unit="%" />
        <KpiCard icon={ScrollText} label={isAr ? 'معايير مرجعية' : 'Reference Standards'} value="28" accent="violet"
          trend={[22, 23, 24, 25, 26, 27, 28]} trendLabels={weeks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Active review */}
        <div className="xl:col-span-2 space-y-4">


          <Card title={isAr ? 'الملاحظات والتصحيحات المقترحة' : 'Findings & Suggested Corrections'} subtitle={isAr ? 'اضغط "تطبيق" لإدراج الصياغة البديلة' : 'Click "Apply" to insert the alternative wording'}>
            <div className="space-y-3">
              {findings.map((f, i) => (
                <div key={i} className={`rounded-xl border p-3.5 ${
                  f.applied ? 'border-emerald-200 bg-emerald-50/60'
                  : f.sev === 'high' ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'
                }`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {f.applied
                      ? <Badge tone="emerald"><CheckCircle2 size={10} /> {isAr ? 'مطبق' : 'APPLIED'}</Badge>
                      : <Badge tone={f.sev === 'high' ? 'rose' : 'amber'}>{f.sev}</Badge>}
                    <span className="text-xs text-amber-700 font-mono">{f.clause}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed" dir="auto">{isAr ? f.issueAr : f.issue}</p>
                  <div className="mt-2 rounded-lg bg-white border border-emerald-200 p-2.5 flex items-start gap-2">
                    <Wand2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-900 leading-relaxed flex-1" dir="auto">{isAr ? f.suggestionAr : f.suggestion}</p>
                    {f.applied
                      ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      : <Button size="sm" onClick={() => apply(i)} disabled={!canApply} title={canApply ? undefined : t('requiresPermission')}>{isAr ? 'تطبيق' : 'Apply'}</Button>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Review queue */}
        <Card title={isAr ? 'قائمة المراجعة' : 'Review Queue'} className="h-fit">
          <div className="space-y-2.5">
            {queue.map((q) => (
              <div key={q.id} className={`rounded-lg border p-3 transition-colors ${
                q.status === 'analyzing' ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-xs font-medium text-slate-800 leading-snug" dir="auto">{q.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  {q.status === 'active' && <Badge tone="amber">{isAr ? 'نشطة' : 'Active'}</Badge>}
                  {q.status === 'analyzing' && <Badge tone="sky"><ScanSearch size={10} /> {isAr ? 'يُحلَّل الآن' : 'Analyzing'}</Badge>}
                  {q.status === 'done' && <Badge tone="emerald">{isAr ? 'مكتملة' : 'Done'}</Badge>}
                  {q.status === 'queued' && <Badge tone="slate">{isAr ? 'انتظار' : 'Queued'}</Badge>}
                  {q.status === 'active' && (
                    <span className="text-[11px] text-slate-500 ms-auto">{isAr ? 'الجاهزية' : 'readiness'} <b className="text-slate-800">{readiness}%</b></span>
                  )}
                  {q.status === 'analyzing' && (
                    <span className="text-[11px] text-sky-700 ms-auto font-semibold">{q.pct}%</span>
                  )}
                  {(q.status === 'done' || q.status === 'queued') && q.score !== null && (
                    <span className="text-[11px] text-slate-500 ms-auto">{isAr ? 'الجاهزية' : 'readiness'} <b className="text-slate-800">{q.score}%</b></span>
                  )}
                </div>
                {q.status === 'active' && <div className="mt-2"><ProgressBar value={readiness} tone={readiness > 85 ? 'emerald' : 'amber'} /></div>}
                {q.status === 'analyzing' && <div className="mt-2"><ProgressBar value={q.pct ?? 0} tone="sky" /></div>}
                {q.status === 'done' && q.score !== null && <div className="mt-2"><ProgressBar value={q.score} tone={q.score > 85 ? 'emerald' : 'amber'} /></div>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Review Document form */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={isAr ? 'مراجعة وثيقة جديدة' : 'Review a New Document'}
        subtitle={isAr ? 'سيفحص الذكاء الاصطناعي الاكتمال والالتزام والاتساق والبنود المفقودة' : 'AI will check completeness, compliance, consistency and missing clauses'}
        maxW="max-w-md"
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'اسم الوثيقة' : 'Document name'}</label>
            <input
              autoFocus
              dir="auto"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startReview()}
              placeholder={isAr ? 'مثال: سياسة إدارة المخلفات الصناعية v1.4' : 'e.g. Industrial Waste Management Policy v1.4'}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-600/60"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'نوع الوثيقة' : 'Document type'}</label>
            <select
              value={docType}
              onChange={(e) => setDocType(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none cursor-pointer"
            >
              {reviewTypes.map((rt, i) => (
                <option key={rt.en} value={i}>{isAr ? rt.ar : rt.en}</option>
              ))}
            </select>
          </div>
          <div>
             <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isExtracting} className="w-full">
               {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
               {isAr ? 'رفع ملف (اختياري)' : 'Upload File (Optional)'}
             </Button>
             <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx" />
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-500 leading-relaxed">
            {isAr
              ? 'ستُقارن الوثيقة مع 28 معياراً مرجعياً و744 وثيقة تنظيمية، وتُحسب درجة الجاهزية مع قائمة الملاحظات والتصحيحات المقترحة.'
              : 'The document will be checked against 28 reference standards and 744 regulatory instruments; a readiness score plus findings and suggested corrections will be produced.'}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button size="sm" onClick={startReview} disabled={!docName.trim()}>
              <ScanSearch size={13} /> {isAr ? 'بدء المراجعة الذكية' : 'Start AI Review'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!extractedData}
        onClose={() => setExtractedData(null)}
        title={isAr ? 'البيانات المستخرجة' : 'Extracted Data'}
        subtitle={isAr ? 'البيانات النصية المستخرجة من المستند المرفوع' : 'Text data extracted from the uploaded document'}
      >
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs text-slate-700">
          {extractedData}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setExtractedData(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
        </div>
      </Modal>
    </div>
  )
}
