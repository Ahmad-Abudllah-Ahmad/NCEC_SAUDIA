import { useState } from 'react'
import { Sparkles, ThumbsUp, ThumbsDown, RotateCcw, Quote, UserCheck, Loader2 } from 'lucide-react'
import { PageHeader, Badge, Button, KpiCard, ConfidenceRing } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

type Rec = {
  id: string
  subject: string
  subjectAr: string
  decision: 'approve' | 'reject' | 'revise'
  confidence: number
  reasoning: string
  reasoningAr: string
  refs: { doc: string; page: number }[]
  status: 'pending' | 'accepted' | 'overridden' | 'reanalyzing'
}

const initialRecs: Rec[] = [
  {
    id: 'REC-2026-0812',
    subject: 'Environmental permit — Yanbu Desalination Plant expansion',
    subjectAr: 'تصريح بيئي — توسعة محطة تحلية ينبع',
    decision: 'approve',
    confidence: 91,
    reasoning: 'EIA study is complete (all 11 mandatory sections), impacts within regulatory thresholds, mitigation plan aligned with BAT guidance, and operator compliance history is clean over 5 years.',
    reasoningAr: 'دراسة الأثر البيئي مكتملة (١١ قسماً إلزامياً)، والآثار ضمن الحدود النظامية، وخطة التخفيف متوافقة مع أفضل التقنيات، وسجل التزام المشغل نظيف لخمس سنوات.',
    refs: [
      { doc: 'EIA-2026-0298 — Yanbu Desalination', page: 214 },
      { doc: 'Executive Regulation — Art. 14', page: 47 },
      { doc: 'Compliance History Report OP-4471', page: 3 },
    ],
    status: 'pending',
  },
  {
    id: 'REC-2026-0807',
    subject: 'EIA acceptance — Red Sea Coastal Development',
    subjectAr: 'قبول دراسة الأثر — تطوير ساحل البحر الأحمر',
    decision: 'revise',
    confidence: 82,
    reasoning: 'Three mandatory sections missing (EMP, Emergency Response, Decommissioning). Marine ecology assessment is strong, but brine discharge modeling exceeds salinity limits in Water Quality Standard §4.3.',
    reasoningAr: 'ثلاثة أقسام إلزامية مفقودة (خطة الإدارة البيئية، الطوارئ، إنهاء التشغيل). تقييم البيئة البحرية قوي، لكن نمذجة تصريف المحلول الملحي تتجاوز حدود الملوحة.',
    refs: [
      { doc: 'EIA-2026-0341 — Red Sea', page: 298 },
      { doc: 'Water Quality Standard §4.3', page: 22 },
    ],
    status: 'accepted',
  },
  {
    id: 'REC-2026-0799',
    subject: 'License renewal — unaccredited waste transport operator',
    subjectAr: 'تجديد ترخيص — ناقل نفايات غير معتمد',
    decision: 'reject',
    confidence: 96,
    reasoning: 'Operator accreditation expired 14 months ago; two unresolved second-degree violations; no corrective action plan submitted despite formal notice per Article 32.',
    reasoningAr: 'انتهى اعتماد المشغل قبل ١٤ شهراً؛ مخالفتان من الدرجة الثانية دون معالجة؛ لم تقدم خطة تصحيحية رغم الإنذار الرسمي وفق المادة ٣٢.',
    refs: [
      { doc: 'Violation Register VR-2025-118', page: 7 },
      { doc: 'Environmental Law — Art. 32', page: 41 },
    ],
    status: 'pending',
  },
]

const decisionTone = { approve: 'emerald', reject: 'rose', revise: 'amber' } as const

