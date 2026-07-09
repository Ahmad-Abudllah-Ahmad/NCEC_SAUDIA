import { useState } from 'react'
import {
  ScanText, UploadCloud, FileImage, Table2, FileType2, Braces, Languages,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard, ProgressBar } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

type Job = { name: string; pages: number; lang: string; pct: number; type: string }

const initialJobs: Job[] = [
  { name: 'أرشيف التعاميم 2015-2018 (ممسوح ضوئياً)', pages: 1240, lang: 'AR', pct: 64, type: 'Scanned PDF' },
  { name: 'Inspection Field Forms — Batch 112', pages: 340, lang: 'AR/EN', pct: 91, type: 'Forms' },
  { name: 'قرارات مجلس الإدارة — صور فوتوغرافية', pages: 86, lang: 'AR', pct: 37, type: 'Images' },
  { name: 'Legacy Lab Result Tables 2019', pages: 412, lang: 'EN', pct: 100, type: 'Tables' },
]

const extraction = [
  { icon: FileType2, en: 'Text', ar: 'النصوص', v: '99.1%' },
  { icon: Table2, en: 'Tables', ar: 'الجداول', v: '96.8%' },
  { icon: Braces, en: 'Metadata', ar: 'البيانات الوصفية', v: '97.5%' },
  { icon: ScanText, en: 'Structured Fields', ar: 'الحقول المهيكلة', v: '95.2%' },
]

