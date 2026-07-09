import { useState } from 'react'
import {
  GitBranch, Bell, History, UserPlus, CheckCircle2, Clock, ArrowRight, CircleDot, X,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const stages = [
  { en: 'Submitted', ar: 'مقدم' },
  { en: 'AI Pre-Review', ar: 'مراجعة ذكية أولية' },
  { en: 'Technical Review', ar: 'مراجعة فنية' },
  { en: 'Legal Review', ar: 'مراجعة قانونية' },
  { en: 'Manager Approval', ar: 'اعتماد المدير' },
  { en: 'Completed', ar: 'مكتمل' },
]

// Base counts per stage excluding the visible active workflows below
const stageBase = [12, 8, 8, 2, 2]

type WF = {
  id: string
  doc: string
  docAr: string
  stage: number
  assignee: string
  due: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  version: string
}

const initialActive: WF[] = [
  { id: 'WF-2216', doc: 'EIA Review — Red Sea Coastal Development', docAr: 'مراجعة دراسة الأثر — البحر الأحمر', stage: 2, assignee: 'Environmental Team — S. Al-Otaibi', due: '2 days', priority: 'high', version: 'v1.2' },
  { id: 'WF-2214', doc: 'Hazardous Waste Policy v2.2 approval', docAr: 'اعتماد سياسة النفايات الخطرة ٢٫٢', stage: 3, assignee: 'Legal Team — M. Al-Harbi', due: '5 days', priority: 'medium', version: 'v2.2' },
  { id: 'WF-2209', doc: 'Circular 46/2026 publication workflow', docAr: 'سير نشر التعميم ٤٦/٢٠٢٦', stage: 4, assignee: 'Dept. Manager — K. Al-Shehri', due: 'today', priority: 'high', version: 'v1.0' },
  { id: 'WF-2203', doc: 'Compliance Report CR-889 sign-off', docAr: 'اعتماد تقرير الالتزام CR-889', stage: 3, assignee: 'Legal Team — unassigned', due: 'overdue 46h', priority: 'critical', version: 'v1.1' },
]

type Note = { text: string; textAr: string; time: string }

const initialNotes: Note[] = [
  { text: 'Review request sent to Legal Team for WF-2214', textAr: 'أُرسل طلب مراجعة للفريق القانوني — WF-2214', time: '10m' },
  { text: 'Version v1.2 of EIA review auto-saved with change log', textAr: 'حُفظ الإصدار ١٫٢ تلقائياً مع سجل التغييرات', time: '32m' },
  { text: 'WF-2203 escalated: SLA breach — manager notified', textAr: 'تصعيد WF-2203: تجاوز اتفاقية المستوى — تم إشعار المدير', time: '1h' },
  { text: 'Auto-assignment: WF-2216 routed to S. Al-Otaibi (load-balanced)', textAr: 'إسناد تلقائي: WF-2216 إلى س. العتيبي', time: '3h' },
]

const assignees = [
  'Environmental Team — S. Al-Otaibi',
  'Legal Team — M. Al-Harbi',
  'Technical Team — F. Al-Dossary',
  'Dept. Manager — K. Al-Shehri',
]

export default function Workflows() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canCreate = role.perms.generate
  const canApprove = role.perms.approve

  const [items, setItems] = useState<WF[]>(initialActive)
  const [completed, setCompleted] = useState(1208)
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [showNew, setShowNew] = useState(false)
  const [nextId, setNextId] = useState(2217)
  const [form, setForm] = useState({ doc: '', priority: 'medium' as WF['priority'], assignee: assignees[0] })

  const stageCounts = stages.slice(0, 5).map((_, i) => stageBase[i] + items.filter((w) => w.stage === i).length)

  const addNote = (text: string, textAr: string) =>
    setNotes((n) => [{ text, textAr, time: 'now' }, ...n])

  const create = () => {
    if (!canCreate || !form.doc.trim()) return
    const id = `WF-${nextId}`
    setNextId((n) => n + 1)
    setItems((l) => [{ id, doc: form.doc.trim(), docAr: form.doc.trim(), stage: 0, assignee: form.assignee, due: '7 days', priority: form.priority, version: 'v1.0' }, ...l])
    addNote(`New workflow ${id} created and queued for AI pre-review`, `أُنشئ سير عمل جديد ${id} وأُدرج للمراجعة الذكية`)
    setForm({ doc: '', priority: 'medium', assignee: assignees[0] })
    setShowNew(false)
  }

  const advance = (id: string) => {
    if (!canApprove) return
    const wf = items.find((w) => w.id === id)
    if (!wf) return
    if (wf.stage >= 4) {
      setItems((l) => l.filter((w) => w.id !== id))
      setCompleted((c) => c + 1)
      addNote(`${id} approved by manager — workflow completed`, `اعتمد المدير ${id} — اكتمل سير العمل`)
    } else {
      const next = wf.stage + 1
      setItems((l) => l.map((w) => (w.id === id ? { ...w, stage: next } : w)))
      addNote(`${id} advanced to ${stages[next].en}`, `انتقل ${id} إلى ${stages[next].ar}`)
    }
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'أتمتة سير العمل' : 'Workflow Automation'}
        subtitle={isAr
          ? 'أتمتة المراجعة والاعتماد والإسناد والإشعارات وتتبع الحالة وإدارة الإصدارات وطلبات المراجعة'
          : 'Automated review, approvals, assignment, notifications, status tracking, version control and review requests'}
        actions={
          <Button size="sm" onClick={() => setShowNew((s) => !s)} disabled={!canCreate} title={canCreate ? undefined : t('requiresPermission')}>
            <GitBranch size={14} /> {isAr ? 'سير عمل جديد' : 'New Workflow'}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={GitBranch} label={isAr ? 'سير عمل نشط' : 'Active Workflows'} value={String(items.length + 32)} accent="sky"
          trend={[42, 39, 41, 38, 37, 35, 36]} trendLabels={weeks} />
        <KpiCard icon={Clock} label={isAr ? 'متوسط زمن الدورة' : 'Avg. Cycle Time'} value={isAr ? '3.4 أيام' : '3.4 days'} accent="emerald" delta="-38%" deltaUp hint={isAr ? 'قبل الأتمتة: 12 يوم' : 'pre-automation: 12 days'}
          trend={[5.2, 4.8, 4.4, 4.1, 3.8, 3.6, 3.4]} trendLabels={weeks} />
        <KpiCard icon={CheckCircle2} label={isAr ? 'اكتمل هذا الربع' : 'Completed This Quarter'} value={completed.toLocaleString()} accent="violet"
          trend={[318, 334, 351, 367, 382, 398, 412]} trendLabels={weeks} />
        <KpiCard icon={Bell} label={isAr ? 'تجاوزات SLA' : 'SLA Breaches'} value="1" accent="rose"
          trend={[4, 3, 3, 2, 2, 1, 1]} trendLabels={weeks} />
      </div>

      {/* New workflow form */}
      {showNew && (
        <Card className="mb-4 border-brand-600/40" title={isAr ? 'إنشاء سير عمل جديد' : 'Create New Workflow'}
          actions={<button className="text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowNew(false)}><X size={16} /></button>}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الوثيقة / الموضوع' : 'Document / subject'}</label>
              <input dir="auto" value={form.doc} onChange={(e) => setForm((f) => ({ ...f, doc: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder={isAr ? 'مثال: مراجعة سياسة الضوضاء v3' : 'e.g. Noise Policy v3 review'}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-600/60" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الأولوية' : 'Priority'}</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as WF['priority'] }))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none">
                <option value="high">{isAr ? 'عالية' : 'High'}</option>
                <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الإسناد إلى' : 'Assign to'}</label>
              <select value={form.assignee} onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none">
                {assignees.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={create} disabled={!form.doc.trim()}>{isAr ? 'إنشاء وإرسال للمراجعة' : 'Create & route for review'}</Button>
          </div>
        </Card>
      )}

      {/* Pipeline */}
      <Card title={isAr ? 'مراحل سير العمل' : 'Workflow Pipeline'} subtitle={isAr ? 'توزيع الطلبات على المراحل — يتحدث مباشرة' : 'Items per stage — updates live'} className="mb-4">
        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {stages.map((s, i) => (
            <div key={s.en} className="flex items-center gap-2 min-w-fit flex-1">
              <div className={`flex-1 rounded-lg border p-3 text-center min-w-[110px] ${
                i === stages.length - 1 ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}>
                <p className={`text-xl font-bold ${i === stages.length - 1 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {i === stages.length - 1 ? completed.toLocaleString() : stageCounts[i]}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{isAr ? s.ar : s.en}</p>
              </div>
              {i < stages.length - 1 && <ArrowRight size={14} className="text-slate-300 shrink-0 rtl:rotate-180" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Active workflows */}
        <Card className="xl:col-span-2" title={isAr ? 'سير العمل النشط' : 'Active Workflows'} subtitle={isAr ? 'التتبع المباشر للحالة والإسناد' : 'Live status tracking & assignment'}>
          {!canApprove && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {role.id} — {isAr ? 'يمكنك المتابعة فقط؛ تقديم المراحل يتطلب صلاحية الاعتماد.' : 'View-only: advancing stages requires approval permission.'}
            </div>
          )}
          <div className="space-y-3">
            {items.map((w) => (
              <div key={w.id} className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-slate-400">{w.id}</span>
                  <p className="text-sm font-semibold text-slate-900 flex-1" dir="auto">{isAr ? w.docAr : w.doc}</p>
                  <Badge tone={w.priority === 'critical' ? 'rose' : w.priority === 'high' ? 'amber' : w.priority === 'medium' ? 'sky' : 'slate'}>{w.priority}</Badge>
                  <Badge tone="slate"><History size={10} /> {w.version}</Badge>
                </div>
                {/* Stage dots */}
                <div className="flex items-center gap-1 mb-2">
                  {stages.slice(0, 5).map((s, i) => (
                    <div key={s.en} className="flex items-center gap-1 flex-1">
                      <CircleDot size={12} className={i < w.stage ? 'text-emerald-500' : i === w.stage ? 'text-amber-500 animate-pulse-soft' : 'text-slate-300'} />
                      <div className={`h-0.5 flex-1 ${i < w.stage ? 'bg-emerald-300' : 'bg-slate-200'} ${i === 4 ? 'hidden' : ''}`} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><UserPlus size={11} /> {w.assignee}</span>
                  <span className={`flex items-center gap-1 ${w.due.includes('overdue') ? 'text-rose-600 font-semibold' : ''}`}>
                    <Clock size={11} /> {isAr ? 'الاستحقاق:' : 'Due:'} {w.due}
                  </span>
                  <span className="ms-auto flex items-center gap-2">
                    <span className="text-amber-700 font-medium">{isAr ? stages[w.stage].ar : stages[w.stage].en}</span>
                    <Button size="sm" variant={w.stage >= 4 ? 'primary' : 'outline'} onClick={() => advance(w.id)} disabled={!canApprove} title={canApprove ? undefined : t('requiresPermission')}>
                      {w.stage >= 4 ? (isAr ? 'اعتماد نهائي' : 'Final Approve') : (isAr ? 'تقديم المرحلة' : 'Advance')}
                      <ArrowRight size={12} className="rtl:rotate-180" />
                    </Button>
                  </span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                {isAr ? 'لا يوجد سير عمل نشط — أنشئ واحداً جديداً.' : 'No active workflows — create a new one.'}
              </div>
            )}
          </div>
        </Card>

        {/* Notifications */}
        <Card title={isAr ? 'الإشعارات التلقائية' : 'Automated Notifications'} subtitle={isAr ? 'إشعارات وإسناد وتصعيد تلقائي' : 'Auto-notify, assign & escalate'}>
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pe-1">
            {notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <Bell size={13} className="text-sky-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-600 leading-snug" dir="auto">{isAr ? n.textAr : n.text}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{n.time === 'now' ? (isAr ? 'الآن' : 'now') : `${n.time} ${isAr ? 'مضت' : 'ago'}`}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
