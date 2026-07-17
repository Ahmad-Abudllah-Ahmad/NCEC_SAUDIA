/* eslint-disable react-refresh/only-export-components */
import { useId } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, X, Info } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

/** Shared tooltip style for all recharts tooltips (light theme). */
export const chartTooltip = {
  backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
  border: '1px solid var(--chart-tooltip-border, #e2e8f0)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--chart-tooltip-text, #0f172a)',
  boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
} as const

type Accent = 'emerald' | 'sky' | 'amber' | 'violet' | 'rose'

const accentHex: Record<Accent, string> = {
  emerald: '#059669',
  sky: '#0284c7',
  amber: '#d97706',
  violet: '#7c3aed',
  rose: '#e11d48',
}

const accentChip: Record<Accent, string> = {
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  sky: 'text-sky-600 bg-sky-50 border-sky-200',
  amber: 'text-amber-600 bg-amber-50 border-amber-200',
  violet: 'text-violet-600 bg-violet-50 border-violet-200',
  rose: 'text-rose-600 bg-rose-50 border-rose-200',
}

const PAGE_INFO_MAP: Record<string, { flow: string, bullets: string[] }> = {
  'Management Dashboard': {
    flow: 'Data Ingestion ➔ AI Processing ➔ KPI Aggregation ➔ Real-time Display',
    bullets: [
      'Collects metrics across all branches',
      'AI predicts trends and highlights anomalies',
      'Provides a high-level executive view'
    ]
  },
  'AI Document Assistant': {
    flow: 'User Query ➔ Semantic Search ➔ Context Retrieval ➔ LLM Gen ➔ Answer',
    bullets: [
      'Uses advanced RAG (Retrieval-Augmented Gen)',
      'Searches through thousands of NCEC documents',
      'Cites original sources for accuracy'
    ]
  },
  'AI Legal Assistant': {
    flow: 'Legal Query ➔ DB Search ➔ Compliance Check ➔ Legal Analysis ➔ Result',
    bullets: [
      'Trained on Saudi Environmental Law',
      'Automatically cross-references regulations',
      'Helps ensure strict compliance'
    ]
  },
  'Enterprise Search': {
    flow: 'Search Query ➔ Neural Embedding ➔ Vector Match ➔ Ranking ➔ Unified View',
    bullets: [
      'Cross-platform semantic search',
      'Understands context, not just keywords',
      'Filters by department, date, and relevance'
    ]
  },
  'Data Analysis': {
    flow: 'Raw Data ➔ Data Cleaning ➔ Stat Modeling ➔ Pattern Rec ➔ Visual Insights',
    bullets: [
      'Processes massive environmental datasets',
      'Identifies hidden correlations',
      'Generates exportable visual reports'
    ]
  },
  'Knowledge Base': {
    flow: 'Doc Upload ➔ Text Extract ➔ Vectorization ➔ Indexing ➔ Searchable KB',
    bullets: [
      'Central repository for all NCEC guidelines',
      'Auto-categorizes new uploads',
      'Maintains version control'
    ]
  },
  'Environmental Studies': {
    flow: 'Study Submit ➔ Meta Extract ➔ QA ➔ AI Summary ➔ Report Gen',
    bullets: [
      'Tracks ongoing environmental assessments',
      'Extracts key findings automatically',
      'Standardizes reporting formats'
    ]
  },
  'Regulatory & Legal AI': {
    flow: 'Regulation Update ➔ Impact Analysis ➔ Policy Alignment ➔ Notification',
    bullets: [
      'Monitors changes in environmental policies',
      'Assesses impact on current operations',
      'Flags non-compliant areas automatically'
    ]
  },
  'Document Generation': {
    flow: 'User Prompt ➔ Template Select ➔ AI Content Gen ➔ Review ➔ Final PDF',
    bullets: [
      'Automates repetitive report writing',
      'Uses approved NCEC templates',
      'Saves hundreds of hours of manual typing'
    ]
  },
  'Document Review': {
    flow: 'Upload Draft ➔ AI Proofread ➔ Fact Check ➔ Suggestion Engine ➔ Final Polish',
    bullets: [
      'Checks for tone, clarity, and legal accuracy',
      'Flags missing information',
      'Ensures brand consistency'
    ]
  },
  'OCR Module': {
    flow: 'Scanned File ➔ Pre-processing ➔ Text Rec ➔ Data Extract ➔ Searchable Text',
    bullets: [
      'Digitizes legacy paper records',
      'High accuracy for Arabic and English',
      'Extracts tables and handwritten notes'
    ]
  },
  'Recommendation Engine': {
    flow: 'User Activity ➔ Pref Analysis ➔ Collab Filtering ➔ Suggestions',
    bullets: [
      'Suggests relevant documents based on role',
      'Learns from your interaction history',
      'Highlights trending topics in NCEC'
    ]
  },
  'Workflow Automation': {
    flow: 'Trigger Event ➔ Condition Eval ➔ Action Execute ➔ Status Update ➔ Notify',
    bullets: [
      'Automates standard approval chains',
      'Reduces bottlenecks in operations',
      'Integrates with existing NCEC tools'
    ]
  },
  'Admin & Security': {
    flow: 'User Login ➔ Role Verify ➔ Permission Check ➔ Audit Log ➔ Access',
    bullets: [
      'Manages user roles and access levels',
      'Logs all system activities for compliance',
      'Monitors system health and security'
    ]
  }
}