export default function Recommendations() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canApprove = role.perms.approve
  const [recs, setRecs] = useState<Rec[]>(initialRecs)

  const overriddenCount = 10 + recs.filter((r) => r.status === 'overridden').length

  const label = (d: Rec['decision']) =>
    d === 'approve' ? (isAr ? 'توصية بالموافقة' : 'Recommend Approval')
    : d === 'reject' ? (isAr ? 'توصية بالرفض' : 'Recommend Rejection')
    : (isAr ? 'توصية بالتعديل' : 'Recommend Revision')

  const setStatus = (id: string, status: Rec['status']) =>
    setRecs((r) => r.map((x) => (x.id === id ? { ...x, status } : x)))

  const accept = (id: string) => { if (canApprove) setStatus(id, 'accepted') }
  const override = (id: string) => { if (canApprove) setStatus(id, 'overridden') }
  const reanalyze = (id: string) => {
    setStatus(id, 'reanalyzing')
    setTimeout(() => {
      setRecs((r) => r.map((x) => (x.id === id ? { ...x, status: 'pending', confidence: Math.min(99, x.confidence + 2) } : x)))
    }, 1400)
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'محرك التوصيات' : 'Recommendation Engine'}
        subtitle={isAr
          ? 'الذكاء الاصطناعي لا يتخذ القرار النهائي — يوصي ويشرح الأسباب مع درجة الثقة والمراجع، والقرار يبقى للإنسان'
          : 'AI never makes the final decision — it recommends, explains its reasoning with confidence scores and references; humans decide'}
        actions={<Badge tone="gold"><UserCheck size={11} /> {isAr ? 'الإنسان في حلقة القرار' : 'Human-in-the-loop'}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={Sparkles} label={isAr ? 'توصيات هذا الشهر' : 'Recommendations This Month'} value="94" accent="emerald"
          trend={[61, 66, 72, 78, 83, 89, 94]} trendLabels={weeks} />
        <KpiCard icon={ThumbsUp} label={isAr ? 'نسبة قبول التوصيات' : 'Acceptance Rate'} value="89%" accent="sky" hint={isAr ? 'من قبل المراجعين' : 'by human reviewers'}
          trend={[82, 83, 85, 86, 87, 88, 89]} trendLabels={weeks} unit="%" />
        <KpiCard icon={RotateCcw} label={isAr ? 'توصيات معدّلة' : 'Overridden'} value={String(overriddenCount)} accent="amber" hint={isAr ? 'تغذية راجعة للنموذج' : 'fed back as RLHF signal'}
          trend={[16, 15, 14, 13, 12, 11, 10]} trendLabels={weeks} />
        <KpiCard icon={UserCheck} label={isAr ? 'متوسط الثقة' : 'Avg. Confidence'} value="88%" accent="violet"
          trend={[83, 84, 85, 86, 87, 87, 88]} trendLabels={weeks} unit="%" />
      </div>

      {!canApprove && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {role.id} — {isAr ? 'دورك الحالي يمكنه الاطلاع على التوصيات دون اعتمادها أو تجاوزها.' : 'Your current role can view recommendations but cannot accept or override them.'}
        </div>
      )}

      <div className="space-y-4">
        {recs.map((r) => (
          <div key={r.id} className="card card-hover p-4">
            <div className="flex flex-wrap items-start gap-4">
              <ConfidenceRing value={r.confidence} size={64} />
              <div className="flex-1 min-w-[260px]">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-400">{r.id}</span>
                  <Badge tone={decisionTone[r.decision]}>{label(r.decision)}</Badge>
                  {r.status === 'accepted' && <Badge tone="sky">{isAr ? 'اعتمدها المراجع' : 'Accepted by reviewer'}</Badge>}
                  {r.status === 'overridden' && <Badge tone="rose">{isAr ? 'تم التجاوز — سُجلت كملاحظة تدريب' : 'Overridden — logged as RLHF feedback'}</Badge>}
                  {r.status === 'reanalyzing' && <Badge tone="amber"><Loader2 size={10} className="animate-spin" /> {isAr ? 'يعاد التحليل…' : 'Re-analyzing…'}</Badge>}
                </div>
                <p className="text-sm font-bold text-slate-900" dir="auto">{isAr ? r.subjectAr : r.subject}</p>
                <p className="text-xs text-slate-500 leading-relaxed mt-1.5" dir="auto">
                  <span className="text-slate-400 font-semibold">{isAr ? 'التعليل: ' : 'Reasoning: '}</span>
                  {isAr ? r.reasoningAr : r.reasoning}
                </p>
                <div className="space-y-1 mt-2.5">
                  {r.refs.map((ref) => (
                    <div key={ref.doc} className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Quote size={10} className="text-amber-600" /> {ref.doc} · {isAr ? 'ص' : 'p.'}{ref.page}
                    </div>
                  ))}
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Button size="sm" onClick={() => accept(r.id)} disabled={!canApprove} title={canApprove ? undefined : t('requiresPermission')}>
                    <ThumbsUp size={13} /> {isAr ? 'اعتماد التوصية' : 'Accept'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => reanalyze(r.id)}>
                    <RotateCcw size={13} /> {isAr ? 'طلب إعادة تحليل' : 'Re-analyze'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => override(r.id)} disabled={!canApprove} title={canApprove ? undefined : t('requiresPermission')}>
                    <ThumbsDown size={13} /> {isAr ? 'تجاوز التوصية' : 'Override'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
