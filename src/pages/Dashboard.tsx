import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Bot, Users, Search, Timer, CheckCircle2, GitBranch, Gauge,
  AlertTriangle, ArrowUpRight, Activity, Lock, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Line, ComposedChart,
  Legend, ReferenceLine,
} from 'recharts'
import { PageHeader, Badge, Button, Modal, chartTooltip } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

const aiUsage = [
  { day: 'Sun', queries: 1240, docs: 86 },
  { day: 'Mon', queries: 1890, docs: 132 },
  { day: 'Tue', queries: 2140, docs: 141 },
  { day: 'Wed', queries: 1980, docs: 118 },
  { day: 'Thu', queries: 2460, docs: 167 },
  { day: 'Fri', queries: 620, docs: 34 },
  { day: 'Sat', queries: 480, docs: 22 },
]

const accuracyTrend = [
  { week: 'W1', accuracy: 91.2, hallucination: 3.1 },
  { week: 'W2', accuracy: 92.6, hallucination: 2.6 },
  { week: 'W3', accuracy: 93.4, hallucination: 2.2 },
  { week: 'W4', accuracy: 94.1, hallucination: 1.9 },
  { week: 'W5', accuracy: 95.3, hallucination: 1.4 },
  { week: 'W6', accuracy: 96.2, hallucination: 1.1 },
]

const docTypes = [
  { name: 'Regulations', ar: 'الأنظمة واللوائح', value: 3120, color: '#10b981', pct: 27.3, recent: 48, examples: ['Executive Regulation 45/2025', 'Hazardous Materials Regulation', 'Air Quality Procedure v3.2'] },
  { name: 'Env. Studies', ar: 'الدراسات البيئية', value: 1840, color: '#0ea5e9', pct: 16.1, recent: 23, examples: ['EIA-2026-0341 — Red Sea Coastal', 'Industrial Emissions Study — Jubail', 'Coastal Zoning Impact Assessment'] },
  { name: 'Policies & SOPs', ar: 'السياسات والإجراءات', value: 2260, color: '#8b5cf6', pct: 19.8, recent: 31, examples: ['Waste Management Policy v2.1', 'Coastal Monitoring SOP', 'Lab Accreditation Procedure'] },
  { name: 'Legal Documents', ar: 'الوثائق القانونية', value: 1470, color: '#f59e0b', pct: 12.8, recent: 19, examples: ['Environmental Law (Royal Decree M/165)', 'Compliance Report CR-889', 'Legal Opinion LO-2026-112'] },
  { name: 'Technical Manuals', ar: 'الأدلة الفنية', value: 980, color: '#f43f5e', pct: 8.6, recent: 12, examples: ['Ambient Monitoring Manual v4', 'OCR Processing Guide', 'BAT Reference Manual — Emissions'] },
  { name: 'Circulars & Other', ar: 'التعاميم وغيرها', value: 1770, color: '#64748b', pct: 15.5, recent: 27, examples: ['Circular 45/2026', 'Scanned Circulars Batch #77', 'Historical Archive — 2019–2024'] },
]

const searchAnalytics = [
  { type: 'Semantic', count: 8420 },
  { type: 'Keyword', count: 5210 },
  { type: 'Hybrid', count: 9850 },
]

const deptActivity = [
  { dept: 'Environmental', ar: 'البيئية', usage: 92 },
  { dept: 'Legal Affairs', ar: 'الشؤون القانونية', usage: 84 },
  { dept: 'Licensing', ar: 'التراخيص', usage: 77 },
  { dept: 'Inspection', ar: 'التفتيش', usage: 63 },
  { dept: 'Executive Office', ar: 'المكتب التنفيذي', usage: 41 },
]

