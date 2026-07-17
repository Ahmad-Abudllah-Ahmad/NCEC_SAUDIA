/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'en' | 'ar'

type Dict = Record<string, { en: string; ar: string }>

export const dict: Dict = {
  appName: { en: 'NCEC AI Platform', ar: 'منصة الذكاء الاصطناعي' },
  appSub: { en: 'Enterprise Document Intelligence', ar: 'ذكاء الوثائق المؤسسي' },
  orgName: { en: 'National Center for Environmental Compliance', ar: 'المركز الوطني للرقابة على الالتزام البيئي' },
  onPremise: { en: 'On-Premise · Air-Gapped', ar: 'محلي · معزول عن الإنترنت' },
  // nav groups
  overview: { en: 'Overview', ar: 'نظرة عامة' },
  aiWorkspace: { en: 'AI Workspace', ar: 'مساحة الذكاء الاصطناعي' },
  documents: { en: 'Documents', ar: 'الوثائق' },
  operations: { en: 'Operations', ar: 'العمليات' },
  administration: { en: 'Administration', ar: 'الإدارة' },
  // nav items
  dashboard: { en: 'Management Dashboard', ar: 'لوحة القيادة' },
  knowledgeBase: { en: 'Knowledge Base', ar: 'قاعدة المعرفة' },
  docAssistant: { en: 'AI Document Assistant', ar: 'مساعد الوثائق الذكي' },
  envStudies: { en: 'Environmental Studies', ar: 'الدراسات البيئية' },
  regulatoryAI: { en: 'Regulatory & Legal AI', ar: 'الذكاء التنظيمي والقانوني' },
  legalAssistant: { en: 'AI Legal Assistant', ar: 'المساعد القانوني الذكي' },
  docGeneration: { en: 'Document Generation', ar: 'إنشاء الوثائق' },
  docReview: { en: 'Document Review', ar: 'مراجعة الوثائق' },
  recommendations: { en: 'Recommendation Engine', ar: 'محرك التوصيات' },
  dataAnalysis: { en: 'Data Analysis', ar: 'تحليل البيانات' },
  search: { en: 'Enterprise Search', ar: 'البحث المؤسسي' },
  ocr: { en: 'OCR Module', ar: 'التعرف الضوئي على الحروف' },
  workflows: { en: 'Workflow Automation', ar: 'أتمتة سير العمل' },
  admin: { en: 'Admin & Security', ar: 'الإدارة والأمان' },
  interactiveMap: { en: 'Interactive Map', ar: 'الخريطة التفاعلية' },
  // common
  searchPlaceholder: { en: 'Search documents, regulations, studies…', ar: 'ابحث في الوثائق والأنظمة والدراسات…' },
  systemHealthy: { en: 'All Systems Operational', ar: 'جميع الأنظمة تعمل' },
  localLLM: { en: 'Local LLM Cluster', ar: 'عنقود النماذج المحلية' },
  viewAll: { en: 'View all', ar: 'عرض الكل' },
  export: { en: 'Export', ar: 'تصدير' },
  upload: { en: 'Upload', ar: 'رفع' },
  viewAs: { en: 'View as role', ar: 'عرض بدور' },
  accessRestricted: { en: 'Access Restricted', ar: 'الوصول مقيد' },
  accessRestrictedDesc: {
    en: 'Your current role does not have permission to open this module. Switch role from the header to preview different access levels.',
    ar: 'دورك الحالي لا يملك صلاحية فتح هذه الوحدة. بدّل الدور من الشريط العلوي لمعاينة مستويات وصول مختلفة.',
  },
  backToDashboard: { en: 'Back to Dashboard', ar: 'العودة إلى لوحة القيادة' },
  requiresPermission: { en: 'Not permitted for this role', ar: 'غير متاح لهذا الدور' },
  signOut: { en: 'Sign out', ar: 'تسجيل الخروج' },
}

const LangContext = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
  isRTL: boolean
}>({ lang: 'en', setLang: () => {}, t: (k) => k, isRTL: false })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const isRTL = lang === 'ar'

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, isRTL])

  const t = (key: string) => dict[key]?.[lang] ?? key

  return <LangContext.Provider value={{ lang, setLang, t, isRTL }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)
