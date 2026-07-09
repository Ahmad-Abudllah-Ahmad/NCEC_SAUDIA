import { useState } from 'react'
import { Search, SlidersHorizontal, FileText, Tag, Sparkles, Type, Blend, Zap, Database, Clock, ExternalLink } from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard, Modal } from '../components/ui'
import { useLang } from '../i18n'

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const modes = [
  { key: 'hybrid', icon: Blend, en: 'Hybrid', ar: 'هجين' },
  { key: 'semantic', icon: Sparkles, en: 'Semantic', ar: 'دلالي' },
  { key: 'keyword', icon: Type, en: 'Keyword', ar: 'كلمات مفتاحية' },
]

const typeFilters = [
  { key: 'Regulation', en: 'Regulations', ar: 'الأنظمة', n: 3120 },
  { key: 'Study', en: 'Studies', ar: 'الدراسات', n: 1840 },
  { key: 'Report', en: 'Reports', ar: 'التقارير', n: 2110 },
  { key: 'Policy', en: 'Policies', ar: 'السياسات', n: 1180 },
  { key: 'Procedure', en: 'Procedures', ar: 'الإجراءات', n: 1080 },
  { key: 'Document', en: 'Documents', ar: 'الوثائق', n: 2110 },
]

const tags = ['انبعاثات', 'تصاريح', 'EIA', 'نفايات خطرة', 'جودة الهواء', 'ساحلي']

