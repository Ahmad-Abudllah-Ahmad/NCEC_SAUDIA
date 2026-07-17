import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Lock, Globe, ShieldCheck, Server, Languages, Fingerprint,
  KeyRound, UserCircle2, ArrowRight, Network,
} from 'lucide-react'
import { Badge, Button } from '../components/ui'
import { useLang } from '../i18n'
import { useRole, DEMO_USERS, ROLES } from '../roles'
import logo from '../assets/logo.png'
import logoAr from '../assets/logo-ar.png'

export default function Login() {
  const { lang, setLang } = useLang()
  const { user, login } = useRole()
  const navigate = useNavigate()
  const isAr = lang === 'ar'
  const [email, setEmail] = useState(DEMO_USERS[0].email)

  if (user) return <Navigate to="/" replace />

  const selected = DEMO_USERS.find((u) => u.email === email) ?? DEMO_USERS[0]
  const selectedRole = ROLES.find((r) => r.id === selected.roleId)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    login(selected)
    navigate('/', { replace: true })
  }

  const highlights = isAr
    ? [
        { icon: Server, text: 'نشر محلي بالكامل — البيانات لا تغادر المركز' },
        { icon: Languages, text: 'ذكاء وثائق عربي: بحث دلالي، تلخيص، وصياغة' },
        { icon: ShieldCheck, text: 'صلاحيات حسب الدور وسجلات تدقيق كاملة' },
      ]
    : [
        { icon: Server, text: 'Fully on-premise — data never leaves NCEC' },
        { icon: Languages, text: 'Arabic document intelligence: search, summarize, draft' },
        { icon: ShieldCheck, text: 'Role-based access with full audit logging' },
      ]

  return (
    <div className="min-h-full flex bg-white">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-10 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white relative overflow-hidden">
        <div className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-emerald-400/10 blur-2xl" />
        <div className="absolute -bottom-32 -start-16 w-[28rem] h-[28rem] rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-2 shadow-sm shrink-0">
              <img src={lang === 'ar' ? logoAr : logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">{isAr ? 'منصة الذكاء الاصطناعي' : 'NCEC AI Platform'}</p>
              <p className="text-[11px] text-emerald-100/80">{isAr ? 'ذكاء الوثائق المؤسسي' : 'Enterprise Document Intelligence'}</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-snug">
            {isAr
              ? 'المركز الوطني للرقابة على الالتزام البيئي'
              : 'National Center for Environmental Compliance'}
          </h1>
          <p className="text-sm text-emerald-100/85 mt-3 leading-relaxed">
            {isAr
              ? 'منصة معرفية ذكية للوثائق التنظيمية والدراسات البيئية — داخل بنية المركز التحتية بالكامل.'
              : 'An intelligent knowledge platform for regulatory documents and environmental studies — running entirely inside NCEC infrastructure.'}
          </p>
          <div className="mt-6 space-y-3">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-emerald-50/95">
                <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <h.icon size={15} />
                </span>
                {h.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-[11px] text-emerald-100/70">
          <Lock size={12} />
          {isAr ? 'معزول عن الإنترنت · تشفير AES-256 · تكامل Active Directory' : 'Air-gapped · AES-256 encryption · Active Directory integrated'}
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:border-emerald-600/60"
          >
            <Globe size={14} />
            {isAr ? 'English' : 'العربية'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 pb-10">
          <form onSubmit={submit} className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
              <img src={lang === 'ar' ? logoAr : logo} alt="Logo" className="w-16 h-16 object-contain" />
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{isAr ? 'منصة الذكاء الاصطناعي' : 'NCEC AI Platform'}</p>
                <p className="text-[10px] text-slate-500">{isAr ? 'ذكاء الوثائق المؤسسي' : 'Enterprise Document Intelligence'}</p>
              </div>
            </div>

            <div className="card p-6 shadow-lg">
              <h2 className="text-xl font-bold text-slate-900">{isAr ? 'تسجيل الدخول' : 'Sign in'}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? 'ادخل ببيانات اعتماد المركز أو عبر Active Directory' : 'Use your NCEC credentials or Active Directory SSO'}
              </p>

              <div className="mt-5 space-y-3.5">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'حساب تجريبي (يحدد الدور)' : 'Demo persona (sets the role)'}</label>
                  <div className="relative">
                    <UserCircle2 size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg ps-9 pe-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600/60 cursor-pointer"
                    >
                      {DEMO_USERS.map((u) => {
                        const r = ROLES.find((x) => x.id === u.roleId)
                        return (
                          <option key={u.email} value={u.email}>
                            {u.name} — {r ? (isAr ? r.nameAr : r.name) : u.roleId} ({u.roleId})
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{isAr ? selected.titleAr : selected.title}</p>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input
                    value={selected.email}
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{isAr ? 'كلمة المرور' : 'Password'}</label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      defaultValue="NCEC-demo-2026"
                      className="w-full bg-white border border-slate-300 rounded-lg ps-9 pe-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-600/60"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-500"><Fingerprint size={13} className="text-emerald-600" /> {isAr ? 'التحقق الثنائي مفعل' : 'MFA enabled'}</span>
                  {selectedRole && (
                    <Badge tone="emerald">{selectedRole.id} · {selectedRole.modules.length}/14 {isAr ? 'وحدة' : 'modules'}</Badge>
                  )}
                </div>

                <Button className="w-full justify-center" onClick={submit}>
                  {isAr ? 'تسجيل الدخول' : 'Sign In'} <ArrowRight size={15} className="rtl:rotate-180" />
                </Button>
                <Button variant="outline" className="w-full justify-center" onClick={submit}>
                  <Network size={14} /> {isAr ? 'الدخول عبر Active Directory' : 'Sign in with Active Directory'}
                </Button>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-1">
                  {isAr
                    ? 'بيئة عرض تجريبية — تُقبل أي بيانات اعتماد. الوصول مسجل في سجلات التدقيق.'
                    : 'Demo environment — any credentials are accepted. All access is audit-logged.'}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-4 flex items-center justify-center gap-1.5">
              <Lock size={10} />
              {isAr
                ? 'موقع حكومي — مسجل لدى هيئة الحكومة الرقمية · TLS 1.3'
                : 'Government platform — registered with the Digital Government Authority · TLS 1.3'}
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
