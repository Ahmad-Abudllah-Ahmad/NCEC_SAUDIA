/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type Perms = {
  upload: boolean
  chat: boolean
  generate: boolean
  approve: boolean
  admin: boolean
}

export type Role = {
  id: string
  name: string
  nameAr: string
  users: number
  perms: Perms
  modules: string[]
}

const ALL = [
  '/', '/assistant', '/legal-assistant', '/search', '/data-analysis',
  '/knowledge-base', '/environmental-studies', '/regulatory', '/generation',
  '/review', '/ocr', '/recommendations', '/workflows', '/admin', '/dashboard',
]

export const ROLES: Role[] = [
  {
    id: 'ROLE-01', name: 'Super Admin', nameAr: 'المشرف العام', users: 3,
    perms: { upload: true, chat: true, generate: true, approve: true, admin: true },
    modules: ALL,
  },
  {
    id: 'ROLE-02', name: 'Department Manager', nameAr: 'مدير إدارة', users: 12,
    perms: { upload: true, chat: true, generate: true, approve: true, admin: false },
    modules: ALL.filter((m) => m !== '/admin'),
  },
  {
    id: 'ROLE-03', name: 'Reviewer', nameAr: 'مراجع', users: 38,
    perms: { upload: true, chat: true, generate: true, approve: false, admin: false },
    modules: ['/', '/assistant', '/search', '/knowledge-base', '/environmental-studies', '/regulatory', '/review', '/recommendations', '/workflows', '/dashboard'],
  },
  {
    id: 'ROLE-04', name: 'Legal Team', nameAr: 'الفريق القانوني', users: 21,
    perms: { upload: true, chat: true, generate: true, approve: false, admin: false },
    modules: ['/', '/assistant', '/legal-assistant', '/search', '/knowledge-base', '/regulatory', '/generation', '/review', '/workflows', '/dashboard'],
  },
  {
    id: 'ROLE-05', name: 'Technical Team', nameAr: 'الفريق الفني', users: 44,
    perms: { upload: true, chat: true, generate: false, approve: false, admin: false },
    modules: ['/', '/assistant', '/search', '/data-analysis', '/knowledge-base', '/ocr', '/workflows', '/dashboard'],
  },
  {
    id: 'ROLE-06', name: 'Environmental Team', nameAr: 'الفريق البيئي', users: 57,
    perms: { upload: true, chat: true, generate: false, approve: false, admin: false },
    modules: ['/', '/assistant', '/search', '/data-analysis', '/knowledge-base', '/environmental-studies', '/ocr', '/workflows', '/dashboard'],
  },
  {
    id: 'ROLE-07', name: 'External Consultant', nameAr: 'استشاري خارجي', users: 9,
    perms: { upload: false, chat: true, generate: false, approve: false, admin: false },
    modules: ['/', '/assistant', '/search', '/knowledge-base', '/dashboard'],
  },
  {
    id: 'ROLE-08', name: 'Read Only', nameAr: 'قراءة فقط', users: 100,
    perms: { upload: false, chat: false, generate: false, approve: false, admin: false },
    modules: ['/', '/search', '/knowledge-base', '/dashboard'],
  },
]

export type DemoUser = {
  name: string
  email: string
  roleId: string
  initials: string
  title: string
  titleAr: string
}

export const DEMO_USERS: DemoUser[] = [
  { name: 'Ahmed Al-Khalidi', email: 'a.khalidi@ncec.gov.sa', roleId: 'ROLE-01', initials: 'AK', title: 'IT & AI Platform Administrator', titleAr: 'مشرف منصة الذكاء الاصطناعي' },
  { name: 'Khalid Al-Shehri', email: 'k.shehri@ncec.gov.sa', roleId: 'ROLE-02', initials: 'KS', title: 'Director — Environmental Licensing', titleAr: 'مدير إدارة التراخيص البيئية' },
  { name: 'Sara Al-Otaibi', email: 's.otaibi@ncec.gov.sa', roleId: 'ROLE-03', initials: 'SO', title: 'Senior Environmental Reviewer', titleAr: 'مراجعة بيئية أولى' },
  { name: 'Mona Al-Harbi', email: 'm.harbi@ncec.gov.sa', roleId: 'ROLE-04', initials: 'MH', title: 'Legal Counsel', titleAr: 'مستشارة قانونية' },
  { name: 'Fahad Al-Dossary', email: 'f.dossary@ncec.gov.sa', roleId: 'ROLE-05', initials: 'FD', title: 'Technical Systems Engineer', titleAr: 'مهندس أنظمة تقنية' },
  { name: 'Noura Al-Qahtani', email: 'n.qahtani@ncec.gov.sa', roleId: 'ROLE-06', initials: 'NQ', title: 'Environmental Specialist', titleAr: 'أخصائية بيئية' },
  { name: 'James Carter', email: 'j.carter@consultant.ext', roleId: 'ROLE-07', initials: 'JC', title: 'External EIA Consultant', titleAr: 'استشاري تقييم أثر خارجي' },
  { name: 'Guest Viewer', email: 'viewer@ncec.gov.sa', roleId: 'ROLE-08', initials: 'GV', title: 'Observer Account', titleAr: 'حساب مطّلع' },
]

const STORAGE_KEY = 'ncec-demo-user'

const RoleContext = createContext<{
  role: Role
  setRoleId: (id: string) => void
  user: DemoUser | null
  login: (u: DemoUser) => void
  logout: () => void
}>({ role: ROLES[0], setRoleId: () => {}, user: null, login: () => {}, logout: () => {} })

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as DemoUser) : null
    } catch {
      return null
    }
  })
  const [roleId, setRoleId] = useState(user?.roleId ?? 'ROLE-01')
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0]

  const login = (u: DemoUser) => {
    setUser(u)
    setRoleId(u.roleId)
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch { /* private mode */ }
  }

  const logout = () => {
    setUser(null)
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* private mode */ }
  }

  return <RoleContext.Provider value={{ role, setRoleId, user, login, logout }}>{children}</RoleContext.Provider>
}

export const useRole = () => useContext(RoleContext)