const allResults = [
  {
    title: 'اللائحة التنفيذية لنظام البيئة — الفصل الرابع: التصاريح البيئية',
    titleEn: 'Executive Regulation — Chapter 4: Environmental Permits',
    type: 'Regulation', score: 98, page: 47, lang: 'AR',
    snippet: '…تلتزم المنشآت الصناعية من الفئة الأولى بتقديم دراسة تقييم الأثر البيئي كاملة قبل إصدار التصريح، ويشمل ذلك خطة الإدارة البيئية وبرنامج الرصد الذاتي…',
    snippetEn: '…Category 1 industrial facilities shall submit a complete EIA study prior to permit issuance, including the environmental management plan and self-monitoring program…',
    detail: [
      'تشترط الجهة التنظيمية على المنشآت الصناعية من الفئة الأولى تقديم دراسة تقييم أثر بيئي مكتملة قبل إصدار التصريح، على أن تتضمن وصف المشروع، خط الأساس البيئي، تقييم الآثار، خطة الإدارة البيئية، وبرنامج الرصد الذاتي.',
      'وتنص المادة كذلك على أن طلب التصريح لا يعد مكتملاً ما لم تُرفق خطة الطوارئ البيئية وآليات المتابعة الدورية والانبعاثات المرجعية ومتطلبات الإفصاح للجهة المختصة.',
      'وفي حال وجود نواقص أو ملاحظات جوهرية، يحق للمركز طلب استكمالات إضافية قبل المضي في قرار القبول أو الرفض أو الإحالة للتعديل.',
    ],
    detailEn: [
      'Category 1 industrial facilities must submit a complete Environmental Impact Assessment before permit issuance. The file must include the project description, environmental baseline, impact assessment, environmental management plan, and self-monitoring program.',
      'The article further states that the permit application is not considered complete unless it includes the environmental emergency plan, periodic monitoring mechanisms, reference emission values, and disclosure requirements for the competent authority.',
      'Where material omissions or critical observations are identified, the Center may request additional completions before proceeding with approval, rejection, or revision decisions.',
    ],
    tags: ['تصاريح', 'الفئة الأولى'],
  },
  {
    title: 'EIA — Red Sea Coastal Development · Impact Assessment: Marine Ecology',
    titleEn: '', type: 'Study', score: 94, page: 212, lang: 'AR/EN',
    snippet: '…dredging operations are projected to affect 4.2 hectares of coral habitat; mitigation via silt curtains reduces sediment dispersion by an estimated 71%…',
    detail: [
      'The marine ecology chapter identifies dredging and reclamation as the principal stressors for nearshore coral communities within the primary footprint. Baseline surveys recorded moderate live coral cover with several sensitive patches adjacent to the proposed marine works corridor.',
      'Modeling in this section estimates that dredging operations may affect approximately 4.2 hectares of coral habitat through suspended sediment deposition and short-term turbidity spikes. The study notes that deployment of double silt curtains is expected to reduce sediment dispersion by roughly 71% under average operating conditions.',
      'The assessment also recommends seasonal work restrictions during peak spawning windows, real-time turbidity monitoring at receptor points, and adaptive cessation thresholds if plume behavior exceeds predicted ranges during construction.',
    ],
    detailEn: [
      'The marine ecology chapter identifies dredging and reclamation as the principal stressors for nearshore coral communities within the primary footprint. Baseline surveys recorded moderate live coral cover with several sensitive patches adjacent to the proposed marine works corridor.',
      'Modeling in this section estimates that dredging operations may affect approximately 4.2 hectares of coral habitat through suspended sediment deposition and short-term turbidity spikes. The study notes that deployment of double silt curtains is expected to reduce sediment dispersion by roughly 71% under average operating conditions.',
      'The assessment also recommends seasonal work restrictions during peak spawning windows, real-time turbidity monitoring at receptor points, and adaptive cessation thresholds if plume behavior exceeds predicted ranges during construction.',
    ],
    snippetEn: '', tags: ['EIA', 'ساحلي'],
  },
  {
    title: 'سياسة إدارة النفايات الخطرة — متطلبات التخزين المؤقت',
    titleEn: 'Hazardous Waste Policy — Temporary Storage Requirements',
    type: 'Policy', score: 89, page: 14, lang: 'AR',
    snippet: '…لا يجوز تخزين النفايات الخطرة في الموقع لمدة تتجاوز المدة النظامية، مع اشتراط العزل الثانوي وأنظمة كشف التسرب…',
    snippetEn: '…hazardous waste shall not be stored on-site beyond the statutory period, with mandatory secondary containment and leak detection…',
    detail: [
      'تنص السياسة على أن التخزين المؤقت للنفايات الخطرة يجب أن يتم في مناطق محددة وموسومة، مع توفير احتواء ثانوي مناسب للحاويات وخطط استجابة للتسرب والانسكاب.',
      'كما تشترط وجود نظام موثق لتتبع الكميات الداخلة والخارجة، وربط كل دفعة بسجل نقل معتمد إلى مرفق معالجة أو تدوير مرخص.',
      'وتحظر السياسة تجاوز المدد النظامية المعتمدة للتخزين داخل الموقع، مع إلزام الجهة المشغلة بإشعار الإدارة المختصة في حال الحاجة إلى تمديد استثنائي أو وجود ظروف تشغيلية طارئة.',
    ],
    detailEn: [
      'The policy requires temporary hazardous waste storage to take place in designated, clearly labeled areas with appropriate secondary containment and spill-response arrangements.',
      'It also requires a documented tracking mechanism for incoming and outgoing quantities, with each batch linked to an approved transport record to a licensed treatment or recycling facility.',
      'The policy prohibits exceeding the statutory on-site storage duration and obliges the operator to notify the competent department where exceptional extension requests or emergency operating conditions arise.',
    ],
    tags: ['نفايات خطرة'],
  },
  {
    title: 'Quarterly Compliance Report — Cement Sector Q1 2026',
    titleEn: '', type: 'Report', score: 84, page: 9, lang: 'EN',
    snippet: '…stack emission audits across 14 cement facilities show 92% compliance with PM limits; two facilities entered corrective action programs…',
    detail: [
      'Quarterly stack-emission audits across 14 cement facilities indicate an overall 92% compliance rate with particulate matter limits during the reporting period, with most sites maintaining performance within their permitted operating envelopes.',
      'Two facilities exceeded the applicable PM thresholds in repeated measurements and were therefore placed under corrective action programs requiring root-cause analysis, equipment recalibration, and intensified follow-up monitoring.',
      'The report further notes that kiln maintenance scheduling, baghouse differential-pressure instability, and inconsistent housekeeping around raw-material handling areas were the most common contributing factors behind observed deviations.',
    ],
    detailEn: [
      'Quarterly stack-emission audits across 14 cement facilities indicate an overall 92% compliance rate with particulate matter limits during the reporting period, with most sites maintaining performance within their permitted operating envelopes.',
      'Two facilities exceeded the applicable PM thresholds in repeated measurements and were therefore placed under corrective action programs requiring root-cause analysis, equipment recalibration, and intensified follow-up monitoring.',
      'The report further notes that kiln maintenance scheduling, baghouse differential-pressure instability, and inconsistent housekeeping around raw-material handling areas were the most common contributing factors behind observed deviations.',
    ],
    snippetEn: '', tags: ['انبعاثات', 'جودة الهواء'],
  },
]

