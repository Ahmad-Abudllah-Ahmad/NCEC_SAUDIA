import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, Bot, User, FileText, BookOpen, Quote, Sparkles, Paperclip,
  Languages, Brain, ChevronRight, CheckCheck, Lock, ExternalLink, ShieldCheck,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PageHeader, Card, Badge, Button, Modal, chartTooltip } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

type Citation = { doc: string; page: number; excerpt: string }

const citationBody: Record<string, { ar: string[]; en: string[] }> = {
  'اللائحة التنفيذية لنظام البيئة — الإصدار الرابع': {
    ar: [
      'تحدد اللائحة التنفيذية المتطلبات النظامية للأنشطة والمنشآت الخاضعة لإشراف المركز، مع بيان الإجراءات المرتبطة بإصدار التصاريح البيئية وتجديدها والرقابة على الالتزام بشروطها.',
      'وتنص الأحكام ذات الصلة على أن منشآت الفئة الأولى مطالبة بتقديم دراسة تقييم أثر بيئي مكتملة قبل إصدار التصريح، على أن تشمل الدراسة خطة الإدارة البيئية وبرنامج الرصد الذاتي وخطة الاستجابة للطوارئ.',
      'كما توضح اللائحة أن الجهة المختصة تراجع مدى اكتمال الملف والالتزام بالمتطلبات الفنية والنظامية قبل الانتقال إلى مرحلة التقييم النهائي وإصدار القرار المناسب.',
    ],
    en: [
      'The Executive Regulation defines the regulatory requirements for activities and facilities under the Center’s supervision, including the procedures for issuing, renewing, and monitoring environmental permits.',
      'The relevant provisions state that Category 1 facilities must submit a complete Environmental Impact Assessment prior to permit issuance, including the environmental management plan, self-monitoring program, and emergency response plan.',
      'The Regulation also clarifies that the competent authority reviews file completeness and technical and regulatory compliance before moving to final assessment and issuance of the appropriate decision.',
    ],
  },
  'دليل التصاريح البيئية للمنشآت': {
    ar: [
      'يوضح الدليل التصنيفات المعتمدة للأنشطة والمنشآت البيئية، ومتطلبات كل فئة، والوثائق الداعمة الواجب تقديمها ضمن ملف الطلب.',
      'ويعرض جداول مقارنة بين الفئات المختلفة مع تحديد الفروقات في نوع الدراسة المطلوبة، ومدد المراجعة، ومتطلبات الرصد، والاشتراطات المرتبطة بالمخاطر التشغيلية.',
      'كما يتضمن الدليل توجيهات عملية لمقدمي الطلبات حول كيفية استكمال النماذج والرفع عبر القنوات المعتمدة وتفادي أسباب التأخير أو الإرجاع.',
    ],
    en: [
      'The permit guide explains the approved classifications for environmental activities and facilities and the supporting documents required for each application category.',
      'It includes comparison tables between permit categories, highlighting differences in study type, review timelines, monitoring obligations, and risk-related operational requirements.',
      'The guide also provides practical instructions for applicants on how to complete forms, submit through approved channels, and avoid common causes of delay or return.',
    ],
  },
  'تعميم رقم 45/2026': {
    ar: [
      'يتضمن التعميم تحديثاً إجرائياً على مدد دراسة طلبات التصاريح البيئية وآلية احتساب المدد من تاريخ اكتمال المستندات النظامية والفنية المطلوبة من مقدم الطلب.',
      'ويؤكد النص أن الحد الزمني القياسي لدراسة الطلبات المستوفية قد تم تحديثه ليصبح 60 يوم عمل، مع إمكان طلب استكمالات إضافية متى استدعت الحاجة الفنية أو النظامية ذلك.',
      'كما ينص التعميم على ضرورة إشعار مقدم الطلب بأي نواقص أو متطلبات إضافية خلال مدة محددة، وأن احتساب المدة يستأنف بعد استلام جميع المستندات المكملة واعتمادها من الجهة المختصة.',
    ],
    en: [
      'The circular introduces a procedural update to environmental permit review timelines and clarifies how timelines are calculated from the date on which the required regulatory and technical documents are deemed complete.',
      'It confirms that the standard review period for complete applications has been updated to 60 business days, while allowing the competent authority to request additional completions whenever technical or regulatory review requires them.',
      'The circular also requires applicants to be notified of deficiencies or additional requests within the specified notice period, after which the review clock resumes once all supplemental documents are received and accepted.',
    ],
  },
  'Executive Regulation of Environmental Law': {
    ar: [
      'توضح اللائحة التنفيذية لنظام البيئة الترتيب التنظيمي لمتطلبات التصاريح والتصنيفات البيئية، وتربط كل فئة بنوع الدراسة والضوابط الواجبة التطبيق.',
      'كما تنص المواد المرجعية على حالات التبسيط أو التدرج في المتطلبات بحسب حجم الأثر البيئي المتوقع وطبيعة النشاط وموقعه الحساس بيئياً.',
      'وتبقى مراجعة الاكتمال والامتثال والاشتراطات الفنية شرطاً أساسياً قبل الانتقال إلى أي قرار ترخيص أو طلب استكمال أو تعديل.',
    ],
    en: [
      'The Executive Regulation sets out the regulatory structure for environmental permitting requirements and links each facility category to its required study type and applicable controls.',
      'The cited articles describe cases where requirements may be simplified or scaled according to expected environmental impact, activity type, and environmental sensitivity of the site.',
      'Completeness, compliance, and technical-condition review remain essential prerequisites before any licensing, completion request, or revision decision proceeds.',
    ],
  },
}