function SparkTooltip({ active, payload, label, unit }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  unit?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md bg-white border border-slate-200 shadow-lg px-2 py-1 text-[11px] text-slate-700 whitespace-nowrap">
      <span className="text-slate-400">{label}</span> · <b>{payload[0].value.toLocaleString()}{unit}</b>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const info = PAGE_INFO_MAP[title]

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6 relative z-[100]">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {info && (
            <div className="relative group inline-flex items-center">
              <Info size={18} className="text-slate-400 cursor-help hover:text-emerald-500 transition-colors" />
              <div className="absolute left-full ml-3 top-[-10px] w-80 p-4 bg-slate-900 text-slate-100 text-sm rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 border border-slate-700 pointer-events-none">
                <div className="absolute top-[15px] -left-2 w-4 h-4 bg-slate-900 border-l border-b border-slate-700 transform rotate-45"></div>
                <div className="relative z-10">
                  <h4 className="font-bold text-emerald-400 mb-2 uppercase tracking-wider text-[10px]">Data Flow Process</h4>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-200 font-mono bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/50 mb-4 leading-relaxed">
                    {info.flow}
                  </div>
                  <h4 className="font-bold text-emerald-400 mb-2 uppercase tracking-wider text-[10px]">Key Operations</h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-300">
                    {info.bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaUp,
  hint,
  accent = 'emerald',
  trend,
  trendLabels,
  unit = '',
  onClick,
  title,
}: {
  icon: LucideIcon
  label: string
  value: string
  delta?: string
  deltaUp?: boolean
  hint?: string
  accent?: Accent
  /** 7-point series rendered as an interactive sparkline with hover tooltip */
  trend?: number[]
  trendLabels?: string[]
  unit?: string
  onClick?: () => void
  title?: string
}) {
  const gid = useId().replace(/:/g, 'k')
  const data = trend?.map((v, i) => ({ x: trendLabels?.[i] ?? `T${i + 1}`, v }))
  return (
    <div
      title={title}
      onClick={onClick}
      className={`card card-hover p-4 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`p-2 rounded-lg border ${accentChip[accent]}`}>
          <Icon size={18} />
        </span>
        {delta && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${deltaUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {deltaUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {delta}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      {data && (
        <div className="mt-2 h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentHex[accent]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={accentHex[accent]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="x" hide />
              <Tooltip content={<SparkTooltip unit={unit} />} cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="v" stroke={accentHex[accent]} strokeWidth={2} fill={`url(#${gid})`} dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export function Card({ title, subtitle, children, actions, className = '' }: { title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between mb-4 gap-2">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

type BadgeTone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'slate' | 'gold'

export function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  void tone
  void children
  return null
}

export function ProgressBar({ value, tone = 'emerald' }: { value: number; tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' }) {
  const tones = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-500',
  }
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full rounded-full ${tones[tone]} transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled = false,
  title,
}: {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
  onClick?: () => void
  className?: string
  disabled?: boolean
  title?: string
}) {
  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
    outline: 'bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  }
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function StatRow({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxW = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  maxW?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${maxW} bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100 shrink-0">
          <div>
            {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 pt-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function ConfidenceRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const color = value >= 85 ? '#059669' : value >= 70 ? '#d97706' : '#e11d48'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">{value}%</span>
    </div>
  )
}