export default function SearchPage() {
  const { lang } = useLang()
  const isAr = lang === 'ar'
  const [mode, setMode] = useState('hybrid')
  const [query, setQuery] = useState(isAr ? 'متطلبات تخزين النفايات الخطرة' : 'hazardous waste storage requirements')
  const [applied, setApplied] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(typeFilters.map((f) => f.key)))
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const toggleType = (key: string) => {
    setActiveTypes((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const terms = applied.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
  const shown = allResults.filter((r) => {
    if (!activeTypes.has(r.type)) return false
    if (terms.length === 0) return true
    const hay = `${r.title} ${r.titleEn} ${r.snippet} ${r.snippetEn} ${r.tags.join(' ')}`.toLowerCase()
    return terms.some((tm) => hay.includes(tm))
  })

  const runSearch = () => setApplied(query)
  const searchTag = (tg: string) => { setQuery(tg); setApplied(tg) }
  const activeResult = openIdx !== null ? shown[openIdx] : null

  return (
    <div>
      <PageHeader
        title={isAr ? 'البحث المؤسسي' : 'Enterprise Search'}
        subtitle={isAr
          ? 'بحث موحد عبر الوثائق والأنظمة والدراسات والتقارير والسياسات والإجراءات — دلالي وكلمات مفتاحية وهجين'
          : 'Unified search across documents, regulations, studies, reports, policies and procedures — semantic, keyword and hybrid modes'}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={Search} label={isAr ? 'عمليات بحث اليوم' : 'Searches Today'} value="1,912" accent="emerald" delta="+14%" deltaUp
          trend={[1210, 1544, 1688, 1590, 1902, 640, 512]} trendLabels={days} />
        <KpiCard icon={Clock} label={isAr ? 'متوسط زمن الاستجابة' : 'Avg. Latency'} value="0.31s" accent="sky"
          trend={[0.44, 0.41, 0.38, 0.36, 0.34, 0.32, 0.31]} trendLabels={days} unit="s" />
        <KpiCard icon={Zap} label={isAr ? 'حصة البحث الهجين' : 'Hybrid Mode Share'} value="42%" accent="violet"
          trend={[31, 33, 35, 37, 39, 41, 42]} trendLabels={days} unit="%" />
        <KpiCard icon={Database} label={isAr ? 'وثائق مفهرسة' : 'Indexed Documents'} value="11,393" accent="amber"
          trend={[11120, 11170, 11228, 11274, 11310, 11355, 11393]} trendLabels={days} />
      </div>

      {/* Search bar */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 border border-slate-300 rounded-xl bg-white px-4 py-3 focus-within:border-brand-600/60 transition-colors">
          <Search size={18} className="text-slate-400" />
          <input
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            placeholder={isAr ? 'ابحث في كل قاعدة المعرفة…' : 'Search the entire knowledge base…'}
          />
          <Button size="sm" onClick={runSearch}>{isAr ? 'بحث' : 'Search'}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
          {modes.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mode === m.key ? 'text-brand-700 underline underline-offset-2' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <m.icon size={13} /> {isAr ? m.ar : m.en}
            </button>
          ))}
          <span className="text-[11px] text-slate-500 ms-auto flex items-center gap-1.5">
            <SlidersHorizontal size={12} /> {shown.length} {isAr ? 'نتيجة أعلى صلة في 0.31 ثانية' : 'top results in 0.31s'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters */}
        <div className="space-y-4 h-fit">
          <Card title={isAr ? 'التصنيفات' : 'Categories'}>
            <div className="space-y-1.5">
              {typeFilters.map((f) => (
                <label key={f.key} className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer hover:text-slate-900 py-0.5">
                  <input type="checkbox" checked={activeTypes.has(f.key)} onChange={() => toggleType(f.key)} className="accent-emerald-600" />
                  <span className="flex-1">{isAr ? f.ar : f.en}</span>
                  <span className="text-slate-400">{f.n.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card title={isAr ? 'الوسوم' : 'Tags'} subtitle={isAr ? 'اضغط وسماً للبحث به' : 'Click a tag to search it'}>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tg) => (
                <button key={tg} className="cursor-pointer" onClick={() => searchTag(tg)}><Badge tone="slate"><Tag size={9} /> {tg}</Badge></button>
              ))}
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-3">
          {shown.map((r, i) => (
            <div key={i} className="card card-hover p-4 cursor-pointer" onClick={() => setOpenIdx(i)}>
              <div className="flex items-start gap-3">
                <FileText size={17} className="text-rose-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug" dir="auto">{r.title}</p>
                  {r.titleEn && <p className="text-[11px] text-slate-400">{r.titleEn}</p>}
                  <p className="text-xs text-slate-500 leading-relaxed mt-1.5" dir="auto">
                    {isAr && r.snippet ? r.snippet : (r.snippetEn || r.snippet)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge tone="sky">{r.type}</Badge>
                    <Badge tone="slate">{r.lang}</Badge>
                    {r.tags.map((tg) => <Badge key={tg} tone="slate">#{tg}</Badge>)}
                    <span className="text-[10px] text-slate-400 ms-auto">{isAr ? 'صفحة' : 'page'} {r.page}</span>
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-lg font-bold text-brand-600">{r.score}</p>
                  <p className="text-[9px] text-slate-400 uppercase">{isAr ? 'صلة' : 'relevance'}</p>
                </div>
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="card p-8 text-center text-sm text-slate-500">
              {isAr ? 'لا توجد نتائج مطابقة — جرّب كلمات أخرى أو فعّل تصنيفات أكثر.' : 'No matching results — try different terms or enable more categories.'}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={activeResult !== null}
        onClose={() => setOpenIdx(null)}
        title={activeResult?.title}
        subtitle={activeResult?.titleEn || `${activeResult?.type ?? ''} · ${isAr ? 'صفحة' : 'Page'} ${activeResult?.page ?? ''}`}
        maxW="max-w-3xl"
      >
        {activeResult && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {activeResult.titleEn && (
                    <p className="text-sm font-semibold text-slate-700 mb-1">{activeResult.titleEn}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {activeResult.type} · {activeResult.lang} · {isAr ? 'صفحة' : 'Page'} {activeResult.page}
                  </p>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-2xl font-bold text-brand-600">{activeResult.score}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{isAr ? 'صلة' : 'relevance'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5" dir="auto">
              {(isAr ? activeResult.detail : activeResult.detailEn).map((paragraph, idx) => (
                <p key={idx} className="text-sm text-slate-600 leading-relaxed mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))}
              <div className="my-3 rounded-lg bg-emerald-50 border-s-4 border-emerald-400 px-4 py-3">
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {isAr && activeResult.snippet ? activeResult.snippet : (activeResult.snippetEn || activeResult.snippet)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                {isAr ? 'نتيجة قابلة للتتبع مع مرجع صفحة واضح' : 'Traceable result with explicit page reference'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpenIdx(null)}>
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
                <Button size="sm" onClick={() => setOpenIdx(null)}>
                  <ExternalLink size={12} /> {isAr ? 'فتح الوثيقة' : 'Open document'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
