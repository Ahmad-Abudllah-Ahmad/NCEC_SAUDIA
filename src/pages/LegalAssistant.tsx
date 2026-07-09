import { useState, useRef, useEffect } from 'react'
import { Send, Gavel, Bot, User, Scale, FolderSearch, Quote, Lock } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PageHeader, Card, Badge, Button, ConfidenceRing, chartTooltip } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'

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

type SessionMsg = { role: 'user' | 'ai'; text: string; cite?: string }

export default function LegalAssistant() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canChat = role.perms.chat
  const [input, setInput] = useState('')
  const [session, setSession] = useState<SessionMsg[]>([])
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [session, typing])

  const send = () => {
    if (!input.trim() || !canChat) return
    const q = input.trim()
    setSession((s) => [...s, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setSession((s) => [...s, {
        role: 'ai',
        text: isAr
          ? 'استناداً إلى نظام البيئة ولوائحه التنفيذية، إليك الرأي القانوني المدعوم بالمواد ذات الصلة والسوابق المشابهة من أرشيف المركز. القرار النهائي يبقى للفريق القانوني.'
          : 'Based on the Environmental Law and its executive regulations, here is the legal opinion grounded in the relevant articles and similar precedents from the Center\u2019s archive. The final decision remains with the legal team.',
        cite: isAr
          ? 'نظام البيئة — المادة ٣٢، ص ٤١ · اللائحة التنفيذية — المادة ١٨، ص ٢٧'
          : 'Environmental Law — Art. 32, p.41 · Executive Regulation — Art. 18, p.27',
      }])
    }, 1300)
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
                  {isAr ? (
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
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">
                  <Quote size={12} className="text-amber-600 mt-0.5" />
                  <p className="text-slate-500" dir="auto">
                    {isAr ? 'نظام البيئة — المادة ٣٢، ص ٤١ · اللائحة التنفيذية — المادة ١٨، ص ٢٧ · سابقة CASE-2024-118' : 'Environmental Law — Art. 32, p.41 · Executive Regulation — Art. 18, p.27 · Precedent CASE-2024-118'}
                  </p>
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
                  }`} dir="auto">{m.text}</div>
                  {m.cite && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs">
                      <Quote size={12} className="text-amber-600 mt-0.5" />
                      <p className="text-slate-500" dir="auto">{m.cite}</p>
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
    </div>
  )
}
