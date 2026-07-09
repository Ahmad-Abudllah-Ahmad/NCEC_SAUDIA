import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Bot, Users, Search, Timer, CheckCircle2, GitBranch, Gauge,
  AlertTriangle, ArrowUpRight, Activity, LayoutGrid, Lock, ExternalLink,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart,
  Legend, ReferenceLine,
} from 'recharts'
import { PageHeader, KpiCard, Card, Badge, ProgressBar, Button, Modal, chartTooltip } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

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

      {/* KPI band — cards shown according to role */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        <KpiCard icon={FileText} label={isAr ? 'إجمالي الوثائق' : 'Total Documents'} value="11,440" delta="+312" deltaUp accent="emerald"
          trend={[10850, 10920, 11040, 11128, 11210, 11305, 11440]} trendLabels={days}
          onClick={() => openKpi('/knowledge-base')} title={isAr ? 'افتح قاعدة المعرفة' : 'Open Knowledge Base'} />
        {p.chat && (
          <KpiCard icon={Bot} label={isAr ? 'استعلامات الذكاء اليوم' : 'AI Queries Today'} value="2,463" delta="+18%" deltaUp accent="sky"
            trend={[1240, 1890, 2140, 1980, 2460, 620, 480]} trendLabels={days}
            onClick={() => openKpi('/assistant')} title={isAr ? 'افتح مساعد الوثائق' : 'Open AI Document Assistant'} />
        )}
        {isMgmt && (
          <KpiCard icon={Users} label={isAr ? 'مستخدمون نشطون' : 'Active Users'} value="284" delta="+9%" deltaUp accent="violet"
            trend={[212, 236, 241, 255, 248, 262, 284]} trendLabels={days}
            onClick={() => openKpi('/admin')} title={isAr ? 'افتح الإدارة والأمان' : 'Open Admin & Security'} />
        )}
        <KpiCard icon={Search} label={isAr ? 'عمليات بحث / أسبوع' : 'Searches / Week'} value="23.4K" delta="+11%" deltaUp accent="emerald"
          trend={[18.2, 19.4, 20.1, 21.0, 21.9, 22.6, 23.4]} trendLabels={weeks} unit="K"
          onClick={() => openKpi('/search')} title={isAr ? 'افتح البحث المؤسسي' : 'Open Enterprise Search'} />
        {(p.upload || isMgmt) && (
          <KpiCard icon={Timer} label={isAr ? 'قائمة المعالجة' : 'Processing Queue'} value="47" delta="-12" deltaUp accent="amber"
            trend={[82, 74, 66, 59, 61, 52, 47]} trendLabels={days}
            onClick={() => openKpi('/ocr')} title={isAr ? 'افتح وحدة OCR' : 'Open OCR Module'} />
        )}
        {canReview && (
          <KpiCard icon={CheckCircle2} label={isAr ? 'مراجعات مكتملة' : 'Reviews Completed'} value="1,208" delta="+64" deltaUp accent="emerald"
            trend={[980, 1024, 1061, 1102, 1144, 1178, 1208]} trendLabels={weeks}
            onClick={() => openKpi('/review')} title={isAr ? 'افتح مراجعة الوثائق' : 'Open Document Review'} />
        )}
        {canWorkflows && (
          <KpiCard icon={GitBranch} label={isAr ? 'سير عمل نشط' : 'Active Workflows'} value="36" accent="sky"
            trend={[28, 31, 29, 34, 38, 35, 36]} trendLabels={days}
            onClick={() => openKpi('/workflows')} title={isAr ? 'افتح أتمتة سير العمل' : 'Open Workflow Automation'} />
        )}
        {isMgmt && (
          <KpiCard icon={Gauge} label={isAr ? 'دقة النموذج' : 'Model Accuracy'} value="96.2%" delta="+0.9" deltaUp accent="emerald" hint={isAr ? 'هلوسة 1.1%' : 'Hallucination 1.1%'}
            trend={[91.2, 92.6, 93.4, 94.1, 95.3, 95.8, 96.2]} trendLabels={weeks} unit="%"
            onClick={() => openKpi('/admin')} title={isAr ? 'افتح الإدارة والأمان' : 'Open Admin & Security'} />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* AI usage trend */}
        <Card
          className="xl:col-span-2"
          title={isAr ? 'استخدام الذكاء الاصطناعي — 7 أيام' : 'AI Usage — Last 7 Days'}
          subtitle={isAr ? 'الاستعلامات والوثائق المعالجة يومياً' : 'Daily queries and documents processed'}
          actions={<Badge tone="sky">RAG + LLM</Badge>}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={aiUsage}>
              <defs>
                <linearGradient id="gq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltip} />
              <Area type="monotone" dataKey="queries" name={isAr ? 'استعلامات' : 'Queries'} stroke="#10b981" fill="url(#gq)" strokeWidth={2} />
              <Area type="monotone" dataKey="docs" name={isAr ? 'وثائق معالجة' : 'Docs Processed'} stroke="#0ea5e9" fill="url(#gd)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Live alerts for internal staff — access summary for restricted roles */}
        {isInternal ? (
          <Card
            title={isAr ? 'التنبيهات المباشرة' : 'Live Alerts'}
            actions={<Badge tone="rose">2 {isAr ? 'حرجة' : 'CRITICAL'}</Badge>}
          >
            <div className="space-y-2.5 max-h-[248px] overflow-y-auto pe-1">
              {alerts.map((a, i) => (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openAlert(i)}
                  onKeyDown={(e) => e.key === 'Enter' && openAlert(i)}
                  className={`rounded-lg border p-2.5 text-xs leading-relaxed cursor-pointer transition-colors ${
                    a.level === 'critical' ? 'border-rose-200 bg-rose-50/70 hover:bg-rose-50 hover:border-rose-300'
                    : a.level === 'warning' ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50 hover:border-amber-300'
                    : 'border-sky-200 bg-sky-50/70 hover:bg-sky-50 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={a.level === 'critical' ? 'rose' : a.level === 'warning' ? 'amber' : 'sky'}>
                      {a.level === 'critical' && <AlertTriangle size={10} />}
                      {a.level}
                    </Badge>
                    <span className="text-slate-400 text-[10px]">{isAr ? a.timeAr : a.time}</span>
                  </div>
                  <p className="text-slate-600">{isAr ? a.textAr : a.text}</p>
                  <p className="text-brand-600 mt-1 flex items-center gap-1 font-medium hover:text-brand-700">
                    {isAr ? 'عرض التحليل' : 'Open impact analysis'} <ArrowUpRight size={11} />
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card
            title={isAr ? 'صلاحيات وصولك' : 'Your Access'}
            subtitle={`${role.id} — ${isAr ? role.nameAr : role.name}`}
            actions={<Badge tone="slate"><LayoutGrid size={10} /> {role.modules.length}/14</Badge>}
          >
            <div className="space-y-1.5 max-h-[248px] overflow-y-auto pe-1">
              {role.modules.map((m) => (
                <div key={m} className="flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  {t(moduleKey[m])}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
              {isAr
                ? 'وحدات إضافية تتطلب ترقية الدور من مشرف المنصة.'
                : 'Additional modules require a role upgrade from the platform administrator.'}
            </p>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {/* Doc types donut — interactive legend + segment drill-down */}
        <Card title={isAr ? 'قاعدة المعرفة حسب النوع' : 'Knowledge Base by Type'} subtitle="11,440 docs">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={docTypes}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
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
          </ResponsiveContainer>

          {/* Custom legend — fixes cramped concatenated labels */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            {docTypes.map((d, i) => (
              <button
                key={d.name}
                type="button"
                onClick={() => setDocTypeIdx(i)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-start transition-colors cursor-pointer ${
                  docTypeIdx === i
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="truncate">{isAr ? d.ar : d.name}</span>
              </button>
            ))}
          </div>

        </Card>

        {/* Accuracy trend — management only */}
        {isMgmt && (
          <Card title={isAr ? 'دقة النموذج مقابل الهلوسة' : 'Accuracy vs. Hallucination'} subtitle={isAr ? 'تحسن مستمر عبر التعلم من الملاحظات' : 'RLHF continuous improvement'}>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={chartTooltip} />
                <Line type="monotone" dataKey="accuracy" name={isAr ? 'الدقة %' : 'Accuracy %'} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="hallucination" name={isAr ? 'الهلوسة %' : 'Hallucination %'} stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Search analytics */}
        <Card title={isAr ? 'تحليلات البحث' : 'Search Analytics'} subtitle={isAr ? 'حسب نوع البحث — 30 يوم' : 'By search mode — 30 days'}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={searchAnalytics} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="type" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={70} />
              <Tooltip contentStyle={chartTooltip} />
              <Bar dataKey="count" name={isAr ? 'عمليات البحث' : 'Searches'} radius={[0, 6, 6, 0]} barSize={22}>
                <Cell fill="#10b981" /><Cell fill="#0ea5e9" /><Cell fill="#8b5cf6" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Department activity — management only */}
        {isMgmt && (
          <Card title={isAr ? 'نشاط الإدارات' : 'User Activity by Department'} subtitle={isAr ? 'نسبة التبني' : 'Adoption rate'}>
            <div className="space-y-3 pt-1">
              {deptActivity.map((d) => (
                <div key={d.dept}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{isAr ? d.ar : d.dept}</span>
                    <span className="text-slate-500 font-semibold">{d.usage}%</span>
                  </div>
                  <ProgressBar value={d.usage} tone={d.usage > 80 ? 'emerald' : d.usage > 60 ? 'sky' : 'amber'} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {(p.upload || isMgmt) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Processing queue */}
          <Card title={isAr ? 'قائمة المعالجة' : 'Processing Queue'} subtitle={isAr ? 'المهام الجارية الآن' : 'Currently running jobs'} actions={<Badge tone="amber">47 {isAr ? 'قيد الانتظار' : 'queued'}</Badge>}>
            <div className="space-y-3.5">
              {queue.map((q) => (
                <div key={q.name}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-700 font-medium truncate pe-3">{q.name}</span>
                    <span className="text-slate-400 whitespace-nowrap">{q.stage} · {q.pct}%</span>
                  </div>
                  <ProgressBar value={q.pct} tone={q.tone} />
                </div>
              ))}
            </div>
          </Card>

          {/* Air quality charts — management only */}
          {isMgmt && (
            <div className="space-y-4">
              <Card
                title={isAr ? 'جودة الهواء — الاتجاه والتنبؤ' : 'Air Quality — Trend & Forecast'}
                subtitle={isAr ? 'PM10 و NO₂ مع تنبؤ ٣ أشهر (*)' : 'PM10 & NO₂ with 3-month forecast (*)'}
              >
                <ResponsiveContainer width="100%" height={290}>
                  <ComposedChart data={monthlyAir}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                    <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: isAr ? 'الحد النظامي' : 'Regulatory limit', fill: '#f43f5e', fontSize: 10 }} />
                    <Bar dataKey="pm10" name="PM10 µg/m³" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="no2" name="NO₂ ppb" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={18} />
                    <Line dataKey="forecast" name={isAr ? 'تنبؤ PM10' : 'PM10 forecast'} stroke="#d97706" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

            </div>
          )}
        </div>
      )}

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
