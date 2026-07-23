import { useState, useRef } from 'react'
import {
  Leaf, UploadCloud, AlertTriangle, CheckCircle2, XCircle, FileWarning,
  FileCheck2, Download, Scale, ListChecks, Gauge, Loader2
} from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { PageHeader, Card, Badge, Button, ProgressBar, ConfidenceRing, KpiCard, chartTooltip, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { downloadWord, downloadPdf } from '../utils/docExport'
import { extractPdfText } from '../utils/pdfExtractor'
import { globalStore } from '../store'


const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const sections = [
  { name: 'Project Description', ar: 'وصف المشروع', status: 'complete', pages: '12–58' },
  { name: 'Baseline Environment', ar: 'البيئة الأساسية', status: 'complete', pages: '59–184' },
  { name: 'Impact Assessment — Marine Ecology', ar: 'تقييم الأثر — البيئة البحرية', status: 'complete', pages: '185–298' },
  { name: 'Impact Assessment — Air Quality', ar: 'تقييم الأثر — جودة الهواء', status: 'partial', pages: '299–342' },
  { name: 'Mitigation Measures', ar: 'إجراءات التخفيف', status: 'complete', pages: '343–421' },
  { name: 'Environmental Management Plan', ar: 'خطة الإدارة البيئية', status: 'missing', pages: '—' },
  { name: 'Emergency Response Plan', ar: 'خطة الاستجابة للطوارئ', status: 'missing', pages: '—' },
  { name: 'Public Consultation Records', ar: 'سجلات المشاورات العامة', status: 'partial', pages: '422–437' },
  { name: 'Decommissioning Plan', ar: 'خطة إنهاء التشغيل', status: 'missing', pages: '—' },
]

const risks = [
  { risk: 'Coral reef degradation from dredging operations', ar: 'تدهور الشعاب المرجانية بسبب أعمال التجريف', severity: 'high', reg: 'Marine Env. Reg. Art. 22' },
  { risk: 'Brine discharge salinity exceeds 10% above ambient limit', ar: 'ملوحة تصريف المحلول الملحي تتجاوز الحد المسموح', severity: 'high', reg: 'Water Quality Std. §4.3' },
  { risk: 'Construction noise near turtle nesting sites (Apr–Jul)', ar: 'ضوضاء الإنشاءات قرب مواقع تعشيش السلاحف', severity: 'medium', reg: 'Biodiversity Reg. Art. 9' },
  { risk: 'PM10 modeling uses outdated meteorological dataset (2019)', ar: 'نمذجة الجسيمات تستخدم بيانات أرصاد قديمة', severity: 'medium', reg: 'Air Quality Reg. Annex 2' },
  { risk: 'Groundwater monitoring wells density below standard', ar: 'كثافة آبار مراقبة المياه الجوفية أقل من المعيار', severity: 'low', reg: 'Groundwater Prot. §7' },
]

const radar = [
  { axis: 'Completeness', ar: 'الاكتمال', v: 71 },
  { axis: 'Reg. Compliance', ar: 'الالتزام', v: 64 },
  { axis: 'Data Quality', ar: 'جودة البيانات', v: 78 },
  { axis: 'Methodology', ar: 'المنهجية', v: 85 },
  { axis: 'Mitigation', ar: 'التخفيف', v: 69 },
  { axis: 'Monitoring', ar: 'الرصد', v: 52 },
]

type Study = { name: string; pages: number; status: 'reviewed' | 'analyzing' | 'queued'; rec: string | null }

const initialStudies: Study[] = [
  { name: 'Red Sea Coastal Development', pages: 612, status: 'reviewed', rec: 'revision' },
  { name: 'Jubail Refinery Expansion', pages: 547, status: 'analyzing', rec: null },
  { name: 'NEOM Desalination Plant Phase 2', pages: 738, status: 'queued', rec: null },
  { name: 'Riyadh Cement Factory Upgrade', pages: 402, status: 'reviewed', rec: 'approve' },
]

export default function EnvStudies() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const [pipeline, setPipeline] = useState<Study[]>(initialStudies)
  const [toast, setToast] = useState<string | null>(null)
  const canUpload = role.perms.upload

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extractedData, setExtractedData] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsExtracting(true)
    try {
      if (file.type === 'application/pdf') {
        const text = await extractPdfText(file)
        setExtractedData(text)
        globalStore.addDocument({ name: file.name, content: text })
      } else {
        setExtractedData(`File uploaded: ${file.name}. \nNote: Content extraction is optimized for PDF files.`)
      }
      uploadStudy(file.name)
    } catch (err) {
      console.error(err)
      setExtractedData('Error extracting text from document.')
    } finally {
      setIsExtracting(false)
    }
  }

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const uploadStudy = (uploadedName?: string) => {
    if (!canUpload) return
    const name = uploadedName || (isAr ? 'دراسة جديدة — بانتظار التحليل' : 'New EIA Upload — Pending Analysis')
    setPipeline((p) => [...p, { name, pages: 524, status: 'queued', rec: null }])
    notify(isAr ? 'تمت إضافة الدراسة إلى قائمة التحليل' : 'Study added to analysis queue')
  }

  const exportExecutiveSummary = () => {
    downloadPdf(
      isAr ? 'الملخص التنفيذي — دراسة مشروع تطوير ساحل البحر الأحمر' : 'Executive Summary — Red Sea Coastal Development Study',
      'NCEC-ES-03',
      'Executive Summary',
    )
    notify(isAr ? 'تم إنشاء الملخص التنفيذي' : 'Executive summary generated')
  }

  const exportReviewReport = () => {
    downloadWord(
      isAr ? 'تقرير المراجعة — دراسة مشروع تطوير ساحل البحر الأحمر' : 'Review Report — Red Sea Coastal Development Study',
      'NCEC-RR-01',
      'Review Report',
    )
    notify(isAr ? 'تم إنشاء تقرير المراجعة' : 'Review report generated')
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'تحليل الدراسات البيئية' : 'Environmental Study Analysis'}
        subtitle={isAr
          ? 'قراءة كاملة لدراسات الأثر البيئي (+500 صفحة)، استخراج الأقسام، تحديد النواقص والمخاطر، والمقارنة مع الأنظمة'
          : 'Full AI reading of EIA studies (500+ pages) — section extraction, gap detection, risk highlighting, regulation comparison'}
        actions={
          <>
            {toast && <Badge tone="emerald"><CheckCircle2 size={11} /> {toast}</Badge>}
            <Button variant="outline" size="sm" onClick={() => notify(isAr ? 'تم تنزيل تقرير المراجعة' : 'Review report downloaded')}><Download size={14} /> {isAr ? 'تقرير المراجعة' : 'Review Report'}</Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={!canUpload || isExtracting} title={canUpload ? undefined : t('requiresPermission')}>
              {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {isAr ? 'رفع دراسة' : 'Upload Study'}
            </Button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.doc,.docx" />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={Leaf} label={isAr ? 'دراسات محللة' : 'Studies Analyzed'} value="148" accent="emerald" delta="+11" deltaUp
          trend={[98, 110, 118, 126, 134, 141, 148]} trendLabels={weeks} />
        <KpiCard icon={FileWarning} label={isAr ? 'متوسط النواقص لكل دراسة' : 'Avg. Gaps per Study'} value="4.2" accent="amber"
          trend={[5.8, 5.5, 5.1, 4.9, 4.6, 4.4, 4.2]} trendLabels={weeks} />
        <KpiCard icon={Gauge} label={isAr ? 'متوسط زمن التحليل' : 'Avg. Analysis Time'} value="18 min" accent="sky" hint={isAr ? 'مقابل 3 أسابيع يدوياً' : 'vs. ~3 weeks manual'}
          trend={[42, 36, 31, 27, 24, 21, 18]} trendLabels={weeks} unit=" min" />
        <KpiCard icon={Scale} label={isAr ? 'أنظمة مرجعية' : 'Regulations Checked'} value="42" accent="violet"
          trend={[30, 32, 34, 36, 38, 40, 42]} trendLabels={weeks} />
      </div>

      {/* Active study analysis */}
      <div className="card p-4 mb-4 border-emerald-300/70">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600"><Leaf size={22} /></div>
          <div className="flex-1 min-w-[240px]">
            <p className="text-base font-bold text-slate-900">EIA — Red Sea Coastal Development Project</p>
            <p className="text-xs text-slate-500">612 {isAr ? 'صفحة' : 'pages'} · {isAr ? 'عربي/إنجليزي' : 'AR/EN'} · EIA-2026-0341 · {isAr ? 'اكتمل التحليل الكامل' : 'Full read complete'} — 14:32 min</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <ConfidenceRing value={82} />
              <p className="text-[10px] text-slate-400 mt-1">{isAr ? 'ثقة التوصية' : 'Rec. confidence'}</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-amber-50 border border-amber-300">
              <p className="text-xs text-amber-700 font-bold uppercase tracking-wide">{isAr ? 'التوصية: إعادة للتعديل' : 'Recommend: Revision'}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{isAr ? '3 أقسام إلزامية ناقصة' : '3 mandatory sections missing'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Section extraction */}
          <Card title={isAr ? 'الأقسام المستخرجة' : 'Extracted Sections'} subtitle={isAr ? 'فحص الاكتمال مقابل المتطلبات' : 'Completeness check vs. requirements'}>
            <div className="space-y-1.5 max-h-[290px] overflow-y-auto pe-1">
              {sections.map((s) => (
                <div key={s.name} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2 text-xs">
                  {s.status === 'complete' && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                  {s.status === 'partial' && <AlertTriangle size={14} className="text-amber-600 shrink-0" />}
                  {s.status === 'missing' && <XCircle size={14} className="text-rose-500 shrink-0" />}
                  <span className="text-slate-700 flex-1 truncate">{isAr ? s.ar : s.name}</span>
                  <span className="text-slate-400 text-[10px] whitespace-nowrap">{isAr ? 'ص' : 'pp.'} {s.pages}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-600" /> 5 {isAr ? 'مكتمل' : 'complete'}</span>
              <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-amber-600" /> 2 {isAr ? 'جزئي' : 'partial'}</span>
              <span className="flex items-center gap-1"><XCircle size={10} className="text-rose-500" /> 3 {isAr ? 'مفقود' : 'missing'}</span>
            </div>
          </Card>

          {/* Risks */}
          <Card title={isAr ? 'المخاطر المحددة' : 'Highlighted Risks'} subtitle={isAr ? 'مقارنة مع الأنظمة المرجعية' : 'Compared against regulations'}>
            <div className="space-y-2 max-h-[290px] overflow-y-auto pe-1">
              {risks.map((r, i) => (
                <div key={i} className={`rounded-lg border p-2.5 text-xs ${
                  r.severity === 'high' ? 'border-rose-200 bg-rose-50/70' : r.severity === 'medium' ? 'border-amber-200 bg-amber-50/70' : 'border-sky-200 bg-sky-50/70'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={r.severity === 'high' ? 'rose' : r.severity === 'medium' ? 'amber' : 'sky'}>{r.severity}</Badge>
                    <span className="text-[10px] text-slate-500">{r.reg}</span>
                  </div>
                  <p className="text-slate-600 leading-snug" dir="auto">{isAr ? r.ar : r.risk}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Quality radar */}
          <Card title={isAr ? 'تقييم جودة الدراسة' : 'Study Quality Assessment'} subtitle={isAr ? 'ست ركائز للمراجعة' : 'Six review pillars'}>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={radar.map(r => ({ ...r, label: isAr ? r.ar : r.axis }))}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar dataKey="v" stroke="#059669" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={chartTooltip} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex gap-2 mt-1">
              <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={exportExecutiveSummary}><ListChecks size={13} /> {isAr ? 'الملخص التنفيذي' : 'Executive Summary'}</Button>
              <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={exportReviewReport}><FileCheck2 size={13} /> {isAr ? 'تقرير المراجعة' : 'Review Report'}</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Studies pipeline */}
      <Card title={isAr ? 'قائمة الدراسات' : 'Study Pipeline'} subtitle={isAr ? 'حالة التحليل لكل دراسة' : 'Analysis status per study'}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {pipeline.map((s, i) => (
            <div key={`${s.name}-${i}`} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900 leading-snug" dir="auto">{s.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.pages} {isAr ? 'صفحة' : 'pages'}</p>
              <div className="mt-2.5 flex items-center gap-2">
                {s.status === 'reviewed' && <Badge tone="emerald">{isAr ? 'تمت المراجعة' : 'Reviewed'}</Badge>}
                {s.status === 'analyzing' && <Badge tone="amber">{isAr ? 'قيد التحليل' : 'Analyzing'}</Badge>}
                {s.status === 'queued' && <Badge tone="slate">{isAr ? 'في الانتظار' : 'Queued'}</Badge>}
                {s.rec === 'approve' && <Badge tone="emerald">{isAr ? 'توصية: موافقة' : 'Rec: Approve'}</Badge>}
                {s.rec === 'revision' && <Badge tone="amber">{isAr ? 'توصية: تعديل' : 'Rec: Revision'}</Badge>}
              </div>
              {s.status === 'analyzing' && <div className="mt-2.5"><ProgressBar value={58} tone="amber" /></div>}
            </div>
          ))}
        </div>
      </Card>

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
