import { useState } from 'react'
import {
  FilePlus2, FileText, Wand2, LayoutTemplate, CheckCircle2,
  Download, RefreshCcw, Landmark, ClipboardList, FileBarChart2,
  FileCheck2, StickyNote, BookOpen, X,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { downloadWord, downloadPdf } from '../utils/docExport'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const docTypes = [
  {
    icon: Landmark, en: 'Regulation', ar: 'لائحة / نظام',
    template: 'NCEC-REG-01',
    labelEn: 'Official Regulation Draft',
    labelAr: 'مسودة لائحة رسمية',
    placeholderEn: 'Draft regulation for industrial emissions monitoring requirements',
    placeholderAr: 'مسودة لائحة لمتطلبات رصد الانبعاثات الصناعية',
  },
  {
    icon: BookOpen, en: 'Policy', ar: 'سياسة',
    template: 'NCEC-POL-02',
    labelEn: 'Official Policy',
    labelAr: 'سياسة رسمية',
    placeholderEn: 'Policy for hazardous waste storage and handling',
    placeholderAr: 'سياسة تخزين ومناولة النفايات الخطرة',
  },
  {
    icon: ClipboardList, en: 'Procedure', ar: 'إجراء',
    template: 'NCEC-PR-04',
    labelEn: 'Standard Procedure',
    labelAr: 'إجراء معياري',
    placeholderEn: 'Procedure for environmental permit review workflow',
    placeholderAr: 'إجراء سير عمل مراجعة التصاريح البيئية',
  },
  {
    icon: FileBarChart2, en: 'Technical Report', ar: 'تقرير فني',
    template: 'NCEC-TR-01',
    labelEn: 'Technical Assessment Report',
    labelAr: 'تقرير تقييم فني',
    placeholderEn: 'Technical report on coastal air quality monitoring results',
    placeholderAr: 'تقرير فني عن نتائج رصد جودة الهواء الساحلية',
  },
  {
    icon: FileText, en: 'Advisory Report', ar: 'تقرير استشاري',
    template: 'NCEC-AR-01',
    labelEn: 'Advisory Report',
    labelAr: 'تقرير استشاري',
    placeholderEn: 'Advisory report on coastal zoning impacts',
    placeholderAr: 'تقرير استشاري عن آثار التقسيم الساحلي',
  },
  {
    icon: StickyNote, en: 'Executive Summary', ar: 'ملخص تنفيذي',
    template: 'NCEC-ES-03',
    labelEn: 'Executive Summary',
    labelAr: 'ملخص تنفيذي',
    placeholderEn: 'Executive summary for Red Sea EIA review',
    placeholderAr: 'ملخص تنفيذي لمراجعة دراسة البحر الأحمر',
  },
  {
    icon: FileCheck2, en: 'Review Report', ar: 'تقرير مراجعة',
    template: 'NCEC-RR-01',
    labelEn: 'Document Review Report',
    labelAr: 'تقرير مراجعة وثيقة',
    placeholderEn: 'Review report for hazardous waste policy v2.2',
    placeholderAr: 'تقرير مراجعة لسياسة النفايات الخطرة 2.2',
  },
  {
    icon: CheckCircle2, en: 'Compliance Report', ar: 'تقرير التزام',
    template: 'NCEC-CR-02',
    labelEn: 'Compliance Report',
    labelAr: 'تقرير التزام',
    placeholderEn: 'Quarterly compliance report for cement sector',
    placeholderAr: 'تقرير الالتزام الربعي لقطاع الأسمنت',
  },
  {
    icon: Wand2, en: 'Decision Memo', ar: 'مذكرة قرار',
    template: 'NCEC-DM-01',
    labelEn: 'Official Decision Memo',
    labelAr: 'مذكرة قرار رسمية',
    placeholderEn: 'Decision memo for Yanbu desalination environmental permit application',
    placeholderAr: 'مذكرة قرار بشأن طلب التصريح البيئي لمشروع تحلية ينبع',
  },
]

type GenDoc = { name: string; type: string; template: string; status: 'ready' | 'generating' | 'review'; time: string }

const initialDocs: GenDoc[] = [
  { name: 'مذكرة قرار — طلب تصريح منشأة تحلية ينبع', type: 'Decision Memo', template: 'NCEC-DM-01', status: 'ready', time: '25 min ago' },
  { name: 'Executive Summary — Red Sea EIA Review', type: 'Executive Summary', template: 'NCEC-ES-03', status: 'ready', time: '2 hours ago' },
  { name: 'تقرير الالتزام الربعي — قطاع الأسمنت', type: 'Compliance Report', template: 'NCEC-CR-02', status: 'generating', time: 'now' },
  { name: 'Advisory Report — Coastal Zoning Impacts', type: 'Advisory Report', template: 'NCEC-AR-01', status: 'review', time: '1 day ago' },
]

// Knowledge-base sources available as grounding references
const refPool = [
  { en: 'EIA-2026-0341 — Red Sea', ar: 'دراسة الأثر EIA-2026-0341 — البحر الأحمر' },
  { en: 'Executive Reg. Art. 14', ar: 'اللائحة التنفيذية م/١٤' },
  { en: 'Review Report RV-2210', ar: 'تقرير المراجعة RV-2210' },
  { en: 'Environmental Law (M/165)', ar: 'نظام البيئة (م/١٦٥)' },
  { en: 'Hazardous Materials Regulation', ar: 'لائحة المواد الخطرة' },
  { en: 'Circular 45/2026', ar: 'تعميم ٤٥/٢٠٢٦' },
  { en: 'NCEC Drafting Standard v3', ar: 'معيار الصياغة المعتمد ٣' },
]

export default function DocGeneration() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canGenerate = role.perms.generate
  const [selected, setSelected] = useState(0)
  const [subject, setSubject] = useState('')
  const [recent, setRecent] = useState<GenDoc[]>(initialDocs)
  const [refs, setRefs] = useState<number[]>([0, 1, 2])
  const [addOpen, setAddOpen] = useState(false)
  const availableRefs = refPool.map((_, i) => i).filter((i) => !refs.includes(i))
  const selectedType = docTypes[selected]

  const generate = () => {
    if (!canGenerate) return
    const name = subject.trim() || (isAr ? selectedType.placeholderAr : selectedType.placeholderEn)
    const doc: GenDoc = { name, type: selectedType.en, template: selectedType.template, status: 'generating', time: 'now' }
    setRecent((r) => [doc, ...r])
    setSubject('')
    setTimeout(() => {
      setRecent((r) => r.map((d) => (d === doc || (d.name === name && d.status === 'generating') ? { ...d, status: 'ready' } : d)))
    }, 1800)
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'إنشاء الوثائق' : 'Document Generation'}
        subtitle={isAr
          ? 'توليد الأنظمة والسياسات والتقارير والمذكرات — مع الحفاظ على القوالب والتنسيقات المعتمدة'
          : 'Generate regulations, policies, reports and memos — preserving NCEC templates and approved formatting'}
        actions={<Badge tone="violet"><LayoutTemplate size={11} /> 14 {isAr ? 'قالب معتمد' : 'approved templates'}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={FilePlus2} label={isAr ? 'وثائق مولدة هذا الشهر' : 'Generated This Month'} value="186" accent="emerald" delta="+24%" deltaUp
          trend={[102, 118, 131, 142, 158, 171, 186]} trendLabels={weeks} />
        <KpiCard icon={LayoutTemplate} label={isAr ? 'الالتزام بالقالب' : 'Template Fidelity'} value="99.4%" accent="violet"
          trend={[98.1, 98.4, 98.7, 98.9, 99.1, 99.3, 99.4]} trendLabels={weeks} unit="%" />
        <KpiCard icon={RefreshCcw} label={isAr ? 'متوسط دورات التنقيح' : 'Avg. Revision Cycles'} value="1.8" accent="sky"
          trend={[2.6, 2.5, 2.3, 2.2, 2.0, 1.9, 1.8]} trendLabels={weeks} />
        <KpiCard icon={CheckCircle2} label={isAr ? 'معدل قبول المسودات' : 'Draft Acceptance Rate'} value="91%" accent="emerald"
          trend={[84, 85, 87, 88, 89, 90, 91]} trendLabels={weeks} unit="%" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Generator */}
        <Card className="xl:col-span-2" title={isAr ? 'مولّد الوثائق' : 'Document Generator'} subtitle={isAr ? 'اختر النوع، حدد المدخلات، والذكاء يصيغ وفق القالب المعتمد' : 'Pick a type, define inputs — AI drafts using the approved template'}>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 xl:grid-cols-3 2xl:grid-cols-9 gap-2 mb-4">
            {docTypes.map((d, i) => (
              <button key={d.en} onClick={() => setSelected(i)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors cursor-pointer ${
                  selected === i ? 'border-brand-600/60 bg-brand-600/10 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                }`}>
                <d.icon size={17} />
                <span className="text-[10px] font-medium leading-tight">{isAr ? d.ar : d.en}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الموضوع / نطاق الوثيقة' : 'Subject / document scope'}</label>
              <input dir="auto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-600/60"
                placeholder={isAr ? selectedType.placeholderAr : selectedType.placeholderEn} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'القالب' : 'Template'}</label>
                <select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none">
                  {docTypes.map((d, i) => (
                    <option key={d.template} value={i}>{d.template} — {isAr ? d.labelAr : d.labelEn}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'اللغة' : 'Language'}</label>
                <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none">
                  <option>{isAr ? 'العربية (رسمية)' : 'Arabic (formal)'}</option>
                  <option>{isAr ? 'الإنجليزية' : 'English'}</option>
                  <option>{isAr ? 'ثنائية اللغة' : 'Bilingual'}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الوثائق المرجعية (تُستخدم كمصادر للصياغة)' : 'Reference documents (grounding sources)'}</label>
              <div className="space-y-1.5">
                {refs.map((ri) => (
                  <div key={ri} className="flex items-center gap-2 text-[11px] text-slate-600" dir="auto">
                    <span className="flex-1">{isAr ? refPool[ri].ar : refPool[ri].en}</span>
                    <button
                      type="button"
                      onClick={() => setRefs((r) => r.filter((x) => x !== ri))}
                      title={isAr ? 'إزالة المصدر' : 'Remove source'}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700 cursor-pointer transition-colors text-start"
                >
                  + {isAr ? 'إضافة' : 'Add'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                {refs.length} {isAr ? 'مصادر ستُستخدم لتأريض الصياغة بالاقتباسات' : 'sources will ground the draft with citations'}
              </p>

              <Modal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                title={isAr ? 'إضافة وثائق مرجعية' : 'Add Reference Documents'}
                subtitle={isAr ? 'اختر مصادر من قاعدة المعرفة لتأريض الصياغة' : 'Select knowledge-base sources to ground the draft'}
                maxW="max-w-md"
              >
                {availableRefs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    {isAr ? 'أضيفت جميع المصادر المتاحة' : 'All available sources have been added'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {availableRefs.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setRefs((r) => [...r, i]); setAddOpen(false) }}
                        className="w-full text-start text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg px-3 py-2.5 cursor-pointer flex items-center gap-2.5 transition-colors border border-transparent hover:border-emerald-200"
                        dir="auto"
                      >
                        <FileText size={14} className="text-emerald-600 shrink-0" />
                        {isAr ? refPool[i].ar : refPool[i].en}
                      </button>
                    ))}
                  </div>
                )}
              </Modal>
            </div>
            <Button className="w-full justify-center" onClick={generate} disabled={!canGenerate} title={canGenerate ? undefined : t('requiresPermission')}>
              <Wand2 size={15} /> {isAr ? 'توليد المسودة' : 'Generate Draft'}
            </Button>
            {!canGenerate && (
              <p className="text-[11px] text-rose-500 text-center">{role.id} · {t('requiresPermission')}</p>
            )}
          </div>
        </Card>

        {/* Recent generated */}
        <Card title={isAr ? 'وثائق حديثة' : 'Recently Generated'} subtitle={isAr ? 'بتنسيق القوالب الأصلية' : 'In original template formatting'}>
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pe-1">
            {recent.map((d, i) => (
              <div key={`${d.name}-${i}`} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-800 leading-snug" dir="auto">{d.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge tone="violet">{d.template}</Badge>
                  {d.status === 'ready' && <Badge tone="emerald">{isAr ? 'جاهز' : 'Ready'}</Badge>}
                  {d.status === 'generating' && <Badge tone="amber">{isAr ? 'يولّد الآن' : 'Generating'}</Badge>}
                  {d.status === 'review' && <Badge tone="sky">{isAr ? 'قيد المراجعة' : 'In review'}</Badge>}
                  <span className="text-[10px] text-slate-400 ms-auto">{d.time}</span>
                </div>
                {d.status === 'ready' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); downloadWord(d.name, d.template, d.type) }}
                      title={isAr ? 'تنزيل ملف Word' : 'Download Word file'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 transition-colors cursor-pointer"
                    >
                      <Download size={11} /> DOCX
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); downloadPdf(d.name, d.template, d.type) }}
                      title={isAr ? 'فتح نسخة الطباعة ثم حفظ كـ PDF' : 'Open print view, then Save as PDF'}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 transition-colors cursor-pointer"
                    >
                      <Download size={11} /> PDF
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
