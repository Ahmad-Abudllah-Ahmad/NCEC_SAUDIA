import { useState, useRef, useEffect } from 'react'
import { Send, Gavel, Bot, User, Scale, FolderSearch, Quote, Lock, ShieldCheck, FileText, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PageHeader, Card, Badge, Button, ConfidenceRing, chartTooltip, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { askRAG } from '../lib/rag'
import { translateText } from '../lib/llm'

const similarCases = [
  { id: 'CASE-2024-118', title: 'Industrial discharge violation — Yanbu facility', ar: 'مخالفة تصريف صناعي — منشأة ينبع', similarity: 94, outcome: 'Fine + corrective plan', outcomeAr: 'غرامة + خطة تصحيحية' },
  { id: 'CASE-2023-402', title: 'Permit renewal dispute — desalination operator', ar: 'نزاع تجديد تصريح — مشغل تحلية', similarity: 87, outcome: 'Conditional approval', outcomeAr: 'موافقة مشروطة' },
  { id: 'CASE-2025-067', title: 'Unlicensed waste transport appeal', ar: 'استئناف نقل نفايات دون ترخيص', similarity: 81, outcome: 'Appeal rejected', outcomeAr: 'رفض الاستئناف' },
]

const quickTopics = [
  { en: 'Explain Article 32 penalty clauses', ar: 'اشرح بنود العقوبات في المادة ٣٢' },
  { en: 'Which regulation governs coastal projects?', ar: 'أي لائحة تحكم المشاريع الساحلية؟' },
  { en: 'Advise on inspection appeal procedure', ar: 'ما إجراءات الاعتراض على التفتيش؟' },
]

const usage7d = [
  { x: 'Sun', v: 84 }, { x: 'Mon', v: 128 }, { x: 'Tue', v: 141 },
  { x: 'Wed', v: 122 }, { x: 'Thu', v: 156 }, { x: 'Fri', v: 42 }, { x: 'Sat', v: 31 },
]

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
    <div className="text-sm text-slate-700 leading-relaxed" dir="auto">
      <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>
    </div>
  )
}

type LegalCitation = { doc: string; page: number; match: number; excerpt: string; fullText: string }
type SessionMsg = { role: 'user' | 'ai'; text: string; citations?: LegalCitation[]; isTyping?: boolean }