const alerts = [
  {
    id: 'alert-eia',
    level: 'critical' as const,
    time: 'Just now',
    timeAr: 'الآن',
    text: 'EIA Study #EIA-2026-0341 (612 pages) flagged: 3 missing mandatory sections vs. Environmental Regulation Art. 14.',
    textAr: 'دراسة EIA-2026-0341 (612 صفحة): 3 أقسام إلزامية مفقودة مقابل اللائحة التنفيذية م/١٤.',
    title: 'EIA Study — Missing Mandatory Sections',
    titleAr: 'دراسة الأثر — أقسام إلزامية مفقودة',
    impact: 'Licensing decision for Red Sea Coastal Development cannot proceed until Sections 4.2 (Baseline Monitoring), 7.1 (Mitigation Plan), and 9.3 (Emergency Response) are submitted.',
    impactAr: 'لا يمكن متابعة قرار الترخيص لمشروع البحر الأحمر الساحلي حتى تُقدَّم الأقسام 4.2 و7.1 و9.3.',
    analysis: 'AI cross-referenced the 612-page study against Executive Regulation Art. 14 and the EIA checklist template NCEC-EIA-01. Three mandatory sections are absent or marked "TBD". Confidence: 97%.',
    analysisAr: 'قارن الذكاء الاصطناعي الدراسة (612 صفحة) مع اللائحة التنفيذية م/14 وقالب EIA المعتمد. ثلاثة أقسام إلزامية غائبة أو مؤجلة. الثقة: 97%.',
    action: 'Open Environmental Studies module to review flagged sections and generate a compliance gap report.',
    actionAr: 'افتح وحدة الدراسات البيئية لمراجعة الأقسام المُعلَّمة وإنشاء تقرير فجوات الالتزام.',
    route: '/environmental-studies',
  },
  {
    id: 'alert-reg',
    level: 'critical' as const,
    time: '18 mins ago',
    timeAr: 'منذ 18 دقيقة',
    text: 'Regulation conflict detected: Air Quality Procedure v3.2 contradicts Executive Regulation 45/2025 §7.',
    textAr: 'تعارض تنظيمي: إجراء جودة الهواء 3.2 يتعارض مع اللائحة التنفيذية 45/2025 §7.',
    title: 'Regulation Conflict — Reporting Frequency',
    titleAr: 'تعارض تنظيمي — دورية التقارير',
    impact: 'Category 1 facilities may receive conflicting compliance instructions — quarterly vs. monthly monitoring reports.',
    impactAr: 'قد تتلقى منشآت الفئة الأولى تعليمات التزام متعارضة — تقارير ربع سنوية مقابل شهرية.',
    analysis: 'Procedure §7.2 requires quarterly ambient reports; Executive Regulation Art. 14 mandates monthly reports for Category 1. Harmonized wording has been drafted and awaits legal approval.',
    analysisAr: 'الإجراء §7.2 يفرض تقارير ربع سنوية؛ اللائحة التنفيذية م14 تفرض شهرية للفئة الأولى. صياغة موحدة جاهزة بانتظار الاعتماد القانوني.',
    action: 'Open Regulatory & Legal AI to view the full clause comparison and apply harmonized wording.',
    actionAr: 'افتح الذكاء التنظيمي والقانوني لعرض المقارنة الكاملة واعتماد الصياغة الموحدة.',
    route: '/regulatory',
  },
  {
    id: 'alert-ocr',
    level: 'warning' as const,
    time: '1 hour ago',
    timeAr: 'منذ ساعة',
    text: 'OCR queue backlog: 42 scanned Arabic documents pending, estimated clearance 35 min.',
    textAr: 'تراكم في قائمة OCR: 42 وثيقة عربية ممسوحة قيد الانتظار، التقدير 35 دقيقة.',
    title: 'OCR Queue Backlog',
    titleAr: 'تراكم قائمة التعرف الضوئي',
    impact: '42 Arabic scanned documents cannot be searched or indexed until OCR completes. Estimated delay: 35 minutes at current throughput (1.2 docs/min).',
    impactAr: '42 وثيقة عربية ممسوحة لا يمكن البحث فيها حتى اكتمال OCR. التأخير المتوقع: 35 دقيقة.',
    analysis: 'Batch #77 (Circulars) and Batch #81 (Historical permits) account for 38 of 42 pending jobs. Arabic OCR engine at 77% load — consider pausing non-urgent jobs.',
    analysisAr: 'الدفعة 77 (تعاميم) والدفعة 81 (تراخيص تاريخية) تمثل 38 من 42 مهمة. محرك OCR العربي عند 77% حمل.',
    action: 'Open OCR Module to monitor job progress and prioritize critical batches.',
    actionAr: 'افتح وحدة OCR لمراقبة التقدم وترتيب الأولويات.',
    route: '/ocr',
  },
  {
    id: 'alert-sla',
    level: 'warning' as const,
    time: '2 hours ago',
    timeAr: 'منذ ساعتين',
    text: 'Review SLA at risk: Compliance Report CR-889 awaiting Legal Team sign-off for 46 hours.',
    textAr: 'SLA المراجعة معرض للخطر: تقرير CR-889 بانتظار اعتماد الفريق القانوني منذ 46 ساعة.',
    title: 'Review SLA Breach Risk',
    titleAr: 'خطر تجاوز SLA المراجعة',
    impact: 'Compliance Report CR-889 (Q1 Cement Sector) exceeds the 48-hour review SLA by 2 hours if not signed off today.',
    impactAr: 'تقرير CR-889 (قطاع الأسمنت Q1) سيتجاوز SLA 48 ساعة خلال ساعتين إن لم يُعتمد اليوم.',
    analysis: 'Assigned to Legal Team (Mona Al-Harbi). Two minor clause queries pending resolution. Workflow stage: Legal Review (step 3 of 5).',
    analysisAr: 'مُسند إلى الفريق القانوني. استفساران بسيطان بانتظار الحل. مرحلة سير العمل: المراجعة القانونية (3 من 5).',
    action: 'Open Workflow Automation to escalate or reassign the pending review.',
    actionAr: 'افتح أتمتة سير العمل للتصعيد أو إعادة الإسناد.',
    route: '/workflows',
  },
  {
    id: 'alert-model',
    level: 'info' as const,
    time: '4 hours ago',
    timeAr: 'منذ 4 ساعات',
    text: 'Model fine-tune cycle #12 completed — Arabic legal terminology F1 improved from 0.91 to 0.94.',
    textAr: 'اكتملت دورة ضبط النموذج #12 — F1 للمصطلحات القانونية العربية تحسّن من 0.91 إلى 0.94.',
    title: 'Model Fine-Tune Cycle #12 Complete',
    titleAr: 'اكتمال دورة ضبط النموذج #12',
    impact: 'Arabic legal terminology accuracy improved by 3.3%. Expected reduction in hallucination rate for legal Q&A by ~0.4%.',
    impactAr: 'تحسّن دقة المصطلحات القانونية العربية 3.3%. انخفاض متوقع في الهلوسة للأسئلة القانونية ~0.4%.',
    analysis: 'Fine-tuned on 2,840 legal document pairs from the internal knowledge base. Deployed to Jais-30B Arabic cluster. No downtime during rollout.',
    analysisAr: 'ضُبط على 2840 زوج وثائق قانونية من قاعدة المعرفة. نُشر على عنقود Jais-30B. بدون توقف.',
    action: 'View model performance metrics in Admin & Security.',
    actionAr: 'عرض مقاييس أداء النموذج في الإدارة والأمان.',
    route: '/admin',
  },
]

