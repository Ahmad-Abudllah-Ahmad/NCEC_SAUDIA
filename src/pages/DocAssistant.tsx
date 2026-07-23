import { useState, useRef, useEffect } from 'react'
import {
  Send, Bot, User, FileText, BookOpen, Quote, Sparkles, Paperclip,
  Languages, Brain, CheckCheck, Lock, ShieldCheck, RefreshCw
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PageHeader, Card, Badge, Button, Modal, chartTooltip } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { translateText } from '../lib/llm'
import { askRAG } from '../lib/rag'

type Citation = { doc: string; page: number; excerpt: string }

const mdComponents = {
  p: ({children}: any) => <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
  ul: ({children}: any) => <ul className="list-disc list-outside ms-4 mb-2 space-y-1">{children}</ul>,
  ol: ({children}: any) => <ol className="list-decimal list-outside ms-4 mb-2 space-y-1">{children}</ol>,
  li: ({children}: any) => <li>{children}</li>,
  h1: ({children}: any) => <h1 className="font-bold text-lg mb-2 mt-3 text-slate-900">{children}</h1>,
  h2: ({children}: any) => <h2 className="font-semibold text-base mb-2 mt-3 text-amber-900 border-b border-amber-200/40 pb-1">{children}</h2>,
  h3: ({children}: any) => <h3 className="font-semibold text-sm mb-2 mt-2 text-slate-800">{children}</h3>,
  strong: ({children}: any) => <strong className="font-semibold text-amber-800 bg-amber-50/80 px-1 py-0.5 rounded border border-amber-200/50">{children}</strong>,
  em: ({children}: any) => <em className="italic text-slate-600">{children}</em>,
  code: ({children}: any) => <code className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-mono">{children}</code>
}

const TypewriterMarkdown = ({ text, isTyping }: { text: string; isTyping?: boolean }) => {
  const [displayed, setDisplayed] = useState(isTyping ? '' : text)

  useEffect(() => {
    if (!isTyping) {
      setDisplayed(text)
      return
    }
    
    let i = 0
    const timer = setInterval(() => {
      i += 3 // Type 3 characters at a time for smooth speed
      setDisplayed(text.slice(0, Math.min(i, text.length)))
      if (i >= text.length) clearInterval(timer)
    }, 15)
    
    return () => clearInterval(timer)
  }, [text, isTyping])

  return (
    <div className="text-sm text-slate-700" dir="auto">
      <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>
    </div>
  )
}

type Msg = {
  role: 'user' | 'ai'
  text: string
  citations?: Citation[]
  confidence?: number
  isTyping?: boolean
}

const initialMsgs: Msg[] = [
  {
    role: 'user',
    text: 'ما هي متطلبات الحصول على التصريح البيئي للمنشآت الصناعية من الفئة الأولى؟',
  },
  {
    role: 'ai',
    text: 'وفقاً للائحة التنفيذية لنظام البيئة، تتطلب المنشآت الصناعية من الفئة الأولى (الأنشطة ذات الأثر البيئي المرتفع) ما يلي:\n\n1. تقديم دراسة تقييم الأثر البيئي (EIA) كاملة معدّة من جهة استشارية مؤهلة\n2. خطة إدارة بيئية تشمل برنامج الرصد الذاتي\n3. تحديد التقنيات المتاحة الأفضل (BAT) لمعالجة الانبعاثات\n4. خطة الطوارئ البيئية والاستجابة للحوادث\n\nمدة دراسة الطلب: 60 يوم عمل من اكتمال المستندات.',
    citations: [
      { doc: 'اللائحة التنفيذية لنظام البيئة — الإصدار الرابع', page: 47, excerpt: 'المادة 14: تلتزم جميع منشآت الفئة الأولى ذات الأثر البيئي المرتفع بتقديم دراسة تقييم الأثر البيئي (EIA) متكاملة ومعدة بواسطة مكاتب استشارية معتمدة، على أن تشتمل على خطة إدارة بيئية شاملة، وبرنامج محدد للرصد الذاتي الدوري، بالإضافة إلى خطة الطوارئ البيئية والاستجابة السريعة للحوادث وفقاً للاشتراطات المعتمدة لدى المركز الوطني للرقابة على الالتزام البيئي.' },
    ],
  },
  {
    role: 'user',
    text: 'Compare these requirements with Category 2 facilities and summarize the differences in English.',
  },
  {
    role: 'ai',
    text: 'Key differences between Category 1 and Category 2 facilities:\n\n• Environmental Study: Category 1 requires a full EIA study; Category 2 requires only a simplified Environmental Impact Assessment Report (EIAR).\n• Review Period: 60 business days (Cat 1) vs. 30 business days (Cat 2).\n• Monitoring: Cat 1 mandates continuous self-monitoring with quarterly reporting; Cat 2 requires semi-annual reporting.\n• Emergency Plan: Mandatory for Cat 1; required for Cat 2 only when handling hazardous materials.\n\nBoth categories require renewal every 5 years and are subject to periodic inspection.',
    citations: [
      { doc: 'Executive Regulation of Environmental Law — 4th Ed.', page: 52, excerpt: 'Article 16: Category 2 facilities (medium environmental impact activities) shall submit a simplified Environmental Impact Assessment Report (EIAR). The review timeline is set to 30 business days upon full receipt of technical documentation, requiring semi-annual self-monitoring reports and emergency plans strictly when hazardous materials or chemicals are handled on site.' },
    ],
  },
]