const cleanChunk = (text: string) => {
  if (!text) return ''
  let cleaned = text
    .replace(/\[Page \d+\] \d+ of \d+/gi, '')
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/# Type.*$/gm, '')
    .replace(/\(Clause\/Excerpt\)\s*الوهمي/gi, '')
    .replace(/[#\-_=]{3,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

export default function LegalAssistant() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canChat = role.perms.chat
  const [input, setInput] = useState('')
  const [session, setSession] = useState<SessionMsg[]>([])
  const [typing, setTyping] = useState(false)
  const [viewer, setViewer] = useState<LegalCitation | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const [translations, setTranslations] = useState<Record<string | number, { orig: string; trans: string; showing: 'orig' | 'trans' }>>({})
  const [translating, setTranslating] = useState<Record<string | number, boolean>>({})

  const handleTranslate = async (key: string | number, text: string) => {
    const state = translations[key]
    if (state) {
      const nextShowing: 'orig' | 'trans' = state.showing === 'orig' ? 'trans' : 'orig'
      setTranslations((prev) => ({
        ...prev,
        [key]: { ...state, showing: nextShowing }
      }))
      return
    }

    const isArabic = /[\u0600-\u06FF]/.test(text)
    const targetLang = isArabic ? 'en' : 'ar'

    setTranslating((prev) => ({ ...prev, [key]: true }))
    try {
      const result = await translateText(text, targetLang)
      const newShowing: 'orig' | 'trans' = 'trans'
      setTranslations((prev) => ({
        ...prev,
        [key]: { orig: text, trans: result, showing: newShowing }
      }))
    } catch (err) {
      console.error('Translate error:', err)
    } finally {
      setTranslating((prev) => ({ ...prev, [key]: false }))
    }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [session, typing])

  const send = async () => {
    if (!input.trim() || !canChat) return
    const q = input.trim()
    setSession((s) => [...s, { role: 'user', text: q }])
    setInput('')
    setTyping(true)

    try {
      setSession((s) => [...s, { role: 'ai', text: '', isTyping: false }])

      const { answer, citations } = await askRAG(q, 'legal', (chunk) => {
        setSession((s) => {
          const newS = [...s]
          newS[newS.length - 1].text += chunk
          return newS
        })
      })

      const legalCitations: LegalCitation[] = citations.slice(0, 1).map((c) => ({
        doc: c.doc,
        page: c.page,
        match: Math.round((c.similarity ?? 0.5) * 100),
        excerpt: cleanChunk(c.excerpt),
        fullText: cleanChunk(c.excerpt),
      }))

      setSession((s) => {
        const newS = [...s]
        const last = newS[newS.length - 1]
        if (!last.text) last.text = answer
        last.citations = legalCitations.length ? legalCitations : undefined
        return newS
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSession((s) => [...s, {
        role: 'ai',
        text: isAr
          ? `تعذر الاتصال بمحرك الذكاء الاصطناعي القانوني. تأكد من تشغيل Ollama (ollama pull llama3.2:1b && ollama pull nomic-embed-text) أو ضبط OLLAMA_HOST على Render.\n\n${msg}`
          : `Could not reach the legal AI engine. Ensure Ollama is running (ollama pull llama3.2:1b && ollama pull nomic-embed-text) or set OLLAMA_HOST on Render.\n\n${msg}`,
      }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'المساعد القانوني الذكي' : 'AI Legal Assistant'}
        subtitle={isAr
          ? 'إجابات قانونية وسياساتية للموظفين — شرح البنود، اقتراح الأنظمة، وإيجاد القضايا المشابهة'
          : 'Legal & policy answers for staff — clause explanation, regulation suggestions, similar-case retrieval'}
        actions={<Badge tone="gold"><Gavel size={11} /> {isAr ? 'مصطلحات قانونية عربية' : 'Arabic legal terminology'}</Badge>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Chat */}
        <Card className="xl:col-span-2 flex flex-col min-h-[540px]">
          <div className="flex-1 space-y-4 overflow-y-auto pe-1">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center shrink-0"><User size={16} /></div>
              <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-slate-800" dir="auto">
                {isAr
                  ? 'منشأة صناعية تجاوزت حدود الانبعاثات ثلاث مرات خلال ستة أشهر. ما الإجراء النظامي الموصى به، وهل توجد سوابق مشابهة؟'
                  : 'An industrial facility exceeded emission limits three times within six months. What is the recommended statutory action, and are there similar precedents?'}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0"><Bot size={16} /></div>
              <div className="max-w-[88%]">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 leading-relaxed" dir="auto">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Legal Assistant</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewer({
                          doc: 'Executive Regulation For Controls and Procedures.pdf',
                          page: 1,
                          match: 94,
                          excerpt: isAr
                            ? 'المادة ٣٢: يحظر تصريف مياه الصرف المعالجة بدون ترخيص مسبق من المركز الوطني للرقابة على الالتزام البيئي. المادة ١٨: تضاعف عقوبات المخالفات الجسيمة عند التكرار الثالث خلال ستة أشهر مع إلزام المنشأة بتقديم خطة عمل تصحيحية عاجلة.'
                            : 'Article 32: Discharge of treated wastewater without prior permit from the National Center for Environmental Compliance is prohibited. Article 18: Major violation penalties shall double upon the third recurrence within six months, mandating an immediate corrective action plan.',
                          fullText: isAr
                            ? 'المادة ٣٢: يحظر تصريف مياه الصرف المعالجة بدون ترخيص مسبق من المركز الوطني للرقابة على الالتزام البيئي. المادة ١٨: تضاعف عقوبات المخالفات الجسيمة عند التكرار الثالث خلال ستة أشهر مع إلزام المنشأة بتقديم خطة عمل تصحيحية عاجلة.'
                            : 'Article 32: Discharge of treated wastewater without prior permit from the National Center for Environmental Compliance is prohibited. Article 18: Major violation penalties shall double upon the third recurrence within six months, mandating an immediate corrective action plan.'
                        })}
                        title={isAr ? 'عرض مقتطفات ومصادر الوثيقة في نافذة منبثقة' : 'View citation source passage in popup window'}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-[11px] font-medium text-amber-800 hover:text-amber-900 transition-all cursor-pointer shadow-2xs group"
                      >
                        <Quote size={11} className="text-amber-600 group-hover:scale-110 transition-transform" />
                        <span>{isAr ? 'المصادر' : 'Citations'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTranslate('demo', isAr
                          ? 'بموجب المادة ٣٢ من نظام البيئة والمادة ١٨ من اللائحة التنفيذية، فإن التكرار الثالث خلال ستة أشهر يستوجب: 1. تصعيد المخالفة إلى الدرجة الثانية 2. إلزام المنشأة بخطة تصحيحية 3. جواز الإيقاف الجزئي للنشاط'
                          : 'Under Article 32 of the Environmental Law and Article 18 of the Executive Regulation, a third recurrence within six months triggers: 1. Escalation to a second-degree violation 2. Mandatory corrective action plan 3. Discretionary partial suspension')}
                        disabled={translating['demo']}
                        title={isAr ? 'تحويل اللغة في الوقت الفعلي (عربي / إنجليزي)' : 'Convert language in real time (EN / AR)'}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-[11px] font-medium text-slate-600 hover:text-amber-700 transition-all cursor-pointer shadow-2xs group"
                      >
                        <RefreshCw size={11} className={translating['demo'] ? 'animate-spin text-amber-600' : 'text-slate-400 group-hover:text-amber-600 transition-transform group-hover:rotate-180'} />
                        <span>
                          {translating['demo']
                            ? (isAr ? 'جاري التحويل...' : 'Converting...')
                            : translations['demo']
                              ? (translations['demo'].showing === 'trans' ? (isAr ? 'النص الأصلي' : 'Original') : (isAr ? 'ترجمة' : 'Translate'))
                              : (isAr ? 'English' : 'عربي')}
                        </span>
                      </button>
                    </div>
                  </div>
                  {translations['demo'] && translations['demo'].showing === 'trans' ? (
                    <ReactMarkdown components={mdComponents}>{translations['demo'].trans}</ReactMarkdown>
                  ) : isAr ? (
                    <>
                      بموجب <span className="text-amber-700 font-semibold">المادة ٣٢ من نظام البيئة</span> والمادة ١٨ من اللائحة التنفيذية، فإن التكرار الثالث خلال ستة أشهر يستوجب:
                      <br /><br />
                      ١. تصعيد المخالفة إلى الدرجة الثانية (غرامة تصل إلى ٥ ملايين ريال)<br />
                      ٢. إلزام المنشأة بخطة تصحيحية خلال ٣٠ يوماً<br />
                      ٣. جواز الإيقاف الجزئي للنشاط المسبب حتى الالتزام<br /><br />
                      <span className="text-slate-500">التوصية: تصعيد من الدرجة الأولى مع إنذار نهائي قبل الإيقاف، اتساقاً مع السوابق المشابهة (انظر القضايا الجانبية).</span>
                    </>
                  ) : (
                    <>
                      Under <span className="text-amber-700 font-semibold">Article 32 of the Environmental Law</span> and Article 18 of the Executive Regulation, a third recurrence within six months triggers:
                      <br /><br />
                      1. Escalation to a second-degree violation (fine up to SAR 5M)<br />
                      2. Mandatory corrective action plan within 30 days<br />
                      3. Discretionary partial suspension of the offending activity<br /><br />
                      <span className="text-slate-500">Recommendation: escalate from first degree with a final warning before suspension, consistent with similar precedents (see side panel).</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Session messages */}
            {session.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  m.role === 'ai' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-sky-50 text-sky-600 border border-sky-200'
                }`}>
                  {m.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className={`max-w-[85%] ${m.role === 'user' ? 'text-end' : ''}`}>
                  <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'ai' ? 'bg-slate-50 border border-slate-200 text-slate-700' : 'bg-sky-50 border border-sky-200 text-slate-800'
                  }`} dir="auto">
                    {m.role === 'ai' ? (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Legal Assistant</span>
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
                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-[11px] font-medium text-slate-600 hover:text-amber-700 transition-all cursor-pointer shadow-2xs group"
                            >
                              <RefreshCw size={11} className={translating[i] ? 'animate-spin text-amber-600' : 'text-slate-400 group-hover:text-amber-600 transition-transform group-hover:rotate-180'} />
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

          <div className="flex flex-wrap gap-2 mt-3 mb-3">
            {quickTopics.map((tpc, i) => (
              <button key={i} onClick={() => canChat && setInput(isAr ? tpc.ar : tpc.en)}
                className={`text-[11px] px-2.5 py-1.5 rounded-full border border-slate-300 text-slate-500 transition-colors ${
                  canChat ? 'hover:text-amber-700 hover:border-amber-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}>
                {isAr ? tpc.ar : tpc.en}
              </button>
            ))}
          </div>

          {canChat ? (
            <div className="flex items-center gap-2 border border-slate-300 rounded-xl bg-white px-3 py-2 focus-within:border-amber-500/60 transition-colors">
              <Scale size={16} className="text-slate-400" />
              <input
                dir="auto" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={isAr ? 'اطرح سؤالاً قانونياً أو سياساتياً…' : 'Ask a legal or policy question…'}
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

        {/* Side panel */}
        <div className="space-y-4">
          <Card title={isAr ? 'قضايا مشابهة' : 'Similar Cases'} subtitle={isAr ? 'استرجاع دلالي من الأرشيف' : 'Semantic retrieval from case archive'} actions={<FolderSearch size={15} className="text-slate-400" />}>
            <div className="space-y-2.5">
              {similarCases.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3 hover:border-emerald-400 transition-colors cursor-pointer">
                  <ConfidenceRing value={c.similarity} size={46} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-mono">{c.id}</p>
                    <p className="text-xs text-slate-700 font-medium leading-snug" dir="auto">{isAr ? c.ar : c.title}</p>
                    <Badge tone="sky">{isAr ? c.outcomeAr : c.outcome}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={isAr ? 'استفسارات قانونية — 7 أيام' : 'Legal Queries — 7 Days'} subtitle={isAr ? 'مرر على الرسم لعرض التفاصيل' : 'Hover the line for details'}>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={usage7d} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="lu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltip} />
                <Area type="monotone" dataKey="v" name={isAr ? 'استفسارات' : 'Queries'} stroke="#d97706" strokeWidth={2} fill="url(#lu)" />
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
              <Badge tone="amber">{viewer.match}% {isAr ? 'تطابق دلالي' : 'Semantic Match'}</Badge>
            </div>

            {/* Document passage content */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-inner" dir="auto">
              <div className="rounded-lg bg-white border border-amber-200/80 p-4 shadow-2xs">
                <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1.5 border-b border-amber-100 pb-2">
                  <Quote size={14} className="text-amber-600" />
                  {isAr ? 'النص المقتبس المسترجع من الوثيقة:' : 'Retrieved Citation Passage:'}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                  "{viewer.fullText || viewer.excerpt}"
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
