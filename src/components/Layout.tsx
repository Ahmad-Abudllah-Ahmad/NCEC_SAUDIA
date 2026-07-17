import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Database, MessageSquareText, Leaf, Scale, Gavel,
  FilePlus2, FileSearch, Sparkles, BarChart3, Search, ScanText,
  GitBranch, ShieldCheck, Globe, Lock, Menu, X, UserCog, LogOut, MapPin,
} from 'lucide-react'
import { useState } from 'react'
import { useLang } from '../i18n'
import { useRole, ROLES } from '../roles'
import { Button } from './ui'

import logo from '../assets/logo.png'
import logoAr from '../assets/logo-ar.png'

const navGroups = [
  {
    label: 'overview',
    items: [{ to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' }],
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
      { to: '/', icon: MapPin, key: 'interactiveMap' },
    ],
  },
  {
    label: 'administration',
    items: [{ to: '/admin', icon: ShieldCheck, key: 'admin' }],
  },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, t } = useLang()
  const { role } = useRole()
  const [hovered, setHovered] = useState(false)
  const { pathname } = useLocation()
  const isMapPage = pathname === '/'
  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed ${isMapPage ? 'lg:absolute lg:z-30 lg:bg-transparent lg:shadow-none' : 'lg:static'} inset-y-0 start-0 z-40 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
          hovered ? 'w-64' : 'w-24'
        } ${
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        } lg:translate-x-0 lg:rtl:translate-x-0`}
      >
        <button className="absolute end-4 top-4 lg:hidden text-slate-500 z-50" onClick={onClose}>
          <X size={18} />
        </button>
        <div className={`flex items-center justify-start ps-10 w-56 h-24 relative shrink-0 ${isMapPage ? 'border-b border-transparent bg-transparent' : 'border-b border-slate-200'}`}>
          <img src={lang === 'ar' ? logoAr : logo} alt="Logo" className="h-20 w-auto object-contain" />
        </div>
        <div className="flex-1 flex flex-col justify-center items-start">
          <nav
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`overflow-y-auto m-3 ms-5 p-3.5 space-y-4 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit transition-all duration-300 ease-in-out ${
              hovered ? 'w-[232px]' : 'w-16'
            }`}
          >
            {navGroups.map((group) => {
              const items = group.items.filter((i) => role.modules.includes(i.to))
              if (items.length === 0) return null
              return (
                <div key={group.label} className="space-y-1">
                  <p
                    className={`px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap transition-all duration-300 ${
                      hovered ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0 overflow-hidden mb-0'
                    }`}
                  >
                    {t(group.label)}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center rounded-lg text-[13px] font-medium transition-all duration-300 ${
                            hovered ? 'px-2.5 justify-start gap-2.5 w-full h-9' : 'w-9 h-9 justify-center'
                          } ${
                            isActive
                              ? 'bg-brand-600/10 text-brand-700 border border-brand-600/30'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                          }`
                        }
                      >
                        <item.icon size={16} className="shrink-0" />
                        <span
                          className={`truncate transition-all duration-300 ${
                            hovered ? 'opacity-100 max-w-[200px] ms-0' : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
                          }`}
                        >
                          {t(item.key)}
                        </span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>
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
  const { pathname } = useLocation()
  const isMapPage = pathname === '/'
  return (
    <header className={`h-24 shrink-0 flex items-center gap-3 px-4 lg:px-6 z-20 transition-all duration-300 ${
      isMapPage
        ? 'absolute top-0 start-0 end-0 bg-transparent border-b-0'
        : 'border-b border-slate-200 bg-white/85 backdrop-blur sticky top-0'
    }`}>
      <button className={`lg:hidden ${isMapPage ? 'text-white' : 'text-slate-600'}`} onClick={onMenu}><Menu size={20} /></button>
      <div className="ms-auto flex items-center gap-2 lg:gap-3">
        {/* Live role switcher — demonstrates working RBAC */}
        <div className={`flex items-center gap-1.5 border rounded-lg ps-2.5 pe-1.5 py-1 transition-all ${
          isMapPage
            ? 'bg-slate-900/90 border-slate-700/50 text-slate-200 shadow-2xl backdrop-blur-md'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <UserCog size={14} className="text-brand-600 shrink-0" />
          <span className="hidden sm:block text-[10px] text-slate-400 whitespace-nowrap">{t('viewAs')}</span>
          <select
            value={role.id}
            onChange={(e) => setRoleId(e.target.value)}
            className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer py-1 max-w-[150px] ${
              isMapPage ? 'text-white [&>option]:bg-slate-900 [&>option]:text-white' : 'text-slate-700'
            }`}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.id} — {isAr ? r.nameAr : r.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className={`flex items-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
            isMapPage
              ? 'bg-slate-900/90 border-slate-700/50 text-slate-200 hover:text-white hover:border-brand-500/60 shadow-2xl backdrop-blur-md'
              : 'text-slate-600 hover:text-slate-900 bg-white border-slate-300 hover:border-brand-600/60'
          }`}
        >
          <Globe size={14} />
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
        <div className="hidden md:flex items-center gap-2 ps-2 pe-1 py-1 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">{user?.initials ?? 'U'}</div>
          <div className="hidden lg:block text-start">
            <p className={`text-xs font-semibold leading-tight ${isMapPage ? 'text-white' : 'text-slate-900'}`}>{user?.name}</p>
            <p className={`text-[10px] ${isMapPage ? 'text-slate-400' : 'text-slate-500'}`}>{role.id} · {isAr ? role.nameAr : role.name}</p>
          </div>
        </div>
        <button
          title={t('signOut')}
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isMapPage
              ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800/40'
              : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
          }`}
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
  const isMapPage = pathname === '/'
  return (
    <div className="flex h-full relative overflow-hidden">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header onMenu={() => setOpen(true)} />
        <main className={`flex-1 ${
          isMapPage
            ? 'p-0 bg-transparent overflow-hidden h-full relative w-full'
            : 'overflow-y-auto p-4 lg:p-6 bg-white'
        }`}>
          {allowed ? <Outlet /> : <AccessGate />}
        </main>
      </div>
    </div>
  )
}