type Msg = {
  role: 'user' | 'ai'
  text: string
  citations?: Citation[]
  confidence?: number
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
      { doc: 'اللائحة التنفيذية لنظام البيئة — الإصدار الرابع', page: 47, excerpt: 'المادة 14: تلتزم منشآت الفئة الأولى بتقديم دراسة تقييم الأثر البيئي...' },
      { doc: 'دليل التصاريح البيئية للمنشآت', page: 12, excerpt: 'تصنف الأنشطة الصناعية وفق ثلاث فئات بحسب حجم الأثر البيئي المتوقع...' },
      { doc: 'تعميم رقم 45/2026', page: 3, excerpt: 'تحديث مدد دراسة طلبات التصاريح لتصبح 60 يوم عمل...' },
    ],
    confidence: 96,
  },
  {
    role: 'user',
    text: 'Compare these requirements with Category 2 facilities and summarize the differences in English.',
  },
  {
    role: 'ai',
    text: 'Key differences between Category 1 and Category 2 facilities:\n\n• Environmental Study: Category 1 requires a full EIA study; Category 2 requires only a simplified Environmental Impact Assessment Report (EIAR).\n• Review Period: 60 business days (Cat 1) vs. 30 business days (Cat 2).\n• Monitoring: Cat 1 mandates continuous self-monitoring with quarterly reporting; Cat 2 requires semi-annual reporting.\n• Emergency Plan: Mandatory for Cat 1; required for Cat 2 only when handling hazardous materials.\n\nBoth categories require renewal every 5 years and are subject to periodic inspection.',
    citations: [
      { doc: 'Executive Regulation of Environmental Law — 4th Ed.', page: 52, excerpt: 'Article 16: Category 2 facilities shall submit a simplified environmental report...' },
      { doc: 'دليل التصاريح البيئية للمنشآت', page: 18, excerpt: 'جدول مقارنة متطلبات الفئات الثلاث للتصاريح البيئية...' },
    ],
    confidence: 94,
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
  const navigate = useNavigate()
  const isAr = lang === 'ar'
  const canChat = role.perms.chat
  const [msgs, setMsgs] = useState<Msg[]>(initialMsgs)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [scope, setScope] = useState<boolean[]>(scopedDocs.map(() => true))
  const [entireKb, setEntireKb] = useState(false)
  const [viewer, setViewer] = useState<Citation | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const viewerBody = viewer ? (citationBody[viewer.doc]?.[isAr ? 'ar' : 'en'] ?? citationBody[viewer.doc]?.en ?? []) : []

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  const send = () => {
    if (!input.trim() || !canChat) return
    const q = input.trim()
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs((m) => [...m, {
        role: 'ai',
        text: isAr
          ? 'بناءً على قاعدة المعرفة الداخلية، إليك الإجابة المدعومة بالمراجع الدقيقة. تم البحث في 11,393 وثيقة مفهرسة واسترجاع المقاطع الأكثر صلة عبر البحث الدلالي الهجين.'
          : 'Based on the internal knowledge base, here is the answer supported by exact references. Searched 11,393 indexed documents and retrieved the most relevant passages via hybrid semantic search.',
        citations: [
          { doc: isAr ? 'اللائحة التنفيذية لنظام البيئة' : 'Executive Regulation of Environmental Law', page: 33, excerpt: isAr ? 'النص المرجعي المسترجع من الوثيقة الأصلية...' : 'Retrieved reference passage from the source document...' },
        ],
        confidence: 93,
      }])
    }, 1400)
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
                  <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'ai' ? 'bg-slate-50 border border-slate-200 text-slate-700' : 'bg-sky-50 border border-sky-200 text-slate-800'
                  }`} dir="auto">
                    {m.text}
                  </div>
                  {m.citations && (
                    <div className="mt-2 space-y-1.5">
                      {m.citations.map((c, j) => (
                        <div
                          key={j}
                          role="button"
                          tabIndex={0}
                          onClick={() => setViewer(c)}
                          onKeyDown={(e) => e.key === 'Enter' && setViewer(c)}
                          title={isAr ? 'انقر لعرض المقطع في الوثيقة المصدر' : 'Click to open the passage in the source document'}
                          className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs cursor-pointer hover:border-emerald-400 hover:shadow-sm transition-all"
                        >
                          <Quote size={12} className="text-amber-600 mt-0.5 shrink-0" />
                          <div dir="auto" className="text-start">
                            <p className="text-slate-700 font-medium">{c.doc} — <span className="text-amber-600">{isAr ? 'صفحة' : 'p.'} {c.page}</span></p>
                            <p className="text-slate-400 mt-0.5 italic">"{c.excerpt}"</p>
                          </div>
                          <ChevronRight size={13} className="text-slate-300 ms-auto mt-1 rtl:rotate-180" />
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <CheckCheck size={12} className="text-emerald-600" />
                        {isAr ? 'الثقة' : 'Confidence'}: <span className="text-emerald-600 font-semibold">{m.confidence}%</span>
                        · {m.citations.length} {isAr ? 'مراجع' : 'sources cited'}
                      </div>
                    </div>
                  )}
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

      {/* Citation source viewer */}
      <Modal
        open={viewer !== null}
        onClose={() => setViewer(null)}
        title={viewer?.doc}
        subtitle={`${isAr ? 'صفحة' : 'Page'} ${viewer?.page} · ${isAr ? 'المقطع المصدر المسترجع' : 'Retrieved source passage'}`}
        maxW="max-w-2xl"
      >
        {viewer && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge tone="emerald"><ShieldCheck size={10} /> {isAr ? 'مصدر موثق' : 'Verified source'}</Badge>
              <Badge tone="sky">{isAr ? 'مفهرس — قاعدة المعرفة' : 'Indexed — Knowledge Base'}</Badge>
              <Badge tone="slate">{isAr ? 'نسخة' : 'Version'} 4.0</Badge>
            </div>

            {/* Simulated document page */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-inner p-5" dir="auto">
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-100 pb-2 mb-3">
                <span>{viewer.doc}</span>
                <span>{isAr ? 'صفحة' : 'Page'} {viewer.page}</span>
              </div>
              {viewerBody.map((paragraph, idx) => (
                <p key={idx} className="text-sm text-slate-600 leading-relaxed mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))}
              <div className="my-3 rounded-lg bg-amber-50 border-s-4 border-amber-400 px-4 py-3">
                <p className="text-sm text-slate-800 leading-relaxed font-medium" dir="auto">"{viewer.excerpt}"</p>
                <p className="text-[10px] text-amber-700 mt-1.5 flex items-center gap-1">
                  <Quote size={10} /> {isAr ? 'المقطع المقتبس في إجابة المساعد' : 'Passage cited in the assistant’s answer'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-[11px] text-slate-400">
                {isAr ? 'استُرجع عبر البحث الدلالي الهجين — بدون هلوسة' : 'Retrieved via hybrid semantic search — zero hallucination'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setViewer(null); navigate('/knowledge-base') }}>
                  <ExternalLink size={12} /> {isAr ? 'فتح في قاعدة المعرفة' : 'Open in Knowledge Base'}
                </Button>
                <Button size="sm" onClick={() => setViewer(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