export default function OCRPage() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canUpload = role.perms.upload
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

  const upload = () => {
    if (!canUpload) return
    const name = isAr ? `دفعة مسح جديدة — ${new Date().toLocaleTimeString()}` : `New Scan Batch — ${new Date().toLocaleTimeString()}`
    setJobs((j) => [{ name, pages: 120, lang: 'AR', pct: 8, type: 'Scanned PDF' }, ...j])
    setTimeout(() => setJobs((j) => j.map((x) => (x.name === name ? { ...x, pct: 46 } : x))), 1200)
    setTimeout(() => setJobs((j) => j.map((x) => (x.name === name ? { ...x, pct: 83 } : x))), 2600)
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'وحدة التعرف الضوئي (OCR)' : 'OCR Module'}
        subtitle={isAr
          ? 'معالجة الوثائق العربية والإنجليزية الممسوحة ضوئياً والصور والجداول والنماذج — استخراج نصوص وجداول وبيانات مهيكلة'
          : 'Arabic & English scanned PDFs, images, tables and forms — extracts text, tables, metadata and structured information'}
        actions={
          <Button size="sm" onClick={upload} disabled={!canUpload} title={canUpload ? undefined : t('requiresPermission')}>
            <UploadCloud size={14} /> {isAr ? 'رفع للمعالجة' : 'Upload for OCR'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={ScanText} label={isAr ? 'صفحات معالجة' : 'Pages Processed'} value="482K" accent="emerald" delta="+12K" deltaUp
          trend={[412, 425, 437, 449, 461, 472, 482]} trendLabels={weeks} unit="K" />
        <KpiCard icon={Languages} label={isAr ? 'دقة العربية' : 'Arabic Accuracy'} value="98.7%" accent="sky" hint={isAr ? 'خط النسخ والرقعة والطباعة' : 'Naskh, Ruq\u2019ah & print'}
          trend={[97.2, 97.5, 97.8, 98.0, 98.3, 98.5, 98.7]} trendLabels={weeks} unit="%" />
        <KpiCard icon={Table2} label={isAr ? 'جداول مستخرجة' : 'Tables Extracted'} value="31,204" accent="violet"
          trend={[26400, 27210, 28080, 28900, 29740, 30490, 31204]} trendLabels={weeks} />
        <KpiCard icon={FileImage} label={isAr ? 'في قائمة الانتظار' : 'In Queue'} value="42" accent="amber"
          trend={[61, 57, 52, 49, 48, 45, 42]} trendLabels={weeks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* OCR preview */}
        <Card
          className="xl:col-span-2"
          title={isAr ? 'معاينة مباشرة — تعميم ممسوح ضوئياً' : 'Live Preview — Scanned Circular'}
          subtitle={isAr ? 'المصدر (صورة) مقابل النص المستخرج' : 'Source image vs. extracted text'}
          actions={<Badge tone="emerald">98.9% {isAr ? 'ثقة' : 'confidence'}</Badge>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Simulated scan */}
            <div className="rounded-lg bg-[#efe9d9] border border-[#d8cfba] p-4 min-h-[240px] relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.05] bg-[repeating-linear-gradient(0deg,#000,#000_1px,transparent_1px,transparent_4px)]" />
              <div dir="rtl" className="relative text-[#2b2a26] space-y-2" style={{ fontFamily: 'IBM Plex Sans Arabic' }}>
                <p className="text-center text-[11px] font-bold">المركز الوطني للرقابة على الالتزام البيئي</p>
                <p className="text-center text-[10px]">تعميم رقم ٤٥/٢٠٢٦</p>
                <div className="border-t border-[#2b2a26]/30 pt-2 text-[10px] leading-relaxed">
                  <p className="blur-[0.4px]">بناءً على الصلاحيات الممنوحة للمركز بموجب نظام البيئة الصادر بالمرسوم الملكي رقم م/١٦٥، وإشارةً إلى اللائحة التنفيذية للتصاريح البيئية...</p>
                  <p className="blur-[0.4px] mt-1.5">تقرر تحديث مدد دراسة طلبات التصاريح البيئية لتصبح ستين (٦٠) يوم عمل للفئة الأولى...</p>
                </div>
                <div className="mt-2 border border-[#2b2a26]/40 rounded text-[9px]">
                  <div className="grid grid-cols-3 text-center font-semibold border-b border-[#2b2a26]/40">
                    <span className="p-1">الفئة</span><span className="p-1 border-x border-[#2b2a26]/40">المدة السابقة</span><span className="p-1">المدة الجديدة</span>
                  </div>
                  <div className="grid grid-cols-3 text-center">
                    <span className="p-1">الأولى</span><span className="p-1 border-x border-[#2b2a26]/40">٩٠ يوم</span><span className="p-1">٦٠ يوم</span>
                  </div>
                </div>
              </div>
              <span className="absolute bottom-2 left-2 text-[9px] text-[#2b2a26]/60">scan_0045_2026.tiff</span>
            </div>
            {/* Extracted */}
            <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 min-h-[240px] font-mono">
              <p className="text-[10px] text-emerald-400 mb-2">// {isAr ? 'مخرجات مهيكلة' : 'structured output'}</p>
              <pre className="text-[10px] text-slate-300 whitespace-pre-wrap leading-relaxed">{`{
  "type": "circular",
  "number": "45/2026",
  "issuer": "NCEC",
  "language": "ar",
  "subject": "${isAr ? 'تحديث مدد دراسة التصاريح' : 'Permit review period update'}",
  "tables": [{
    "rows": 2, "cols": 3,
    "data": [["Cat 1", "90d", "60d"]]
  }],
  "confidence": 0.989
}`}</pre>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title={isAr ? 'دقة الاستخراج' : 'Extraction Accuracy'}>
            <div className="grid grid-cols-2 gap-2.5">
              {extraction.map((e) => (
                <div key={e.en} className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                  <e.icon size={17} className="mx-auto text-brand-600" />
                  <p className="text-base font-bold text-slate-900 mt-1.5">{e.v}</p>
                  <p className="text-[10px] text-slate-500">{isAr ? e.ar : e.en}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title={isAr ? 'مهام المعالجة' : 'Processing Jobs'}>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pe-1">
              {jobs.map((j, i) => (
                <div key={`${j.name}-${i}`}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 truncate pe-2" dir="auto">{j.name}</span>
                    <Badge tone={j.pct === 100 ? 'emerald' : 'amber'}>{j.pct}%</Badge>
                  </div>
                  <ProgressBar value={j.pct} tone={j.pct === 100 ? 'emerald' : 'amber'} />
                  <p className="text-[10px] text-slate-400 mt-1">{j.pages.toLocaleString()} {isAr ? 'صفحة' : 'pages'} · {j.type} · {j.lang}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