const queue = [
  { name: 'EIA – Red Sea Coastal Development (612 p)', stage: 'Section extraction', pct: 72, tone: 'sky' as const },
  { name: 'Draft Waste Management Policy v2', stage: 'Compliance check', pct: 45, tone: 'violet' as const },
  { name: 'Scanned Circulars Batch #77 (Arabic)', stage: 'OCR processing', pct: 88, tone: 'emerald' as const },
  { name: 'Industrial Emissions Study – Jubail', stage: 'Risk highlighting', pct: 31, tone: 'amber' as const },
]

const monthlyAir = [
  { m: 'Jan', pm10: 78, no2: 42, forecast: null },
  { m: 'Feb', pm10: 84, no2: 45, forecast: null },
  { m: 'Mar', pm10: 112, no2: 51, forecast: null },
  { m: 'Apr', pm10: 96, no2: 47, forecast: null },
  { m: 'May', pm10: 121, no2: 55, forecast: null },
  { m: 'Jun', pm10: 134, no2: 58, forecast: 134 },
  { m: 'Jul*', pm10: null, no2: null, forecast: 141 },
  { m: 'Aug*', pm10: null, no2: null, forecast: 138 },
  { m: 'Sep*', pm10: null, no2: null, forecast: 118 },
]

const moduleKey: Record<string, string> = {
  '/': 'dashboard', '/assistant': 'docAssistant', '/legal-assistant': 'legalAssistant',
  '/search': 'search', '/data-analysis': 'dataAnalysis', '/knowledge-base': 'knowledgeBase',
  '/environmental-studies': 'envStudies', '/regulatory': 'regulatoryAI', '/generation': 'docGeneration',
  '/review': 'docReview', '/ocr': 'ocr', '/recommendations': 'recommendations',
  '/workflows': 'workflows', '/admin': 'admin',
}

