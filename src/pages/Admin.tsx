import { useState } from 'react'
import {
  ShieldCheck, Users, Building2, KeyRound, Cpu, Database, ScrollText,
  HardDriveDownload, Lock, Fingerprint, Network, CheckCircle2, Server,
  BookTemplate, RefreshCcw, Eye,
} from 'lucide-react'
import { PageHeader, Card, Badge, Button, KpiCard, StatRow, ProgressBar, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole, ROLES } from '../roles'

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const permCols = [
  { key: 'upload', en: 'Upload', ar: 'رفع' },
  { key: 'chat', en: 'AI Chat', ar: 'محادثة' },
  { key: 'generate', en: 'Generate', ar: 'إنشاء' },
  { key: 'approve', en: 'Approve', ar: 'اعتماد' },
  { key: 'admin', en: 'Admin', ar: 'إدارة' },
] as const

const audit = [
  { user: 'S. Al-Otaibi', role: 'ROLE-03 Reviewer', action: 'Exported review report RV-2216 (PDF)', time: '14:28', ip: '10.20.4.112' },
  { user: 'M. Al-Harbi', role: 'ROLE-04 Legal Team', action: 'Queried AI assistant — Article 32 penalties', time: '14:21', ip: '10.20.4.87' },
  { user: 'system', role: 'Scheduler', action: 'Nightly encrypted backup completed (2.4 TB)', time: '02:00', ip: 'localhost' },
  { user: 'K. Al-Shehri', role: 'ROLE-02 Dept. Manager', action: 'Approved workflow WF-2209', time: '13:02', ip: '10.20.3.15' },
  { user: 'A. Al-Khalidi', role: 'ROLE-01 Super Admin', action: 'Updated prompt template "EIA Executive Summary"', time: '11:47', ip: '10.20.1.4' },
]

const models = [
  { name: 'falcon-180b-arabic-legal', engine: 'vLLM', status: 'serving', ctx: '32K', ft: 'Fine-tune v12 (NCEC corpus)' },
  { name: 'jais-30b-chat', engine: 'vLLM', status: 'serving', ctx: '16K', ft: 'RLHF cycle #8 active' },
  { name: 'bge-m3-embeddings', engine: 'Ollama', status: 'serving', ctx: '8K', ft: 'Domain-adapted' },
  { name: 'qwen2.5-72b (staging)', engine: 'vLLM', status: 'evaluating', ctx: '128K', ft: 'A/B eval vs falcon' },
]

const promptTemplates = [
  'EIA Executive Summary (AR)', 'Decision Memo — Permit', 'Regulation Conflict Analysis',
  'Compliance Report Quarterly', 'Legal Clause Explanation (AR)',
]

const tabs = [
  { key: 'rbac', en: 'Roles & Permissions', ar: 'الأدوار والصلاحيات', icon: KeyRound },
  { key: 'security', en: 'Security', ar: 'الأمان', icon: Lock },
  { key: 'models', en: 'AI Models', ar: 'نماذج الذكاء', icon: Cpu },
  { key: 'audit', en: 'Audit Logs', ar: 'سجلات التدقيق', icon: ScrollText },
  { key: 'system', en: 'Knowledge & Backup', ar: 'المعرفة والنسخ الاحتياطي', icon: Database },
]

