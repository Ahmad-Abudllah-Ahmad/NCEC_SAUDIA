import { useState } from 'react'
import {
  Scale, GitCompareArrows, AlertOctagon, PenLine, Layers,
  ArrowRight, Lightbulb, FileDiff, CheckCircle2, Wand2,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const initialConflicts = [
  {
    severity: 'high',
    a: {
      doc: 'Air Quality Procedure v3.2', ar: 'إجراء جودة الهواء ٣٫٢', clause: '§7.2', level: 4,
      text: 'Ambient monitoring reports shall be submitted quarterly.', textAr: 'تقدم تقارير الرصد المحيطي كل ربع سنة.',
      before: 'The operator shall install continuous ambient monitoring stations at the boundaries approved in the environmental permit.',
      beforeAr: 'يلتزم المشغل بتركيب محطات رصد محيطي مستمر عند الحدود المعتمدة في التصريح البيئي.',
      after: 'Reports shall follow the templates published by the Center and include calibration certificates.',
      afterAr: 'تُعد التقارير وفق النماذج المعتمدة من المركز وتشمل شهادات معايرة الأجهزة.',
    },
    b: {
      doc: 'Executive Regulation 45/2025', ar: 'اللائحة التنفيذية ٤٥/٢٠٢٥', clause: 'Art. 14', level: 2,
      text: 'Category 1 facilities must submit monitoring reports monthly.', textAr: 'تلتزم منشآت الفئة الأولى بتقارير رصد شهرية.',
      before: 'Facilities are classified into three categories according to the magnitude of expected environmental impact.',
      beforeAr: 'تصنف المنشآت إلى ثلاث فئات وفق حجم الأثر البيئي المتوقع.',
      after: 'Failure to submit within the prescribed period exposes the facility to the penalties in Chapter 9.',
      afterAr: 'يعرض التأخر في الرفع خلال المدة المحددة المنشأة للعقوبات الواردة في الباب التاسع.',
    },
    note: 'Reporting frequency contradiction for Category 1 facilities.',
    noteAr: 'تعارض في دورية رفع التقارير لمنشآت الفئة الأولى.',
    harmonized: 'Category 1 facilities shall submit monitoring reports monthly; all other categories quarterly, in line with Executive Regulation 45/2025 Art. 14.',
    harmonizedAr: 'تلتزم منشآت الفئة الأولى بتقارير رصد شهرية، وسائر الفئات كل ربع سنة، اتساقاً مع اللائحة التنفيذية ٤٥/٢٠٢٥ م١٤.',
    showSuggestion: false,
    resolved: false,
  },
  {
    severity: 'medium',
    a: {
      doc: 'Waste Management Policy v2.1', ar: 'سياسة إدارة النفايات ٢٫١', clause: '§3.4', level: 3,
      text: 'Hazardous waste storage permitted up to 90 days on-site.', textAr: 'يسمح بتخزين النفايات الخطرة حتى ٩٠ يوماً.',
      before: 'Hazardous waste shall be stored in labelled, sealed containers within designated bunded areas.',
      beforeAr: 'تخزن النفايات الخطرة في حاويات موسومة ومحكمة داخل مناطق محاطة مخصصة.',
      after: 'A waste manifest shall accompany every transfer to a licensed treatment facility.',
      afterAr: 'يرافق بيان النفايات كل عملية نقل إلى مرفق معالجة مرخص.',
    },
    b: {
      doc: 'Hazardous Materials Regulation', ar: 'لائحة المواد الخطرة', clause: 'Art. 22', level: 2,
      text: 'On-site storage shall not exceed 60 days without renewal.', textAr: 'لا يتجاوز التخزين في الموقع ٦٠ يوماً دون تجديد.',
      before: 'Storage of hazardous materials requires prior notification to the Center with an approved safety data sheet.',
      beforeAr: 'يتطلب تخزين المواد الخطرة إشعاراً مسبقاً للمركز مع صحيفة بيانات سلامة معتمدة.',
      after: 'Renewal requests shall be submitted no later than ten business days before expiry.',
      afterAr: 'تقدم طلبات التجديد قبل انتهاء المدة بعشرة أيام عمل على الأقل.',
    },
    note: 'Storage duration limits are inconsistent.',
    noteAr: 'حدود مدة التخزين غير متسقة.',
    harmonized: 'On-site hazardous waste storage shall not exceed sixty (60) days unless renewed by the Center, superseding the 90-day allowance.',
    harmonizedAr: 'لا يتجاوز تخزين النفايات الخطرة في الموقع ستين (٦٠) يوماً ما لم يجدد من المركز، بما يلغي مدة التسعين يوماً.',
    showSuggestion: false,
    resolved: false,
  },
]

const hierarchy = [
  { level: 1, name: 'Environmental Law (Royal Decree M/165)', ar: 'نظام البيئة (مرسوم ملكي م/١٦٥)', docs: 1 },
  { level: 2, name: 'Executive Regulations', ar: 'اللوائح التنفيذية', docs: 14 },
  { level: 3, name: 'Policies & Standards', ar: 'السياسات والمعايير', docs: 86 },
  { level: 4, name: 'Procedures & SOPs', ar: 'الإجراءات وأدلة التشغيل', docs: 231 },
  { level: 5, name: 'Circulars & Decisions', ar: 'التعاميم والقرارات', docs: 412 },
]

type Draft = { title: string; ar: string; stage: string; stageAr: string; pct: number; refs: number }

const initialDrafting: Draft[] = [
  { title: 'Draft: Plastic Waste Reduction Regulation', ar: 'مسودة: لائحة الحد من النفايات البلاستيكية', stage: 'AI draft v2 — under legal review', stageAr: 'مسودة ذكية ٢ — قيد المراجعة القانونية', pct: 68, refs: 12 },
  { title: 'Draft: Environmental Auditor Accreditation Procedure', ar: 'مسودة: إجراء اعتماد المدقق البيئي', stage: 'Improvement suggestions applied', stageAr: 'تم تطبيق مقترحات التحسين', pct: 84, refs: 8 },
  { title: 'Draft: Noise Pollution Control Policy Update', ar: 'مسودة: تحديث سياسة مكافحة الضوضاء', stage: 'Gathering reference clauses', stageAr: 'جمع البنود المرجعية', pct: 31, refs: 19 },
]

const initialSuggestions = [
  { text: 'Regulation 45/2025 Art. 9 lacks a defined penalty escalation matrix — 4 comparable GCC regulations include one.', ar: 'المادة ٩ من اللائحة ٤٥/٢٠٢٥ تفتقر لمصفوفة تصعيد العقوبات.', drafted: false },
  { text: 'Procedure ENV-P-112 references repealed Circular 12/2019; update to Circular 45/2026.', ar: 'الإجراء ENV-P-112 يشير إلى تعميم ملغى؛ يجب التحديث.', drafted: false },
  { text: 'Definitions of "sensitive coastal zone" differ across 3 documents; recommend unified glossary clause.', ar: 'تعريف "المنطقة الساحلية الحساسة" يختلف بين ٣ وثائق.', drafted: false },
]

export default function RegulatoryAI() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canGenerate = role.perms.generate
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [drafting, setDrafting] = useState<Draft[]>(initialDrafting)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [compareIdx, setCompareIdx] = useState<number | null>(null)

  const newDraft = () => {
    if (!canGenerate) return
    setDrafting((d) => [
      { title: 'Draft: New Regulation — Untitled', ar: 'مسودة: لائحة جديدة — بدون عنوان', stage: 'Gathering reference clauses', stageAr: 'جمع البنود المرجعية', pct: 5, refs: 0 },
      ...d,
    ])
  }

  const toggleSuggestion = (i: number) =>
    setConflicts((c) => c.map((x, j) => (j === i ? { ...x, showSuggestion: !x.showSuggestion } : x)))

  const applyHarmonized = (i: number) => {
    if (!canGenerate) return
    setConflicts((c) => c.map((x, j) => (j === i ? { ...x, resolved: true, showSuggestion: false } : x)))
  }

  const draftFix = (i: number) => {
    if (!canGenerate) return
    setSuggestions((s) => s.map((x, j) => (j === i ? { ...x, drafted: true } : x)))
    setDrafting((d) => [
      { title: `Draft fix: ${suggestions[i].text.slice(0, 48)}…`, ar: `مسودة تصحيح: ${suggestions[i].ar.slice(0, 40)}…`, stage: 'AI drafting in progress', stageAr: 'الصياغة الذكية جارية', pct: 12, refs: 3 },
      ...d,
    ])
  }

  const activeConflicts = conflicts.filter((c) => !c.resolved).length
  const cc = compareIdx !== null ? conflicts[compareIdx] : null
  const levelOf = (lvl: number) => hierarchy.find((h) => h.level === lvl)
  const prevailing = cc ? (cc.a.level < cc.b.level ? cc.a : cc.b) : null
  const amended = cc ? (cc.a.level < cc.b.level ? cc.b : cc.a) : null

  return (
    <div>
      <PageHeader
        title={isAr ? 'الذكاء التنظيمي والقانوني' : 'Regulatory & Legal AI'}
        subtitle={isAr
          ? 'قراءة الأنظمة والسياسات والإجراءات، فهم التسلسل التشريعي، كشف التعارضات، واقتراح وصياغة التحسينات'
          : 'Reads regulations, policies and procedures — understands hierarchy, detects conflicts, suggests improvements, drafts new instruments'}
        actions={
          <Button size="sm" onClick={newDraft} disabled={!canGenerate} title={canGenerate ? undefined : t('requiresPermission')}>
            <PenLine size={14} /> {isAr ? 'صياغة جديدة' : 'New Draft'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={Scale} label={isAr ? 'وثائق تنظيمية' : 'Regulatory Instruments'} value="744" accent="emerald"
          trend={[690, 698, 707, 716, 724, 735, 744]} trendLabels={weeks} />
        <KpiCard icon={AlertOctagon} label={isAr ? 'تعارضات مكتشفة' : 'Conflicts Detected'} value={String(15 + activeConflicts)} accent="rose" delta="-5" deltaUp hint={isAr ? 'هذا الربع' : 'this quarter'}
          trend={[29, 27, 24, 22, 20, 18, 17]} trendLabels={weeks} />
        <KpiCard icon={Lightbulb} label={isAr ? 'مقترحات تحسين' : 'Improvement Suggestions'} value="63" accent="amber"
          trend={[38, 42, 47, 51, 55, 59, 63]} trendLabels={weeks} />
        <KpiCard icon={PenLine} label={isAr ? 'مسودات جارية' : 'Drafts In Progress'} value={String(drafting.length + 6)} accent="violet"
          trend={[4, 5, 5, 6, 7, 8, 9]} trendLabels={weeks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Conflict detection */}
        <Card
          className="xl:col-span-2"
          title={isAr ? 'كشف التعارضات بين الوثائق' : 'Cross-Document Conflict Detection'}
          subtitle={isAr ? 'مقارنة آلية للبنود عبر التسلسل التشريعي' : 'Automated clause comparison across the legislative hierarchy'}
          actions={<Badge tone="rose"><AlertOctagon size={11} /> {activeConflicts} {isAr ? 'نشطة' : 'active'}</Badge>}
        >
          <div className="space-y-4">
            {conflicts.map((c, i) => (
              <div key={i} className={`rounded-xl border p-3 ${
                c.resolved ? 'border-emerald-200 bg-emerald-50/60'
                : c.severity === 'high' ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60'
              }`}>
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  {c.resolved
                    ? <Badge tone="emerald"><CheckCircle2 size={10} /> {isAr ? 'تمت صياغة الحل' : 'RESOLUTION DRAFTED'}</Badge>
                    : <Badge tone={c.severity === 'high' ? 'rose' : 'amber'}>{c.severity === 'high' ? (isAr ? 'تعارض عالي' : 'HIGH CONFLICT') : (isAr ? 'تعارض متوسط' : 'MEDIUM CONFLICT')}</Badge>}
                  <span className="text-xs text-slate-500">{isAr ? c.noteAr : c.note}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 relative">
                  {[c.a, c.b].map((side, j) => (
                    <div key={j} className="rounded-lg bg-white border border-slate-200 p-3">
                      <p className="text-[11px] font-semibold text-sky-700 mb-1">{isAr ? side.ar : side.doc} · <span className="text-amber-600">{side.clause}</span></p>
                      <p className="text-xs text-slate-600 italic leading-relaxed" dir="auto">"{isAr ? side.textAr : side.text}"</p>
                    </div>
                  ))}
                  <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
                    <span className={`bg-white border border-slate-300 rounded-full p-1.5 shadow-sm ${c.resolved ? 'text-emerald-600' : 'text-rose-500'}`}><GitCompareArrows size={14} /></span>
                  </div>
                </div>
                {c.showSuggestion && !c.resolved && (
                  <div className="mt-2.5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
                    <Wand2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-900 leading-relaxed flex-1" dir="auto">{isAr ? c.harmonizedAr : c.harmonized}</p>
                    <Button size="sm" onClick={() => applyHarmonized(i)} disabled={!canGenerate} title={canGenerate ? undefined : t('requiresPermission')}>
                      {isAr ? 'اعتماد الصياغة' : 'Apply'}
                    </Button>
                  </div>
                )}
                {!c.resolved && (
                  <div className="flex gap-2 mt-2.5">
                    <Button variant="outline" size="sm" onClick={() => setCompareIdx(i)}><FileDiff size={12} /> {isAr ? 'عرض المقارنة الكاملة' : 'Full comparison'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleSuggestion(i)}>
                      {isAr ? 'اقتراح صياغة موحدة' : 'Suggest harmonized wording'} <ArrowRight size={12} className="rtl:rotate-180" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Hierarchy */}
        <Card title={isAr ? 'التسلسل التشريعي' : 'Document Hierarchy'} subtitle={isAr ? 'الذكاء الاصطناعي يفهم مستويات الإلزام' : 'AI understands precedence levels'}>
          <div className="space-y-2">
            {hierarchy.map((h) => (
              <div key={h.level} className="flex items-center gap-3" style={{ paddingInlineStart: (h.level - 1) * 12 }}>
                <div className="flex items-center gap-2.5 flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <span className="w-6 h-6 rounded-md bg-brand-600/10 border border-brand-600/30 text-brand-700 text-[11px] font-bold flex items-center justify-center shrink-0">{h.level}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{isAr ? h.ar : h.name}</p>
                    <p className="text-[10px] text-slate-400">{h.docs} {isAr ? 'وثيقة' : h.docs === 1 ? 'document' : 'documents'}</p>
                  </div>
                  <Layers size={13} className="ms-auto text-slate-300" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            {isAr
              ? 'عند كشف تعارض، تُرجح الوثيقة الأعلى في التسلسل ويُقترح تعديل الأدنى.'
              : 'When a conflict is detected, the higher instrument prevails and amendments are proposed to the lower one.'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Drafting pipeline */}
        <Card title={isAr ? 'صياغة الأنظمة والسياسات' : 'Regulation & Policy Drafting'} subtitle={isAr ? 'مسودات مولدة بالذكاء مع مراجع' : 'AI-generated drafts grounded in reference clauses'}>
          <div className="space-y-3">
            {drafting.map((d, i) => (
              <div key={`${d.title}-${i}`} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900" dir="auto">{isAr ? d.ar : d.title}</p>
                  <Badge tone="violet">{d.refs} {isAr ? 'مرجع' : 'refs'}</Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{isAr ? d.stageAr : d.stage}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold">{d.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Suggestions */}
        <Card title={isAr ? 'مقترحات التحسين' : 'Improvement Suggestions'} subtitle={isAr ? 'ثغرات وإحالات قديمة وتعريفات غير موحدة' : 'Gaps, stale references, inconsistent definitions'}>
          <div className="space-y-2.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <Lightbulb size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed flex-1" dir="auto">{isAr ? s.ar : s.text}</p>
                {s.drafted
                  ? <Badge tone="emerald"><CheckCircle2 size={10} /> {isAr ? 'أضيفت للمسودات' : 'Added to drafts'}</Badge>
                  : <Button variant="outline" size="sm" onClick={() => draftFix(i)} disabled={!canGenerate} title={canGenerate ? undefined : t('requiresPermission')}>{isAr ? 'صياغة' : 'Draft fix'}</Button>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Full clause comparison */}
      <Modal
        open={cc !== null}
        onClose={() => setCompareIdx(null)}
        title={isAr ? 'المقارنة الكاملة للبنود' : 'Full Clause Comparison'}
        subtitle={cc ? (isAr ? cc.noteAr : cc.note) : undefined}
        maxW="max-w-4xl"
      >
        {cc && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge tone={cc.severity === 'high' ? 'rose' : 'amber'}>
                <AlertOctagon size={10} /> {cc.severity === 'high' ? (isAr ? 'تعارض عالي' : 'HIGH CONFLICT') : (isAr ? 'تعارض متوسط' : 'MEDIUM CONFLICT')}
              </Badge>
              <Badge tone="sky"><GitCompareArrows size={10} /> {isAr ? 'مقارنة آلية للبنود' : 'Automated clause diff'}</Badge>
              <Badge tone="slate">{isAr ? 'الثقة' : 'Confidence'} 97%</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[cc.a, cc.b].map((side, j) => {
                const lv = levelOf(side.level)
                return (
                  <div key={j} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-sky-700 truncate" dir="auto">{isAr ? side.ar : side.doc}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge tone="amber">{side.clause}</Badge>
                        <Badge tone="violet"><Layers size={9} /> L{side.level}</Badge>
                      </div>
                    </div>
                    <div className="p-4" dir="auto">
                      <p className="text-[10px] text-slate-400 mb-2">{lv ? (isAr ? lv.ar : lv.name) : ''}</p>
                      <p className="text-xs text-slate-400 leading-relaxed">{isAr ? side.beforeAr : side.before}</p>
                      <div className={`my-2.5 rounded-lg px-3 py-2.5 border-s-4 ${
                        cc.severity === 'high' ? 'bg-rose-50 border-rose-400' : 'bg-amber-50 border-amber-400'
                      }`}>
                        <p className="text-sm text-slate-800 leading-relaxed font-medium">"{isAr ? side.textAr : side.text}"</p>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{isAr ? side.afterAr : side.after}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {prevailing && amended && (
              <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-3 flex items-start gap-2.5">
                <Scale size={14} className="text-sky-600 mt-0.5 shrink-0" />
                <p className="text-xs text-sky-900 leading-relaxed" dir="auto">
                  {isAr
                    ? `وفق التسلسل التشريعي، تَرجُح «${prevailing.ar}» (المستوى ${prevailing.level}) على «${amended.ar}» (المستوى ${amended.level})؛ ويُقترح تعديل البند الأدنى ليتسق معها.`
                    : `Per the legislative hierarchy, “${prevailing.doc}” (Level ${prevailing.level}) prevails over “${amended.doc}” (Level ${amended.level}); the lower instrument should be amended to align.`}
                </p>
              </div>
            )}

            <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-[11px] font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                <Wand2 size={12} /> {isAr ? 'الصياغة الموحدة المقترحة' : 'Suggested harmonized wording'}
              </p>
              <p className="text-xs text-emerald-900 leading-relaxed" dir="auto">{isAr ? cc.harmonizedAr : cc.harmonized}</p>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-[11px] text-slate-400">
                {isAr ? 'اكتُشف عبر المقارنة الدلالية للبنود عبر 744 وثيقة تنظيمية' : 'Detected via semantic clause comparison across 744 regulatory instruments'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCompareIdx(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
                {!cc.resolved && (
                  <Button size="sm" disabled={!canGenerate} title={canGenerate ? undefined : t('requiresPermission')}
                    onClick={() => { if (compareIdx !== null) { applyHarmonized(compareIdx); setCompareIdx(null) } }}>
                    <CheckCircle2 size={13} /> {isAr ? 'اعتماد الصياغة الموحدة' : 'Apply harmonized wording'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
