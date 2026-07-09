import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Database, MessageSquareText, Leaf, Scale, Gavel,
  FilePlus2, FileSearch, Sparkles, BarChart3, Search, ScanText,
  GitBranch, ShieldCheck, Globe, Bell, Cpu, Lock, Menu, X, UserCog, LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { useLang } from '../i18n'
import { useRole, ROLES } from '../roles'
import { Button } from './ui'

const navGroups = [
  {
    label: 'overview',
    items: [{ to: '/', icon: LayoutDashboard, key: 'dashboard' }],
  },
  {
    label: 'aiWorkspace',
    items: [
      { to: '/assistant', icon: MessageSquareText, key: 'docAssistant' },
      { to: '/legal-assistant', icon: Gavel, key: 'legalAssistant' },
      { to: '/search', icon: Search, key: 'search' },
      { to: '/data-analysis', icon: BarChart3, key: 'dataAnalysis' },
    ],
  },
  {
    label: 'documents',
    items: [
      { to: '/knowledge-base', icon: Database, key: 'knowledgeBase' },
      { to: '/environmental-studies', icon: Leaf, key: 'envStudies' },
      { to: '/regulatory', icon: Scale, key: 'regulatoryAI' },
      { to: '/generation', icon: FilePlus2, key: 'docGeneration' },
      { to: '/review', icon: FileSearch, key: 'docReview' },
      { to: '/ocr', icon: ScanText, key: 'ocr' },
    ],
  },
  {
    label: 'operations',
    items: [
      { to: '/recommendations', icon: Sparkles, key: 'recommendations' },
      { to: '/workflows', icon: GitBranch, key: 'workflows' },
    ],
  },
  {
    label: 'administration',
    items: [{ to: '/admin', icon: ShieldCheck, key: 'admin' }],
  },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const { role } = useRole()
  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:static inset-y-0 start-0 z-40 w-64 shrink-0 bg-white border-e border-slate-200 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-[0_2px_10px_rgba(16,185,129,0.35)]">
            <Leaf size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">{t('appName')}</p>
            <p className="text-[10px] text-slate-500 truncate">{t('appSub')}</p>
          </div>
          <button className="ms-auto lg:hidden text-slate-500" onClick={onClose}><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {navGroups.map((group) => {
            const items = group.items.filter((i) => role.modules.includes(i.to))
            if (items.length === 0) return null
            return (
              <div key={group.label}>
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{t(group.label)}</p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-600/10 text-brand-700 border border-brand-600/30'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                        }`
                      }
                    >
                      <item.icon size={16} className="shrink-0" />
                      <span className="truncate">{t(item.key)}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Lock size={13} className="text-brand-600" />
              <span className="font-semibold">{t('onPremise')}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <Cpu size={12} />
              <span>{t('localLLM')}</span>
              <span className="ms-auto flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-dot animate-pulse-soft" />
                Online
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function Header({ onMenu }: { onMenu: () => void }) {
  const { lang, setLang, t } = useLang()
  const { role, setRoleId, user, logout } = useRole()
  const navigate = useNavigate()
  const isAr = lang === 'ar'
  return (
    <header className="h-16 shrink-0 border-b border-slate-200 bg-white/85 backdrop-blur flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
      <button className="lg:hidden text-slate-600" onClick={onMenu}><Menu size={20} /></button>
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative w-full">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg ps-9 pe-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-brand-600/60 focus:bg-white"
            placeholder={t('searchPlaceholder')}
          />
        </div>
      </div>
      <div className="ms-auto flex items-center gap-2 lg:gap-3">
        <span className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 glow-dot animate-pulse-soft" />
          {t('systemHealthy')}
        </span>

        {/* Live role switcher — demonstrates working RBAC */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg ps-2.5 pe-1.5 py-1">
          <UserCog size={14} className="text-brand-600 shrink-0" />
          <span className="hidden sm:block text-[10px] text-slate-400 whitespace-nowrap">{t('viewAs')}</span>
          <select
            value={role.id}
            onChange={(e) => setRoleId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1 max-w-[150px]"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.id} — {isAr ? r.nameAr : r.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:border-brand-600/60"
        >
          <Globe size={14} />
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
        <button className="relative text-slate-500 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-rose-500 glow-dot" />
        </button>
        <div className="hidden md:flex items-center gap-2 ps-2 pe-1 py-1 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">{user?.initials ?? 'U'}</div>
          <div className="hidden lg:block text-start">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500">{role.id} · {isAr ? role.nameAr : role.name}</p>
          </div>
        </div>
        <button
          title={t('signOut')}
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="text-slate-500 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

function AccessGate() {
  const { t } = useLang()
  const { role } = useRole()
  const { lang } = useLang()
  const navigate = useNavigate()
  const isAr = lang === 'ar'
  return (
    <div className="h-full flex items-center justify-center">
      <div className="card p-8 max-w-md text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
          <Lock size={24} className="text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mt-4">{t('accessRestricted')}</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          <span className="font-semibold text-slate-700">{role.id} — {isAr ? role.nameAr : role.name}</span>
          <br />
          {t('accessRestrictedDesc')}
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={() => navigate('/')}>{t('backToDashboard')}</Button>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { role, user } = useRole()
  const { pathname } = useLocation()
  const allowed = role.modules.includes(pathname)
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="flex h-full">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenu={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_55%)]">
          {allowed ? <Outlet /> : <AccessGate />}
        </main>
      </div>
    </div>
  )
}