const suggested = [
  { ar: 'لخص دراسة الأثر البيئي لمشروع البحر الأحمر', en: 'Summarize the Red Sea project EIA study' },
  { ar: 'ما العقوبات المترتبة على تجاوز حدود الانبعاثات؟', en: 'What are penalties for exceeding emission limits?' },
  { ar: 'ابحث في جميع التعاميم الصادرة في 2026', en: 'Search all circulars issued in 2026' },
]

const scopedDocs = [
  { name: 'اللائحة التنفيذية لنظام البيئة', pages: 214 },
  { name: 'دليل التصاريح البيئية للمنشآت', pages: 96 },
  { name: 'EIA — Red Sea Coastal Development', pages: 612 },
  { name: 'تعميم 45/2026', pages: 6 },
]

const usage7d = [
  { x: 'Sun', v: 214 }, { x: 'Mon', v: 342 }, { x: 'Tue', v: 386 },
  { x: 'Wed', v: 351 }, { x: 'Thu', v: 428 }, { x: 'Fri', v: 118 }, { x: 'Sat', v: 92 },
]

export default function DocAssistant() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canChat = role.perms.chat
  const [msgs, setMsgs] = useState<Msg[]>(initialMsgs)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [scope, setScope] = useState<boolean[]>(scopedDocs.map(() => true))
  const [entireKb, setEntireKb] = useState(false)
  const [viewer, setViewer] = useState<Citation | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  
  const [translations, setTranslations] = useState<Record<number, { orig: string; trans: string; showing: 'orig' | 'trans' }>>({})
  const [translating, setTranslating] = useState<Record<number, boolean>>({})

  const handleTranslate = async (index: number, text: string) => {
    const state = translations[index]
    if (state) {
      const nextShowing: 'orig' | 'trans' = state.showing === 'orig' ? 'trans' : 'orig'
      setTranslations((prev) => ({
        ...prev,
        [index]: { ...state, showing: nextShowing }
      }))
      return
    }

    const isArabic = /[\u0600-\u06FF]/.test(text)
    const targetLang = isArabic ? 'en' : 'ar'

    setTranslating((prev) => ({ ...prev, [index]: true }))
    try {
      const result = await translateText(text, targetLang)
      const newShowing: 'orig' | 'trans' = 'trans'
      setTranslations((prev) => ({
        ...prev,
        [index]: { orig: text, trans: result, showing: newShowing }
      }))
    } catch (err) {
      console.error('Translate error:', err)
    } finally {
      setTranslating((prev) => ({ ...prev, [index]: false }))
    }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  const send = async () => {
    if (!input.trim() || !canChat) return
    const q = input.trim()
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)

    try {
      setMsgs((m) => [...m, { role: 'ai', text: '', citations: [], isTyping: false }])

      const { answer, citations } = await askRAG(q, 'document', (chunk) => {
        setMsgs((m) => {
          const newM = [...m]
          newM[newM.length - 1].text += chunk
          return newM
        })
      })

      setMsgs((m) => {
        const newM = [...m]
        const last = newM[newM.length - 1]
        if (!last.text) last.text = answer
        last.citations = citations.length ? [citations[0]] : []
        return newM
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setMsgs((m) => [...m, {
        role: 'ai',
        text: isAr
          ? `تعذر الاتصال بمحرك الذكاء الاصطناعي. تأكد من تشغيل Ollama محلياً (ollama pull llama3.2:1b && ollama pull nomic-embed-text) أو ضبط OLLAMA_HOST على Render.\n\n${msg}`
          : `Could not reach the AI engine. Ensure Ollama is running locally (ollama pull llama3.2:1b && ollama pull nomic-embed-text) or set OLLAMA_HOST on Render.\n\n${msg}`,
      }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={isAr ? 'مساعد الوثائق الذكي' : 'AI Document Assistant'}
        subtitle={isAr
          ? 'محادثة طبيعية مع الوثائق — عربي وإنجليزي، مع اقتباسات دقيقة برقم الصفحة وذاكرة محادثة'
          : 'Natural-language chat with documents — Arabic & English, exact citations with page numbers, conversation memory'}
        actions={
          <>
            <Badge tone="emerald"><Brain size={11} /> RAG</Badge>
            <Badge tone="sky"><Languages size={11} /> AR / EN</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Chat */}
        <Card className="xl:col-span-3 flex flex-col min-h-[560px]">
          <div className="flex-1 overflow-y-auto space-y-4 pe-1">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  m.role === 'ai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-sky-50 text-sky-600 border border-sky-200'
                }`}>
                  {m.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className={`max-w-[85%] ${m.role === 'user' ? 'text-end' : ''}`}>
                  <div className={`rounded-xl px-4 py-3 ${
                    m.role === 'ai' ? 'bg-slate-50 border border-slate-200' : 'bg-sky-50 border border-sky-200 text-slate-800 text-sm leading-relaxed whitespace-pre-line'
                  }`} dir="auto">
                    {m.role === 'ai' ? (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI DOCUMENT ASSISTANT</span>
                          <div className="flex items-center gap-1.5">
                            {m.citations && m.citations.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setViewer(m.citations![0])}
                                title={isAr ? 'عرض مقتطفات ومصادر الوثيقة في نافذة منبثقة' : 'View citation source passage in popup window'}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-[11px] font-medium text-amber-800 hover:text-amber-900 transition-all cursor-pointer shadow-2xs group"
                              >
                                <Quote size={11} className="text-amber-600 group-hover:scale-110 transition-transform" />
                                <span>{isAr ? 'المصادر' : 'Citations'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleTranslate(i, m.text)}
                              disabled={translating[i]}
                              title={isAr ? 'تحويل اللغة في الوقت الفعلي (عربي / إنجليزي)' : 'Convert language in real time (EN / AR)'}
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-[11px] font-medium text-slate-600 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs group"
                            >
                              <RefreshCw size={11} className={translating[i] ? "animate-spin text-emerald-600" : "text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:rotate-180"} />
                              <span>
                                {translating[i]
                                  ? (isAr ? 'جاري التحويل...' : 'Converting...')
                                  : translations[i]
                                    ? (translations[i].showing === 'trans' ? (isAr ? 'النص الأصلي' : 'Original') : (isAr ? 'ترجمة' : 'Translate'))
                                    : (/[\u0600-\u06FF]/.test(m.text) ? 'English' : 'عربي')}
                              </span>
                            </button>
                          </div>
                        </div>
                        <TypewriterMarkdown
                          text={translations[i] ? (translations[i].showing === 'trans' ? translations[i].trans : translations[i].orig) : m.text}
                          isTyping={m.isTyping && !translations[i]}
                        />
                      </>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center"><Bot size={16} /></div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 typing-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 typing-dot" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Suggested prompts */}
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 mb-3">
            {suggested.map((s, i) => (
              <button key={i} onClick={() => canChat && setInput(isAr ? s.ar : s.en)}
                className={`text-[11px] text-slate-500 transition-colors ${
                  canChat ? 'hover:text-emerald-700 cursor-pointer underline underline-offset-2' : 'opacity-50 cursor-not-allowed'
                }`}>
                <Sparkles size={10} className="inline me-1" />{isAr ? s.ar : s.en}
              </button>
            ))}
          </div>

          {/* Input */}
          {canChat ? (
            <div className="flex items-center gap-2 border border-slate-300 rounded-xl bg-white px-3 py-2 focus-within:border-brand-600/60 transition-colors">
              <button className="text-slate-400 hover:text-slate-600"><Paperclip size={17} /></button>
              <input
                dir="auto"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={isAr ? 'اسأل عن أي وثيقة… (عربي أو إنجليزي)' : 'Ask anything about your documents… (Arabic or English)'}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <Button size="sm" onClick={send}><Send size={14} className="rtl:rotate-180" /> {isAr ? 'إرسال' : 'Send'}</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
              <Lock size={14} className="text-rose-400" />
              {role.id} · {t('requiresPermission')}
            </div>
          )}
        </Card>

        {/* Context panel */}
        <div className="space-y-4">
          <Card
            title={isAr ? 'نطاق البحث' : 'Search Scope'}
            subtitle={isAr ? 'بحث متعدد الوثائق' : 'Multi-document search enabled'}
            actions={entireKb
              ? <Badge tone="emerald">11,393 {isAr ? 'وثيقة' : 'docs'}</Badge>
              : <Badge tone="slate">{scope.filter(Boolean).length}/{scopedDocs.length} {isAr ? 'محدد' : 'selected'}</Badge>}
          >
            <div className="space-y-2">
              {scopedDocs.map((d, i) => (
                <div key={d.name} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                  entireKb ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <FileText size={14} className="text-rose-500 shrink-0" />
                  <div className="min-w-0 flex-1" dir="auto">
                    <p className="text-xs text-slate-700 truncate">{d.name}</p>
                    <p className="text-[10px] text-slate-400">{d.pages} {isAr ? 'صفحة' : 'pages'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={entireKb || scope[i]}
                    disabled={entireKb}
                    onChange={() => setScope((s) => s.map((v, j) => (j === i ? !v : v)))}
                    className="accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
            <Button
              variant={entireKb ? 'primary' : 'outline'}
              size="sm"
              className="w-full mt-3 justify-center"
              onClick={() => setEntireKb((v) => !v)}
            >
              {entireKb ? <CheckCheck size={13} /> : <BookOpen size={13} />}
              {isAr ? 'كل قاعدة المعرفة' : 'Entire knowledge base'}
            </Button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              {entireKb
                ? (isAr ? 'يشمل البحث جميع الوثائق المفهرسة (11,393) — انقر للعودة للنطاق المحدد' : 'Searching all 11,393 indexed documents — click again to return to selected scope')
                : (isAr ? 'البحث محصور في الوثائق المحددة أعلاه' : 'Search limited to the documents selected above')}
            </p>
          </Card>

          <Card title={isAr ? 'استخدام المساعد — 7 أيام' : 'Assistant Usage — 7 Days'} subtitle={isAr ? 'مرر على الرسم لعرض التفاصيل' : 'Hover the line for details'}>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={usage7d} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="au" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltip} />
                <Area type="monotone" dataKey="v" name={isAr ? 'محادثات' : 'Sessions'} stroke="#059669" strokeWidth={2} fill="url(#au)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

        </div>
      </div>

      {/* Citation source viewer Popup Modal */}
      <Modal
        open={viewer !== null}
        onClose={() => setViewer(null)}
        title={viewer?.doc}
        subtitle={isAr ? 'تفاصيل الاقتباس والمصدر المسترجع' : 'Retrieved Source & Citation Details'}
        maxW="max-w-2xl"
      >
        {viewer && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge tone="emerald"><ShieldCheck size={10} /> {isAr ? 'مصدر موثق' : 'Verified Source'}</Badge>
              <Badge tone="sky">{isAr ? 'مفهرس — قاعدة المعرفة' : 'Indexed — Vector DB'}</Badge>
              <Badge tone="slate">{isAr ? 'صفحة' : 'Page'} {viewer.page || 1}</Badge>
            </div>

            {/* Document passage content */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-inner" dir="auto">
              <div className="rounded-lg bg-white border border-amber-200/80 p-4 shadow-2xs">
                <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1.5 border-b border-amber-100 pb-2">
                  <Quote size={14} className="text-amber-600" />
                  {isAr ? 'النص المقتبس المسترجع من الوثيقة:' : 'Retrieved Citation Passage:'}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                  "{viewer.excerpt}"
                </p>
              </div>
            </div>

            {/* Bottom info bar showing Document Name and Page as required */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <FileText size={14} className="text-amber-600 shrink-0" />
                <span className="truncate max-w-xs">{viewer.doc}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  {isAr ? 'صفحة' : 'Page'} {viewer.page || 1}
                </span>
              </div>
              <Button size="sm" onClick={() => setViewer(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