export default function Admin() {
  const { lang } = useLang()
  const { role, setRoleId } = useRole()
  const isAr = lang === 'ar'
  const [tab, setTab] = useState('rbac')
  const [toast, setToast] = useState<string | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState(ROLES[0].id)
  const [userCounts, setUserCounts] = useState<Record<string, number>>(
    Object.fromEntries(ROLES.map((r) => [r.id, r.users])),
  )
  const totalUsers = Object.values(userCounts).reduce((sum, value) => sum + value, 0)

  const notify = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2400)
  }

  const addUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return
    setUserCounts((counts) => ({ ...counts, [newUserRole]: (counts[newUserRole] ?? 0) + 1 }))
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole(ROLES[0].id)
    setAddUserOpen(false)
    notify(isAr ? 'تمت إضافة المستخدم بنجاح' : 'User added successfully')
  }

  const previewRole = (roleId: string) => setPreviewRoleId(roleId)
  const previewRoleData = previewRoleId ? ROLES.find((r) => r.id === previewRoleId) ?? null : null

  return (
    <div>
      <PageHeader
        title={isAr ? 'الإدارة والأمان' : 'Administration & Security'}
        subtitle={isAr
          ? 'إدارة المستخدمين والإدارات والصلاحيات ونماذج الذكاء وقاعدة المعرفة وقوالب التلقين وسجلات التدقيق والنسخ الاحتياطي'
          : 'User, department & permission management, AI model settings, knowledge base management, prompt templates, audit logs, backup & restore'}
        actions={toast ? <span className="text-xs text-emerald-700">{toast}</span> : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={Users} label={isAr ? 'إجمالي المستخدمين' : 'Total Users'} value={String(totalUsers)} accent="emerald"
          trend={[255, 259, 264, 268, 273, 279, 284]} trendLabels={weeks} />
        <KpiCard icon={Building2} label={isAr ? 'الإدارات' : 'Departments'} value="14" accent="sky"
          trend={[12, 12, 13, 13, 14, 14, 14]} trendLabels={weeks} />
        <KpiCard icon={ShieldCheck} label={isAr ? 'أحداث أمنية (30 يوم)' : 'Security Incidents (30d)'} value="0" accent="emerald"
          trend={[0, 0, 0, 0, 0, 0, 0]} trendLabels={weeks} />
        <KpiCard icon={HardDriveDownload} label={isAr ? 'آخر نسخة احتياطية' : 'Last Backup'} value={isAr ? 'منذ 12 س' : '12h ago'} accent="violet" hint={isAr ? 'مشفرة AES-256' : 'AES-256 encrypted'}
          trend={[2.0, 2.1, 2.1, 2.2, 2.3, 2.35, 2.4]} trendLabels={weeks} unit=" TB" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              tab === tb.key ? 'border-brand-600/60 bg-brand-600/10 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
            }`}>
            <tb.icon size={14} /> {isAr ? tb.ar : tb.en}
          </button>
        ))}
      </div>

      {tab === 'rbac' && (
        <Card
          title={isAr ? 'مصفوفة الأدوار والصلاحيات' : 'Role-Based Access Control Matrix'}
          subtitle={isAr ? '8 أدوار معرفة بمعرفات ثابتة — بدّل الدور لمعاينة صلاحياته مباشرة عبر المنصة' : '8 roles with fixed Role IDs — switch any role to preview its access live across the platform'}
          actions={<Button size="sm" onClick={() => setAddUserOpen(true)}><Users size={13} /> {isAr ? 'إضافة مستخدم' : 'Add User'}</Button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'معرف الدور' : 'Role ID'}</th>
                  <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'الدور' : 'Role'}</th>
                  <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'المستخدمون' : 'Users'}</th>
                  <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'الوحدات' : 'Modules'}</th>
                  {permCols.map((p) => <th key={p.key} className="text-center py-2.5 px-3 font-medium">{isAr ? p.ar : p.en}</th>)}
                  <th className="text-center py-2.5 px-3 font-medium">{isAr ? 'معاينة' : 'Preview'}</th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-100 transition-colors ${role.id === r.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="py-2.5 pe-4">
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">{r.id}</span>
                    </td>
                    <td className="py-2.5 pe-4 font-semibold text-slate-800">
                      {isAr ? r.nameAr : r.name}
                      {role.id === r.id && <Badge tone="emerald"><CheckCircle2 size={9} /> {isAr ? 'نشط' : 'Active'}</Badge>}
                    </td>
                    <td className="py-2.5 pe-4 text-slate-500">{userCounts[r.id] ?? r.users}</td>
                    <td className="py-2.5 pe-4 text-slate-500">{r.modules.length} / 14</td>
                    {permCols.map((p) => (
                      <td key={p.key} className="text-center py-2.5 px-3">
                        {r.perms[p.key]
                          ? <CheckCircle2 size={15} className="inline text-emerald-600" />
                          : <span className="inline-block w-3.5 h-0.5 bg-slate-300 rounded" />}
                      </td>
                    ))}
                    <td className="text-center py-2.5 px-3">
                      {role.id === r.id
                        ? <span className="text-[10px] text-emerald-600 font-semibold">{isAr ? 'الحالي' : 'Current'}</span>
                        : <Button variant="outline" size="sm" onClick={() => previewRole(r.id)}><Eye size={11} /> {isAr ? 'عرض' : 'View as'}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            {isAr
              ? 'التبديل يطبق فوراً: تتغير قائمة الوحدات في الشريط الجانبي وتتعطل الأزرار غير المصرح بها في كل الصفحات.'
              : 'Switching applies instantly: the sidebar modules change and unauthorized actions are disabled across every page.'}
          </p>
        </Card>
      )}

      {tab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title={isAr ? 'وضع النشر' : 'Deployment Posture'} subtitle={isAr ? 'كل شيء داخل البنية التحتية للمركز' : 'Everything stays inside NCEC infrastructure'}>
            <StatRow label={isAr ? 'النشر محلي بالكامل' : 'On-premise deployment'} value={<Badge tone="emerald"><Server size={11} /> {isAr ? 'مفعل' : 'Active'}</Badge>} sub={isAr ? 'لا اعتماد على أي سحابة' : 'Zero cloud dependency'} />
            <StatRow label={isAr ? 'الاتصالات الخارجية' : 'External connections'} value={<Badge tone="emerald">0</Badge>} sub={isAr ? 'معزول عن الإنترنت — البيانات لا تغادر المركز' : 'Air-gapped — data never leaves NCEC'} />
            <StatRow label={isAr ? 'التشفير أثناء التخزين' : 'Encryption at rest'} value={<Badge tone="emerald">AES-256</Badge>} />
            <StatRow label={isAr ? 'التشفير أثناء النقل' : 'Encryption in transit'} value={<Badge tone="emerald">TLS 1.3</Badge>} sub={isAr ? 'داخل الشبكة الداخلية' : 'internal network only'} />
            <StatRow label={isAr ? 'مصادقة المستخدمين' : 'User authentication'} value={<Badge tone="sky"><Fingerprint size={11} /> MFA</Badge>} />
            <StatRow label={isAr ? 'تكامل Active Directory / LDAP' : 'Active Directory / LDAP'} value={<Badge tone="sky"><Network size={11} /> {isAr ? 'متصل' : 'Connected'}</Badge>} sub="ncec.local" />
          </Card>
          <Card title={isAr ? 'ضوابط الأمان' : 'Security Controls'}>
            <div className="space-y-3">
              {[
                { en: 'Full audit logging (immutable, 7-year retention)', ar: 'تسجيل تدقيق كامل (غير قابل للتعديل، احتفاظ ٧ سنوات)' },
                { en: 'Session recording for privileged actions', ar: 'تسجيل الجلسات للإجراءات الحساسة' },
                { en: 'Document-level access enforcement in RAG retrieval', ar: 'فرض صلاحيات على مستوى الوثيقة أثناء الاسترجاع' },
                { en: 'Prompt-injection and data-exfiltration filtering', ar: 'تصفية حقن التعليمات وتسريب البيانات' },
                { en: 'Quarterly penetration testing & hardening review', ar: 'اختبار اختراق ربع سنوي ومراجعة التحصين' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <ShieldCheck size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600">{isAr ? c.ar : c.en}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'models' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title={isAr ? 'النماذج المحلية' : 'Local Model Registry'} subtitle={isAr ? 'نماذج مفتوحة المصدر — Ollama / vLLM — بدون واجهات خارجية' : 'Open-source LLMs — Ollama / vLLM — no external API dependency'}>
            <div className="space-y-2.5">
              {models.map((m) => (
                <div key={m.name} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <Cpu size={16} className="text-brand-600 shrink-0" />
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-xs font-mono font-semibold text-slate-800">{m.name}</p>
                    <p className="text-[10px] text-slate-400">{m.ft}</p>
                  </div>
                  <Badge tone="slate">{m.engine}</Badge>
                  <Badge tone="violet">ctx {m.ctx}</Badge>
                  <Badge tone={m.status === 'serving' ? 'emerald' : 'amber'}>{m.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => notify(isAr ? `تم فتح إعدادات ${m.name}` : `Opened settings for ${m.name}`)}>{isAr ? 'إعدادات' : 'Settings'}</Button>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><RefreshCcw size={12} /> {isAr ? 'التحسين المستمر' : 'Continuous Improvement'}</p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {isAr
                  ? 'التغذية الراجعة من المراجعين (قبول/تجاوز التوصيات، تصحيح الاقتباسات) تدخل في دورات الضبط الدقيق والتعلم المعزز على بيانات المركز — كل التدريب يتم محلياً.'
                  : 'Reviewer feedback (accepted/overridden recommendations, citation corrections) feeds fine-tuning and RLHF cycles on NCEC data — all training happens on-premise.'}
              </p>
            </div>
          </Card>
          <Card title={isAr ? 'قوالب التلقين' : 'Prompt Templates'} subtitle={isAr ? 'قوالب معتمدة ومدارة مركزياً' : 'Centrally managed & versioned'}>
            <div className="space-y-2">
              {promptTemplates.map((p) => (
                <div key={p} className="flex items-center gap-2.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                  <BookTemplate size={13} className="text-violet-600 shrink-0" />
                  <p className="text-xs text-slate-600 flex-1">{p}</p>
                  <Button variant="ghost" size="sm" onClick={() => notify(isAr ? `تم فتح القالب: ${p}` : `Opened template: ${p}`)}>{isAr ? 'تحرير' : 'Edit'}</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card title={isAr ? 'سجلات التدقيق' : 'Audit Logs'} subtitle={isAr ? 'كل إجراء مسجل: من، ماذا، متى، ومن أين' : 'Every action recorded: who, what, when, from where'} actions={<Button variant="outline" size="sm" onClick={() => notify(isAr ? 'تم تصدير سجل التدقيق' : 'Audit log exported')}><ScrollText size={13} /> {isAr ? 'تصدير السجل' : 'Export Log'}</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-200">
                <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'الوقت' : 'Time'}</th>
                <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'المستخدم' : 'User'}</th>
                <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'الدور' : 'Role'}</th>
                <th className="text-start py-2.5 pe-4 font-medium">{isAr ? 'الإجراء' : 'Action'}</th>
                <th className="text-start py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 pe-4 text-slate-400 font-mono">{a.time}</td>
                  <td className="py-2.5 pe-4 text-slate-800 font-semibold">{a.user}</td>
                  <td className="py-2.5 pe-4"><Badge tone="slate">{a.role}</Badge></td>
                  <td className="py-2.5 pe-4 text-slate-600">{a.action}</td>
                  <td className="py-2.5 text-slate-400 font-mono">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </Card>
      )}

      {tab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title={isAr ? 'إدارة قاعدة المعرفة' : 'Knowledge Base Management'}>
            <StatRow label={isAr ? 'حجم الفهرس المتجهي' : 'Vector index size'} value="41.2 GB" sub={isAr ? '18.6 مليون مقطع' : '18.6M chunks'} />
            <StatRow label={isAr ? 'إعادة الفهرسة المجدولة' : 'Scheduled re-indexing'} value={isAr ? 'أسبوعياً' : 'Weekly'} sub={isAr ? 'الجمعة 01:00' : 'Fridays 01:00'} />
            <StatRow label={isAr ? 'سياسة الإصدارات' : 'Version retention'} value={isAr ? 'كل الإصدارات' : 'All versions'} />
            <StatRow label={isAr ? 'الرسم المعرفي' : 'Knowledge graph'} value={<Badge tone="violet">{isAr ? 'مرحلة قادمة' : 'Future phase'}</Badge>} />
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-1.5">{isAr ? 'سعة التخزين المستخدمة' : 'Storage used'} — 6.8 / 20 TB</p>
              <ProgressBar value={34} tone="sky" />
            </div>
          </Card>
          <Card title={isAr ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore'}>
            <StatRow label={isAr ? 'نسخ يومي مشفر' : 'Daily encrypted backup'} value={<Badge tone="emerald">{isAr ? 'مفعل' : 'Enabled'}</Badge>} sub={isAr ? '02:00 — إلى خزنة داخلية ثانية' : '02:00 — to secondary on-site vault'} />
            <StatRow label={isAr ? 'آخر نسخة ناجحة' : 'Last successful backup'} value={isAr ? 'اليوم 02:00 (2.4 TB)' : 'Today 02:00 (2.4 TB)'} />
            <StatRow label={isAr ? 'اختبار الاستعادة' : 'Restore drill'} value={isAr ? 'شهرياً — آخره ناجح' : 'Monthly — last passed'} />
            <StatRow label={isAr ? 'هدف زمن الاستعادة' : 'Recovery time objective'} value="< 4h" />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={() => notify(isAr ? 'بدأ النسخ الاحتياطي الآن' : 'Backup started now')}><HardDriveDownload size={13} /> {isAr ? 'نسخ الآن' : 'Backup Now'}</Button>
              <Button variant="outline" size="sm" className="flex-1 justify-center" onClick={() => notify(isAr ? 'تم فتح إجراء الاستعادة' : 'Restore flow opened')}><RefreshCcw size={13} /> {isAr ? 'استعادة' : 'Restore'}</Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        title={isAr ? 'إضافة مستخدم' : 'Add User'}
        subtitle={isAr ? 'إضافة مستخدم تجريبي وربطه بدور محدد' : 'Add a demo user and assign a role'}
        maxW="max-w-md"
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الاسم' : 'Name'}</label>
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
              placeholder={isAr ? 'مثال: Abdullah Al-Qahtani' : 'e.g. Abdullah Al-Qahtani'}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
            <input
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
              placeholder="user@ncec.gov.sa"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'كلمة المرور' : 'Password'}</label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
              placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter password'}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'الدور' : 'Role'}</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.id} — {isAr ? r.nameAr : r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddUserOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button size="sm" onClick={addUser} disabled={!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()}>{isAr ? 'إضافة' : 'Add User'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={previewRoleData !== null}
        onClose={() => setPreviewRoleId(null)}
        title={isAr ? 'معاينة الدور' : 'Role Preview'}
        subtitle={previewRoleData ? `${previewRoleData.id} — ${isAr ? previewRoleData.nameAr : previewRoleData.name}` : undefined}
        maxW="max-w-lg"
      >
        {previewRoleData && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">{isAr ? 'عدد المستخدمين' : 'Users'}</p>
                  <p className="text-slate-800 font-semibold mt-1">{userCounts[previewRoleData.id] ?? previewRoleData.users}</p>
                </div>
                <div>
                  <p className="text-slate-400">{isAr ? 'الوحدات المتاحة' : 'Available modules'}</p>
                  <p className="text-slate-800 font-semibold mt-1">{previewRoleData.modules.length} / 14</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">{isAr ? 'الصلاحيات' : 'Permissions'}</p>
              <div className="space-y-1.5">
                {permCols.map((p) => (
                  <div key={p.key} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
                    <span className="text-slate-600">{isAr ? p.ar : p.en}</span>
                    {previewRoleData.perms[p.key]
                      ? <CheckCircle2 size={15} className="text-emerald-600" />
                      : <span className="text-slate-300">-</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">{isAr ? 'الوحدات التي سيشاهدها المستخدم' : 'Modules visible to this role'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {previewRoleData.modules.map((module) => (
                  <div key={module} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    {module}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewRoleId(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
              <Button size="sm" onClick={() => {
                setRoleId(previewRoleData.id)
                setPreviewRoleId(null)
                notify(isAr ? `تم تطبيق الدور ${previewRoleData.id}` : `Applied role ${previewRoleData.id}`)
              }}>
                {isAr ? 'تطبيق هذا الدور' : 'Apply this role'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