export default function Dashboard() {
  const { lang, t } = useLang()
  const { role, user } = useRole()
  const navigate = useNavigate()
  const isAr = lang === 'ar'
  const p = role.perms
  const [alertIdx, setAlertIdx] = useState<number | null>(null)
  const [docTypeIdx, setDocTypeIdx] = useState(0)
  const [chartTab, setChartTab] = useState<'usage' | 'air' | 'search'>('usage')

  // Role-scoped visibility
  const isMgmt = p.admin || p.approve                                   // Super Admin, Dept. Manager
  const isInternal = p.upload || p.generate || p.approve                // NCEC staff (not consultant / read-only)
  const canReview = role.modules.includes('/review') || isMgmt
  const canWorkflows = role.modules.includes('/workflows')

  const firstName = user?.name.split(' ')[0] ?? ''
  const greeting = isAr ? `مرحباً ${firstName}` : `Welcome back, ${firstName}`
  const activeAlert = alertIdx !== null ? alerts[alertIdx] : null
  const canOpenRoute = (route: string) => role.modules.includes(route)

  const openAlert = (i: number) => setAlertIdx(i)
  const openKpi = (route: string) => {
    if (canOpenRoute(route)) navigate(route)
  }

  const goToAlertModule = (route: string) => {
    if (canOpenRoute(route)) {
      setAlertIdx(null)
      navigate(route)
    }
  }

  const accuracyPointsStr = accuracyTrend.map((t, idx) => {
    const x = (idx / (accuracyTrend.length - 1)) * 100
    const y = 18 - ((t.accuracy - 90) / 10) * 16
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <PageHeader
        title={isAr ? 'لوحة القيادة الإدارية' : 'Management Dashboard'}
        subtitle={`${greeting} — ${isAr
          ? 'عرض مخصص حسب دورك؛ كل البيانات تبقى داخل بنية المركز التحتية'
          : 'view personalized to your role; all data remains inside NCEC infrastructure'}`}
        actions={
          <>
            <Badge tone="slate"><Lock size={10} /> {role.id} · {isAr ? role.nameAr : role.name}</Badge>
            <Badge tone="emerald"><Activity size={11} /> {isAr ? 'مباشر' : 'Live'}</Badge>
            {isMgmt && <Button variant="outline" size="sm">{isAr ? 'تقرير أسبوعي' : 'Weekly Report'}</Button>}
          </>
        }
      />

      {/* Bento Grid Row 1: Core Performance & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Main Performance Panel (2/3 width) */}
        <div className="lg:col-span-8 bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between group overflow-hidden relative min-h-[220px]">
          <Activity className="absolute top-4 end-4 w-28 h-28 text-slate-100/50 dark:text-slate-200/40 pointer-events-none transition-transform duration-700 group-hover:scale-110" />
          
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 relative z-20 whitespace-nowrap truncate">
              {isAr ? 'مؤشرات الأداء الرئيسية' : 'Core Performance Indicators'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
              {/* Metric 1: Total Documents */}
              <div 
                onClick={() => openKpi('/knowledge-base')}
                className="space-y-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-100/60 p-3 rounded-2xl transition-all"
                title={isAr ? 'اتجاه الوثائق: 11,128 -> 11,200 -> 11,310 -> 11,440 (+312 هذا الأسبوع)' : 'Documents Trend: 11,128 -> 11,200 -> 11,310 -> 11,440 (+312 this week)'}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">{isAr ? 'إجمالي الوثائق' : 'Total Documents'}</span>
                  <FileText size={14} className="text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-800">11,440</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-600 flex items-center gap-0.5">+312 <ArrowUpRight size={10} /></span>
                </div>
                <div className="h-6 w-full mt-2">
                  <svg className="w-full h-full overflow-visible text-emerald-500/35 dark:text-emerald-500/35" preserveAspectRatio="none" viewBox="0 0 100 20">
                    <path d="M0 15 Q 10 5, 20 12 T 40 8 T 60 15 T 80 5 T 100 12" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>

              {/* Metric 2: AI Queries Today */}
              {p.chat && (
                <div 
                  onClick={() => openKpi('/assistant')}
                  className="space-y-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-100/60 p-3 rounded-2xl transition-all"
                  title={isAr ? 'اتجاه الاستعلامات: 1,800 -> 2,100 -> 2,250 -> 2,463 (+18% اليوم)' : 'AI Queries Trend: 1,800 -> 2,100 -> 2,250 -> 2,463 (+18% today)'}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">{isAr ? 'استعلامات الذكاء اليوم' : 'AI Queries Today'}</span>
                    <Bot size={14} className="text-sky-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-800">2,463</span>
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-600 flex items-center gap-0.5">+18% <ArrowUpRight size={10} /></span>
                  </div>
                  <div className="h-6 w-full mt-2">
                    <svg className="w-full h-full overflow-visible text-sky-500/35 dark:text-sky-500/35" preserveAspectRatio="none" viewBox="0 0 100 20">
                      <path d="M0 10 Q 15 18, 30 10 T 60 5 T 100 15" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Metric 3: Active Users */}
              {isMgmt && (
                <div 
                  onClick={() => openKpi('/admin')}
                  className="space-y-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-100/60 p-3 rounded-2xl transition-all"
                  title={isAr ? 'اتجاه النشاط: 260 -> 275 -> 280 -> 284 (+9% مستخدم)' : 'Active Users Trend: 260 -> 275 -> 280 -> 284 (+9% active)'}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase">{isAr ? 'مستخدمون نشطون' : 'Active Users'}</span>
                    <Users size={14} className="text-violet-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-800">284</span>
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-600 flex items-center gap-0.5">+9% <ArrowUpRight size={10} /></span>
                  </div>
                  <div className="h-6 w-full mt-2">
                    <svg className="w-full h-full overflow-visible text-violet-500/35 dark:text-violet-500/35" preserveAspectRatio="none" viewBox="0 0 100 20">
                      <path d="M0 5 Q 20 15, 40 5 T 70 12 T 100 8" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Operational Signals Card (1/3 width) */}
        <div className="lg:col-span-4 bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3.5">
              {isAr ? 'العمليات النشطة' : 'Active Operations'}
            </h3>
            
            <div className="space-y-2.5">
              {/* Item: Searches / Week */}
              <div 
                onClick={() => openKpi('/search')}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100/60 cursor-pointer transition-colors"
                title={isAr ? 'افتح البحث المؤسسي' : 'Open Enterprise Search'}
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-600">{isAr ? 'عمليات بحث / أسبوع' : 'Searches / Week'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-10 h-3 text-emerald-500 cursor-help" viewBox="0 0 50 10">
                    <title>{isAr ? 'اتجاه البحث الأسبوعي: ٢٣,٤ ألف استعلام' : 'Weekly searches: 23.4K queries'}</title>
                    <path d="M0 8 L 10 4 L 20 6 L 30 2 L 40 5 L 50 1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-800">23.4K</span>
                </div>
              </div>

              {/* Item: Processing Queue */}
              {(p.upload || isMgmt) && (
                <div 
                  onClick={() => openKpi('/ocr')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100/60 cursor-pointer transition-colors"
                  title={isAr ? 'افتح وحدة OCR' : 'Open OCR Module'}
                >
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-600">{isAr ? 'قائمة المعالجة' : 'Processing Queue'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-10 h-3 text-amber-500 cursor-help" viewBox="0 0 50 10">
                      <title>{isAr ? 'المهام قيد المعالجة: ٤٧ مهمة' : 'Active queue processing: 47 jobs'}</title>
                      <path d="M0 8 L 10 2 L 20 5 L 30 1 L 40 9 L 50 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-800">47</span>
                  </div>
                </div>
              )}

              {/* Item: Reviews Completed */}
              {canReview && (
                <div 
                  onClick={() => openKpi('/review')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100/60 cursor-pointer transition-colors"
                  title={isAr ? 'افتح مراجعة الوثائق' : 'Open Document Review'}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-600">{isAr ? 'مراجعات مكتملة' : 'Reviews Completed'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-10 h-3 text-emerald-500 cursor-help" viewBox="0 0 50 10">
                      <title>{isAr ? 'المراجعات المكتملة: ١,٢٠٨ وثيقة' : 'Total completed reviews: 1,208 documents'}</title>
                      <path d="M0 5 L 15 2 L 25 8 L 35 1 L 50 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-800">1,208</span>
                  </div>
                </div>
              )}

              {/* Item: Active Workflows */}
              {canWorkflows && (
                <div 
                  onClick={() => openKpi('/workflows')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100/60 cursor-pointer transition-colors"
                  title={isAr ? 'افتح أتمتة سير العمل' : 'Open Workflow Automation'}
                >
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-600">{isAr ? 'سير عمل نشط' : 'Active Workflows'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-10 h-3 text-sky-500 cursor-help" viewBox="0 0 50 10">
                      <title>{isAr ? 'سير العمل النشط: ٣٦ مساراً' : 'Active workflows: 36 pipelines'}</title>
                      <path d="M0 2 L 10 5 L 25 2 L 40 8 L 50 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-800">36</span>
                  </div>
                </div>
              )}

              {/* Item: Model Accuracy */}
              {isMgmt && (
                <div 
                  onClick={() => openKpi('/admin')}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-100/60 cursor-pointer transition-colors"
                  title={isAr ? 'افتح الإدارة والأمان' : 'Open Admin & Security'}
                >
                  <div className="flex items-center gap-2">
                    <Gauge size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-600">{isAr ? 'دقة النموذج' : 'Model Accuracy'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="w-10 h-3 text-emerald-500 cursor-help" viewBox="0 0 50 10">
                      <title>{isAr ? 'اتجاه دقة مطابقة النموذج: ٩٦,٢٪' : 'Model accuracy trend: 96.2%'}</title>
                      <path d="M0 9 L 10 8 L 30 7 L 40 8 L 50 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-800">96.2%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Row 2: Charts & Live Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Data Laboratory Tabbed Card (2/3 width) */}
        <div className="lg:col-span-8 bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between h-[410px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-800">
                {chartTab === 'usage'
                  ? (isAr ? 'استخدام الذكاء الاصطناعي — 7 أيام' : 'AI Usage — Last 7 Days')
                  : chartTab === 'air'
                    ? (isAr ? 'جودة الهواء — الاتجاه والتنبؤ' : 'Air Quality — Trend & Forecast')
                    : (isAr ? 'تحليلات البحث' : 'Search Analytics')
                }
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {chartTab === 'usage'
                  ? (isAr ? 'الاستعلامات والوثائق المعالجة يومياً' : 'Daily queries and documents processed')
                  : chartTab === 'air'
                    ? (isAr ? 'PM10 و NO₂ مع تنبؤ ٣ أشهر (*)' : 'PM10 & NO₂ with 3-month forecast (*)')
                    : (isAr ? 'حسب نوع البحث — 30 يوم' : 'By search mode — 30 days')
                }
              </p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-slate-100 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-200/50">
              <button
                type="button"
                onClick={() => setChartTab('usage')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartTab === 'usage' ? 'bg-white dark:bg-white text-slate-900 shadow-sm' : 'text-slate-50 hover:text-slate-900'
                }`}
              >
                {isAr ? 'الاستخدام' : 'Usage'}
              </button>
              {isMgmt && (
                <button
                  type="button"
                  onClick={() => setChartTab('air')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    chartTab === 'air' ? 'bg-white dark:bg-white text-slate-900 shadow-sm' : 'text-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isAr ? 'جودة الهواء' : 'Air Quality'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setChartTab('search')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartTab === 'search' ? 'bg-white dark:bg-white text-slate-900 shadow-sm' : 'text-slate-50 hover:text-slate-900'
                }`}
              >
                {isAr ? 'البحث' : 'Search'}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 mt-4 relative">
            {chartTab === 'usage' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aiUsage}>
                  <defs>
                    <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Area type="monotone" dataKey="queries" name={isAr ? 'استعلامات' : 'Queries'} stroke="#10b981" fill="url(#gq)" strokeWidth={2} />
                  <Area type="monotone" dataKey="docs" name={isAr ? 'وثائق معالجة' : 'Docs Processed'} stroke="#0ea5e9" fill="url(#gd)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {chartTab === 'air' && isMgmt && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyAir}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: isAr ? 'الحد النظامي' : 'Regulatory limit', fill: '#f43f5e', fontSize: 10 }} />
                  <Bar dataKey="pm10" name="PM10 µg/m³" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="no2" name="NO₂ ppb" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={18} />
                  <Line dataKey="forecast" name={isAr ? 'تنبؤ PM10' : 'PM10 forecast'} stroke="#d97706" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {chartTab === 'search' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={searchAnalytics} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="type" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={chartTooltip} />
                  <Bar dataKey="count" name={isAr ? 'عمليات البحث' : 'Searches'} radius={[0, 6, 6, 0]} barSize={22}>
                    <Cell fill="#10b981" /><Cell fill="#0ea5e9" /><Cell fill="#8b5cf6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Timeline Stream / Access Summary Card (1/3 width) */}
        <div className="lg:col-span-4 bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between h-[410px]">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">
              {isInternal ? (isAr ? 'التنبيهات المباشرة' : 'Live Activity') : (isAr ? 'صلاحيات وصولك' : 'Your Access')}
            </h3>
            
            {isInternal ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pe-1 relative custom-scrollbar">
                {alerts.map((a, i) => (
                  <div key={a.id} className="flex gap-3.5 relative group">
                    {/* Timeline dotted vertical connector */}
                    {i < alerts.length - 1 && (
                      <div className="absolute top-[20px] start-[7px] bottom-[-24px] w-px border-s border-dashed border-slate-200/70 dark:border-slate-200/50 pointer-events-none"></div>
                    )}
                    {/* Timeline pulsing status dot */}
                    <div className={`relative z-10 w-3.5 h-3.5 mt-1 rounded-full flex items-center justify-center shrink-0 ${
                      a.level === 'critical' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                      : a.level === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                    }`}>
                      {a.level === 'critical' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline gap-1.5">
                        <p 
                          onClick={() => openAlert(i)}
                          className="text-xs font-bold text-slate-800 dark:text-slate-800 cursor-pointer hover:text-brand-600 leading-snug"
                        >
                          {isAr ? a.titleAr : a.title}
                        </p>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0">{isAr ? a.timeAr : a.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug mt-1">
                        {isAr ? a.textAr : a.text}
                      </p>
                      <span 
                        onClick={() => openAlert(i)}
                        className="text-[10px] text-brand-600 font-semibold cursor-pointer hover:underline mt-1 block"
                      >
                        {isAr ? 'عرض التحليل' : 'Open impact analysis'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pe-1 custom-scrollbar">
                {role.modules.map((m) => (
                  <div key={m} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-100 border border-slate-100 dark:border-slate-200/40 px-3 py-2 text-xs text-slate-700 dark:text-slate-700">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{t(moduleKey[m])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bento Grid Row 3: Deep Diagnostics & Systems */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Knowledge Base Donut Card (2 columns) */}
        <div className="md:col-span-2 bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            {isAr ? 'قاعدة المعرفة حسب النوع' : 'Knowledge Base by Type'}
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <PieChart width={144} height={144}>
                <Pie
                  data={docTypes}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={3}
                  strokeWidth={0}
                  onClick={(_, idx) => setDocTypeIdx(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  {docTypes.map((d, i) => (
                    <Cell
                      key={d.name}
                      fill={d.color}
                      opacity={docTypeIdx === i ? 1 : 0.55}
                      stroke={docTypeIdx === i ? d.color : 'transparent'}
                      strokeWidth={docTypeIdx === i ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value ?? 0)
                    return [`${n.toLocaleString()} (${((n / 11440) * 100).toFixed(1)}%)`, String(name ?? '')]
                  }}
                />
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium uppercase">{isAr ? 'الوثائق' : 'Docs'}</span>
                <span className="text-xl font-bold text-slate-800 dark:text-slate-800">11.4K</span>
              </div>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              {docTypes.map((d, i) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => setDocTypeIdx(i)}
                  className={`w-full flex items-center justify-between p-1.5 rounded-lg text-start transition-colors cursor-pointer ${
                    docTypeIdx === i
                      ? 'bg-brand-600/5 border border-brand-600/10 text-brand-700 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-100/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="truncate">{isAr ? d.ar : d.name}</span>
                  </div>
                  <span className="text-[10px] font-bold shrink-0">{d.pct}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Queue Load Card (1 column) */}
        <div className="bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              {isAr ? 'قائمة المعالجة' : 'Queue Load'}
            </h3>
            
            <div className="space-y-4">
              {queue.map((q) => (
                <div key={q.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                    <span className="truncate max-w-[150px]" title={q.name}>{q.name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                      q.tone === 'sky' ? 'bg-sky-50 text-sky-600'
                      : q.tone === 'violet' ? 'bg-violet-50 text-violet-600'
                      : 'bg-emerald-50 text-emerald-600'
                    }`}>{q.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        q.tone === 'sky' ? 'bg-sky-500'
                        : q.tone === 'violet' ? 'bg-violet-500'
                        : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${q.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}

              {isMgmt && (
                <div className="border-t border-slate-100 pt-3.5 mt-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">{isAr ? 'نشاط الإدارات' : 'Department Activity'}</span>
                  <div className="space-y-2">
                    {deptActivity.map((d) => (
                      <div key={d.dept} className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>{isAr ? d.ar : d.dept}</span>
                          <span className="font-bold">{d.usage}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${d.usage > 80 ? 'bg-emerald-500' : d.usage > 60 ? 'bg-sky-500' : 'bg-amber-500'}`} 
                            style={{ width: `${d.usage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integrity Accuracy Ring Card (1 column) */}
        <div className="bg-white/95 dark:bg-slate-50 border border-slate-200/60 dark:border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100 dark:shadow-none flex flex-col justify-between items-center">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider self-start">
            {isAr ? 'دقة دمج المعلومات' : 'Model Integrity'}
          </h3>
          
          <div className="relative flex items-center justify-center my-3 shrink-0">
            <svg className="w-28 h-28 transform -rotate-90 cursor-help">
              <title>{isAr ? 'دقة النموذج الحالية: ٩٦,٢٪ مطابقة' : 'Model accuracy index: 96.2% matching'}</title>
              <circle className="text-slate-100" cx="56" cy="56" fill="transparent" r="46" stroke="currentColor" strokeWidth="6" />
              <circle className="text-brand-600" cx="56" cy="56" fill="transparent" r="46" stroke="currentColor" strokeWidth="6" strokeDasharray="289" strokeDashoffset={289 * (1 - 0.962)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-brand-600">96.2%</span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase">{isAr ? 'دقة مطابقة' : 'Accurate'}</span>
            </div>
          </div>
          
          <div className="w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{isAr ? 'اتجاه الثقة' : 'Confidence Trend'}</span>
            <div className="h-8 w-full">
              <svg 
                className="w-full h-full text-brand-600/30 overflow-visible cursor-help" 
                preserveAspectRatio="none" 
                viewBox="0 0 100 20"
              >
                <title>{isAr ? 'تطور دقة النموذج التاريخي: ٩٥,٨٪ -> ٩٦,٠٪ -> ٩٦,٢٪' : 'Historical confidence trend: 95.8% -> 96.0% -> 96.2%'}</title>
                <polyline fill="none" points={accuracyPointsStr} stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Live alert — impact analysis */}
      <Modal
        open={activeAlert !== null}
        onClose={() => setAlertIdx(null)}
        title={activeAlert ? (isAr ? activeAlert.titleAr : activeAlert.title) : undefined}
        subtitle={activeAlert ? (isAr ? activeAlert.timeAr : activeAlert.time) : undefined}
        maxW="max-w-lg"
      >
        {activeAlert && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge tone={activeAlert.level === 'critical' ? 'rose' : activeAlert.level === 'warning' ? 'amber' : 'sky'}>
                {activeAlert.level === 'critical' && <AlertTriangle size={10} />}
                {activeAlert.level.toUpperCase()}
              </Badge>
              <Badge tone="slate">{isAr ? 'تحليل الأثر' : 'Impact Analysis'}</Badge>
            </div>

            <div className="space-y-3">
              <div className={`rounded-lg border p-3 ${
                activeAlert.level === 'critical' ? 'border-rose-200 bg-rose-50/60'
                : activeAlert.level === 'warning' ? 'border-amber-200 bg-amber-50/60'
                : 'border-sky-200 bg-sky-50/60'
              }`}>
                <p className="text-[11px] font-semibold text-slate-700 mb-1">{isAr ? 'الأثر التشغيلي' : 'Operational Impact'}</p>
                <p className="text-xs text-slate-600 leading-relaxed" dir="auto">{isAr ? activeAlert.impactAr : activeAlert.impact}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold text-slate-700 mb-1">{isAr ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}</p>
                <p className="text-xs text-slate-600 leading-relaxed" dir="auto">{isAr ? activeAlert.analysisAr : activeAlert.analysis}</p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-[11px] font-semibold text-emerald-800 mb-1">{isAr ? 'الإجراء الموصى به' : 'Recommended Action'}</p>
                <p className="text-xs text-emerald-900 leading-relaxed" dir="auto">{isAr ? activeAlert.actionAr : activeAlert.action}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 gap-2">
              <Button variant="outline" size="sm" onClick={() => setAlertIdx(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
              <Button
                size="sm"
                onClick={() => goToAlertModule(activeAlert.route)}
                disabled={!canOpenRoute(activeAlert.route)}
                title={canOpenRoute(activeAlert.route) ? undefined : t('requiresPermission')}
              >
                <ExternalLink size={13} />
                {isAr ? 'فتح الوحدة ذات الصلة' : 'Open related module'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
