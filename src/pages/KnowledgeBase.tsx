import { useState, useRef, useMemo } from 'react'
import {
  UploadCloud, FileText, FileSpreadsheet, File, Filter, Tags,
  Network, CheckCircle2, Loader2, FolderTree,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, ProgressBar, KpiCard, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { extractPdfText } from '../utils/pdfExtractor'
import { globalStore, useGlobalDocuments } from '../store'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const categories = [
  { key: 'All', ar: 'الكل', count: 11440 },
  { key: 'Policies', ar: 'السياسات', count: 1180 },
  { key: 'Regulations', ar: 'الأنظمة واللوائح', count: 3120 },
  { key: 'Environmental Studies', ar: 'الدراسات البيئية', count: 1840 },
  { key: 'Legal Documents', ar: 'الوثائق القانونية', count: 1470 },
  { key: 'SOPs', ar: 'إجراءات التشغيل', count: 1080 },
  { key: 'Circulars', ar: 'التعاميم', count: 940 },
  { key: 'Technical Manuals', ar: 'الأدلة الفنية', count: 980 },
  { key: 'Historical Documents', ar: 'الوثائق التاريخية', count: 830 },
]

type Doc = {
  name: string; nameEn: string; type: string; cat: string; lang: string
  pages: number; ver: string; versions: number; status: 'indexed' | 'processing' | 'ocr'
  tags: string[]; updated: string; linked: number; pct?: number; content?: string
}

const initialDocs: Doc[] = [
  { name: 'اللائحة التنفيذية لنظام البيئة — الإصدار الرابع', nameEn: 'Executive Regulation of Environmental Law — 4th Ed.', type: 'PDF', cat: 'Regulations', lang: 'AR', pages: 214, ver: 'v4.0', versions: 4, status: 'indexed', tags: ['نظام البيئة', 'ترخيص', 'انبعاثات'], updated: '2 days ago', linked: 18 },
  { name: 'EIA Study — Red Sea Coastal Development Project', nameEn: '', type: 'PDF', cat: 'Environmental Studies', lang: 'AR/EN', pages: 612, ver: 'v1.2', versions: 2, status: 'processing', tags: ['EIA', 'Coastal', 'Marine'], updated: '3 hours ago', linked: 7, pct: 72 },
  { name: 'سياسة إدارة النفايات الخطرة', nameEn: 'Hazardous Waste Management Policy', type: 'DOCX', cat: 'Policies', lang: 'AR', pages: 48, ver: 'v2.1', versions: 5, status: 'indexed', tags: ['نفايات', 'مواد خطرة'], updated: '1 week ago', linked: 12 },
  { name: 'Air Quality Monitoring Data — Q2 2026', nameEn: '', type: 'XLSX', cat: 'Technical Manuals', lang: 'EN', pages: 12, ver: 'v1.0', versions: 1, status: 'indexed', tags: ['Air Quality', 'Monitoring'], updated: '4 days ago', linked: 5 },
  { name: 'تعميم رقم 45/2026 — تحديث اشتراطات التصاريح', nameEn: 'Circular 45/2026 — Permit Requirements Update', type: 'PDF', cat: 'Circulars', lang: 'AR', pages: 6, ver: 'v1.0', versions: 1, status: 'indexed', tags: ['تصاريح', 'تعميم'], updated: '1 day ago', linked: 9 },
  { name: 'SOP — Environmental Inspection Field Protocol', nameEn: '', type: 'DOCX', cat: 'SOPs', lang: 'EN', pages: 34, ver: 'v3.3', versions: 8, status: 'indexed', tags: ['Inspection', 'Field Work'], updated: '2 weeks ago', linked: 14 },
  { name: 'دراسة الأثر البيئي — مشروع مصفاة الجبيل', nameEn: 'EIA — Jubail Refinery Expansion', type: 'PDF', cat: 'Environmental Studies', lang: 'AR', pages: 547, ver: 'v1.0', versions: 1, status: 'ocr', tags: ['EIA', 'صناعي', 'الجبيل'], updated: '5 hours ago', linked: 3, pct: 64 },
  { name: 'الوثائق التاريخية — أرشيف قرارات 2015-2020', nameEn: 'Historical Archive — Decisions 2015-2020', type: 'PDF', cat: 'Historical Documents', lang: 'AR', pages: 1240, ver: 'v1.0', versions: 1, status: 'indexed', tags: ['أرشيف', 'قرارات'], updated: '1 month ago', linked: 31 },
]

const typeIcon = (t: string) => t === 'XLSX' ? FileSpreadsheet : t === 'DOCX' ? File : FileText
const typeColor = (t: string) => t === 'XLSX' ? 'text-emerald-600' : t === 'DOCX' ? 'text-sky-600' : 'text-rose-500'

const getTags = (tags: any, cat?: string) => {
  if (Array.isArray(tags) && tags.length > 0) return tags
  if (typeof tags === 'string' && tags.trim().length > 0) return tags.split(',').map((t) => t.trim()).filter(Boolean)
  if (cat) return [cat]
  return ['General']
}

export default function KnowledgeBase() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const [cat, setCat] = useState('All')
  const [docList, setDocList] = useState<Doc[]>(initialDocs)
  const globalDocs = useGlobalDocuments()
  
  const combinedDocs = useMemo(() => {
    const dbDocs: Doc[] = globalDocs.map(d => ({
      name: d.name,
      nameEn: '',
      type: 'PDF',
      cat: d.category || 'Policies',
      lang: isAr ? 'AR' : 'EN',
      pages: Math.max(1, Math.ceil((d.content?.length || 100) / 1000)),
      ver: 'v1.0',
      versions: 1,
      status: 'indexed',
      tags: d.tags || [],
      updated: 'now',
      linked: 0,
      content: d.content
    }))

    const dbNames = new Set(dbDocs.map(d => d.name))
    const uniqueLocal = docList.filter(d => !dbNames.has(d.name))
    
    return [...dbDocs, ...uniqueLocal]
  }, [globalDocs, docList, isAr])

  const filtered = cat === 'All' ? combinedDocs : combinedDocs.filter((d) => d.cat === cat)
  const canUpload = role.perms.upload

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extractedData, setExtractedData] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  
  // Tagging State
  const [taggingFile, setTaggingFile] = useState<{ file: File, text: string } | null>(null)
  const [draftCat, setDraftCat] = useState('Policies')
  const [draftTags, setDraftTags] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsExtracting(true)
    try {
      if (file.type === 'application/pdf') {
        const text = await extractPdfText(file)
        setExtractedData(text)
        setTaggingFile({ file, text })
      } else {
        setExtractedData(`File uploaded: ${file.name}. \nNote: Content extraction is optimized for PDF files.`)
        // Fallback for non-pdf
        uploadMock(file.name)
      }
    } catch (err) {
      console.error(err)
      setExtractedData('Error extracting text from document.')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSaveDocument = () => {
    if (!taggingFile) return
    const tagsArray = draftTags.split(',').map(t => t.trim()).filter(Boolean)
    
    globalStore.addDocument({
      name: taggingFile.file.name,
      content: taggingFile.text,
      category: draftCat,
      tags: tagsArray
    })
    
    uploadMock(taggingFile.file.name, draftCat, tagsArray)
    setTaggingFile(null)
    setDraftCat('Policies')
    setDraftTags('')
  }

  const uploadMock = (uploadedName?: string, cat?: string, tags?: string[]) => {
    if (!canUpload) return
    const name = uploadedName || (isAr ? `وثيقة جديدة — ${new Date().toLocaleTimeString()}` : `New Document — ${new Date().toLocaleTimeString()}`)
    const doc: Doc = {
      name, nameEn: '', type: 'PDF', cat: cat || 'Policies', lang: 'AR', pages: 96, ver: 'v1.0',
      versions: 1, status: 'processing', tags: tags && tags.length > 0 ? tags : (isAr ? ['جديد'] : ['new']), updated: 'now', linked: 0, pct: 12,
    }
    setCat('All')
    setDocList((l) => [doc, ...l])
    setTimeout(() => setDocList((l) => l.map((d) => (d.name === name ? { ...d, pct: 58 } : d))), 1200)
    setTimeout(() => setDocList((l) => l.map((d) => (d.name === name ? { ...d, status: 'indexed', pct: undefined, linked: 2 } : d))), 2600)
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'قاعدة المعرفة المركزية' : 'Central Knowledge Base'}
        subtitle={isAr
          ? 'فهرسة تلقائية، استخراج البيانات الوصفية، إدارة الإصدارات، وربط الوثائق ذات الصلة'
          : 'Automatic indexing, metadata extraction, tagging, version management and related-document linking'}
        actions={
          <>
            <Button variant="outline" size="sm"><Filter size={14} /> {isAr ? 'تصفية' : 'Filters'}</Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={!canUpload || isExtracting} title={canUpload ? undefined : t('requiresPermission')}>
              {isExtracting ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {isAr ? 'رفع وثائق' : 'Upload Documents'}
            </Button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx" />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={FileText} label={isAr ? 'وثائق مفهرسة' : 'Indexed Documents'} value="11,393" accent="emerald" delta="+312" deltaUp
          trend={[10850, 10930, 11020, 11110, 11205, 11298, 11393]} trendLabels={weeks} />
        <KpiCard icon={Loader2} label={isAr ? 'قيد المعالجة' : 'Processing'} value="47" accent="amber"
          trend={[88, 76, 69, 61, 54, 49, 47]} trendLabels={weeks} />
        <KpiCard icon={Tags} label={isAr ? 'وسوم مستخرجة' : 'Extracted Tags'} value="8,204" accent="sky"
          trend={[7310, 7480, 7620, 7790, 7940, 8080, 8204]} trendLabels={weeks} />
        <KpiCard icon={Network} label={isAr ? 'روابط معرفية' : 'Knowledge Links'} value="26.1K" accent="violet" hint={isAr ? 'الرسم البياني المعرفي — مرحلة قادمة' : 'Knowledge graph — future phase'}
          trend={[21.4, 22.2, 23.0, 23.9, 24.7, 25.4, 26.1]} trendLabels={weeks} unit="K" />
      </div>

      {/* Upload zone */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={!canUpload || isExtracting}
        title={canUpload ? undefined : t('requiresPermission')}
        className={`card w-full border-dashed border-2 border-slate-300 transition-colors p-6 mb-5 text-center group ${
          canUpload && !isExtracting ? 'hover:border-brand-600/60 cursor-pointer' : 'opacity-50 cursor-not-allowed'
        }`}
      >
        <UploadCloud size={28} className="mx-auto text-slate-400 group-hover:text-brand-600 transition-colors" />
        <p className="text-sm text-slate-600 mt-2 font-medium">
          {isAr ? 'اسحب وأفلت الملفات هنا — PDF, Word, Excel, صور ممسوحة ضوئياً' : 'Drag & drop files — PDF, Word, Excel, scanned images'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {canUpload
            ? (isAr ? 'فهرسة تلقائية + استخراج بيانات وصفية + تعرف ضوئي عربي' : 'Auto-indexing + metadata extraction + Arabic OCR applied on ingest')
            : `${role.id} — ${t('requiresPermission')}`}
        </p>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Categories */}
        <Card title={isAr ? 'التصنيفات' : 'Categories'} className="h-fit">
          <div className="space-y-1">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  cat === c.key ? 'bg-brand-600/10 text-brand-700 border border-brand-600/30' : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2"><FolderTree size={13} /> {isAr ? c.ar : c.key}</span>
                <span className="text-slate-400">{c.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Document list */}
        <div className="lg:col-span-3 space-y-3">
          {filtered.map((d) => {
            const Icon = typeIcon(d.type)
            return (
              <div 
                key={d.name} 
                className="card card-hover p-4 flex flex-wrap items-center gap-4 cursor-pointer"
                onClick={() => {
                  if (d.content) setExtractedData(d.content)
                  else setExtractedData(isAr ? 'لا يوجد نص مستخرج لهذه الوثيقة (وثيقة تجريبية).' : 'No extracted text available for this document (mock document).')
                }}
              >
                <div className={`p-2.5 rounded-lg bg-slate-50 border border-slate-200 ${typeColor(d.type)}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <p className="text-sm font-semibold text-slate-900 leading-snug" dir="auto">{d.name}</p>
                  {d.nameEn && <p className="text-[11px] text-slate-400">{d.nameEn}</p>}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {getTags(d.tags, d.cat).map((tag: string) => (
                      <Badge key={tag} tone="slate">#{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-5 text-xs text-slate-500">
                  <div className="text-center">
                    <p className="font-semibold text-slate-700">{d.pages.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{isAr ? 'صفحات' : 'pages'}</p>
                  </div>
                  <Badge tone="sky">{d.lang}</Badge>
                  {d.status === 'indexed' && <Badge tone="emerald"><CheckCircle2 size={11} /> {isAr ? 'مفهرس' : 'Indexed'}</Badge>}
                  {d.status === 'processing' && <Badge tone="amber"><Loader2 size={11} className="animate-spin" /> {isAr ? 'يعالج' : 'Processing'}</Badge>}
                  {d.status === 'ocr' && <Badge tone="violet"><Loader2 size={11} className="animate-spin" /> OCR</Badge>}
                </div>
                {d.status !== 'indexed' && (
                  <div className="w-full"><ProgressBar value={d.pct ?? 50} tone={d.status === 'ocr' ? 'violet' : 'amber'} /></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Modal
        open={!!extractedData}
        onClose={() => setExtractedData(null)}
        title={isAr ? 'البيانات المستخرجة' : 'Extracted Data'}
        subtitle={isAr ? 'البيانات النصية المستخرجة من المستند المرفوع' : 'Text data extracted from the uploaded document'}
      >
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs text-slate-700">
          {extractedData}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setExtractedData(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
        </div>
      </Modal>

      {/* Manual Tagging Modal */}
      <Modal
        open={taggingFile !== null}
        onClose={() => setTaggingFile(null)}
        title={isAr ? 'تصنيف وإضافة وسوم للوثيقة' : 'Categorize & Tag Document'}
        subtitle={taggingFile?.file.name}
        maxW="max-w-md"
      >
        <div className="space-y-4 my-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'الفئة' : 'Category'}</label>
            <select 
              value={draftCat} 
              onChange={(e) => setDraftCat(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              dir="auto"
            >
              {categories.filter(c => c.key !== 'All').map(c => (
                <option key={c.key} value={c.key}>{isAr ? c.ar : c.key}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'الوسوم (مفصولة بفاصلة)' : 'Tags (comma separated)'}</label>
            <input 
              type="text" 
              placeholder={isAr ? 'مثال: تقرير, 2026, عاجل' : 'e.g. report, 2026, urgent'}
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
              dir="auto"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setTaggingFile(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={handleSaveDocument}>{isAr ? 'حفظ الوثيقة' : 'Save Document'}</Button>
        </div>
      </Modal>
    </div>
  )
}
