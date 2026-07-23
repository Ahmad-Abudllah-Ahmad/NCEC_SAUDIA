import { useState, useRef } from 'react'
import {
  UploadCloud, FileSpreadsheet, TrendingUp, AlertCircle, MessageSquare, Send, Loader2
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { PageHeader, Card, Badge, Button, KpiCard, chartTooltip, Modal } from '../components/ui'
import { useLang } from '../i18n'
import { useRole } from '../roles'
import { extractPdfText } from '../utils/pdfExtractor'
import { globalStore } from '../store'


const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const monthly = [
  { m: 'Jan', pm10: 78, no2: 42, forecast: null },
  { m: 'Feb', pm10: 84, no2: 45, forecast: null },
  { m: 'Mar', pm10: 112, no2: 51, forecast: null },
  { m: 'Apr', pm10: 96, no2: 47, forecast: null },
  { m: 'May', pm10: 121, no2: 55, forecast: null },
  { m: 'Jun', pm10: 134, no2: 58, forecast: 134 },
  { m: 'Jul*', pm10: null, no2: null, forecast: 141 },
  { m: 'Aug*', pm10: null, no2: null, forecast: 138 },
  { m: 'Sep*', pm10: null, no2: null, forecast: 118 },
]

const anomalies = [
  { x: 3, y: 212, z: 30, station: 'Jubail ST-04' },
  { x: 11, y: 188, z: 25, station: 'Yanbu ST-02' },
  { x: 19, y: 240, z: 35, station: 'Dammam ST-07' },
]
const normals = Array.from({ length: 26 }, (_, i) => ({ x: i, y: 60 + Math.sin(i * 1.3) * 25 + (i % 5) * 6, z: 12 }))

type Dataset = { name: string; rows: string; status: 'analyzed' | 'analyzing' | 'queued' }

const initialDatasets: Dataset[] = [
  { name: 'Air Quality Monitoring — Q2 2026.xlsx', rows: '148,220', status: 'analyzed' },
  { name: 'Facility Emission Declarations 2026.csv', rows: '12,480', status: 'analyzed' },
  { name: 'Inspection Visit Records H1.xlsx', rows: '8,912', status: 'analyzing' },
  { name: 'Water Quality Lab Results — June.csv', rows: '44,105', status: 'queued' },
]

const insights = [
  { en: 'PM10 levels at industrial stations trend +18% QoQ; Jubail ST-04 exceeded the daily limit on 9 occasions in May.', ar: 'مستويات الجسيمات في المحطات الصناعية ترتفع ١٨٪ ربعياً؛ محطة الجبيل تجاوزت الحد اليومي ٩ مرات في مايو.' },
  { en: '3 anomalous spikes detected — all correlate with unreported flaring events at adjacent facilities.', ar: 'رصد ٣ ارتفاعات شاذة — جميعها مرتبطة بأحداث حرق غير مبلغ عنها في منشآت مجاورة.' },
  { en: 'Forecast: PM10 to peak in July (141 µg/m³) then decline ~16% by September with seasonal winds.', ar: 'التوقع: ذروة الجسيمات في يوليو (١٤١) ثم انخفاض ١٦٪ بحلول سبتمبر مع الرياح الموسمية.' },
]

type QA = { q: string; a: string }

export default function DataAnalysis() {
  const { lang, t } = useLang()
  const { role } = useRole()
  const isAr = lang === 'ar'
  const canUpload = role.perms.upload
  const canChat = role.perms.chat
  const [datasets, setDatasets] = useState<Dataset[]>(initialDatasets)
  const [question, setQuestion] = useState('')
  const [qas, setQas] = useState<QA[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extractedData, setExtractedData] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsExtracting(true)
    try {
      if (file.type === 'application/pdf') {
        const text = await extractPdfText(file)
        setExtractedData(text)
        globalStore.addDocument({ name: file.name, content: text })
      } else {
        setExtractedData(`File uploaded: ${file.name}. \nNote: Content extraction is optimized for PDF files.`)
      }
      uploadMock(file.name)
    } catch (err) {
      console.error(err)
      setExtractedData('Error extracting text from document.')
    } finally {
      setIsExtracting(false)
    }
  }

  const initialQA: QA = {
    q: isAr ? 'أي المحطات تجاوزت حد PM10 أكثر من ٥ مرات في مايو؟' : 'Which stations exceeded the PM10 limit more than 5 times in May?',
    a: isAr
      ? 'محطتان: الجبيل ST-04 (٩ تجاوزات) والدمام ST-07 (٧ تجاوزات). كلتاهما في مناطق صناعية، بمتوسط تجاوز ٣٤٪ فوق الحد.'
      : 'Two stations: Jubail ST-04 (9 exceedances) and Dammam ST-07 (7). Both are in industrial zones, averaging 34% above the limit.',
  }

  const uploadMock = (uploadedName?: string) => {
    if (!canUpload) return
    const name = uploadedName || `Upload_${new Date().toLocaleTimeString().replace(/:/g, '')}.xlsx`
    setDatasets((d) => [{ name, rows: '—', status: 'analyzing' }, ...d])
    setTimeout(() => setDatasets((d) => d.map((x) => (x.name === name ? { ...x, rows: '12,844', status: 'analyzed' } : x))), 2200)
  }

  const ask = () => {
    if (!question.trim() || !canChat) return
    const q = question.trim()
    setQuestion('')
    setQas((s) => [...s, {
      q,
      a: isAr
        ? 'استناداً إلى مجموعات البيانات المحملة: تم تحليل الاستعلام وتجميع النتائج عبر 148 ألف صف. أبرز نتيجة: القيم في المناطق الصناعية أعلى بنسبة ٢٢٪ من المتوسط الوطني خلال الربع الأخير.'
        : 'Based on the loaded datasets: query analyzed across 148K rows. Key result: industrial-zone values run 22% above the national average for the latest quarter.',
    }])
  }

  return (
    <div>
      <PageHeader
        title={isAr ? 'تحليل البيانات' : 'Data Analysis'}
        subtitle={isAr
          ? 'ارفع ملفات Excel و CSV والتقارير — الذكاء يحلل ويرسم ويكشف الشذوذ ويتنبأ ويجيب عن الأسئلة'
          : 'Upload Excel, CSV and reports — AI analyzes, charts, detects anomalies, forecasts, and answers questions about your datasets'}
        actions={
          <>
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={!canUpload || isExtracting} title={canUpload ? undefined : t('requiresPermission')}>
              {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              {isAr ? 'رفع بيانات' : 'Upload Data'}
            </Button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.csv,.xlsx,.xls" />
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard icon={FileSpreadsheet} label={isAr ? 'مجموعات بيانات' : 'Datasets Loaded'} value="64" accent="emerald"
          trend={[41, 45, 49, 53, 57, 61, 64]} trendLabels={weeks} />
        <KpiCard icon={TrendingUp} label={isAr ? 'اتجاهات مكتشفة' : 'Trends Identified'} value="212" accent="sky"
          trend={[148, 160, 171, 182, 193, 203, 212]} trendLabels={weeks} />
        <KpiCard icon={AlertCircle} label={isAr ? 'حالات شذوذ نشطة' : 'Active Anomalies'} value="3" accent="rose"
          trend={[6, 5, 7, 4, 3, 4, 3]} trendLabels={weeks} />
        <KpiCard icon={MessageSquare} label={isAr ? 'أسئلة على البيانات' : 'Questions Answered'} value="1,847" accent="violet"
          trend={[1290, 1388, 1476, 1568, 1662, 1755, 1847]} trendLabels={weeks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Card
          className="xl:col-span-2"
          title={isAr ? 'جودة الهواء — الاتجاه والتنبؤ' : 'Air Quality — Trend & Forecast'}
          subtitle={isAr ? 'PM10 و NO₂ مع تنبؤ ٣ أشهر (*)' : 'PM10 & NO₂ with 3-month forecast (*)'}
          actions={<Badge tone="sky">{isAr ? 'مولّد تلقائياً' : 'Auto-generated'}</Badge>}
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthly}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="m" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: isAr ? 'الحد النظامي' : 'Regulatory limit', fill: '#f43f5e', fontSize: 10 }} />
              <Bar dataKey="pm10" name="PM10 µg/m³" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="no2" name="NO₂ ppb" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={18} />
              <Line dataKey="forecast" name={isAr ? 'تنبؤ PM10' : 'PM10 forecast'} stroke="#d97706" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title={isAr ? 'كشف الشذوذ' : 'Anomaly Detection'} subtitle={isAr ? 'قراءات المحطات — النقاط الحمراء شاذة' : 'Station readings — red points are anomalous'}>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Station" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="y" name="PM10" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <ZAxis dataKey="z" range={[30, 120]} />
              <Tooltip contentStyle={chartTooltip} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={normals} fill="#0ea5e9" fillOpacity={0.45} />
              <Scatter data={anomalies} fill="#f43f5e" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title={isAr ? 'مجموعات البيانات' : 'Datasets'}>
          <div className="space-y-2.5">
            {datasets.map((d, i) => (
              <div key={`${d.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 truncate">{d.name}</p>
                  <p className="text-[10px] text-slate-400">{d.rows} {isAr ? 'صف' : 'rows'}</p>
                </div>
                {d.status === 'analyzed' && <Badge tone="emerald">{isAr ? 'محلل' : 'Analyzed'}</Badge>}
                {d.status === 'analyzing' && <Badge tone="amber">{isAr ? 'يحلل' : 'Analyzing'}</Badge>}
                {d.status === 'queued' && <Badge tone="slate">{isAr ? 'انتظار' : 'Queued'}</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <Card title={isAr ? 'رؤى مولدة تلقائياً' : 'Auto-Generated Insights'} subtitle={isAr ? 'ملخصات واتجاهات وتنبؤات' : 'Summaries, trends and forecasts'}>
          <div className="space-y-2.5">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <TrendingUp size={14} className="text-brand-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed" dir="auto">{isAr ? ins.ar : ins.en}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title={isAr ? 'اسأل بياناتك' : 'Ask Your Data'} subtitle={isAr ? 'أسئلة بلغة طبيعية على الجداول' : 'Natural-language questions over datasets'}>
          <div className="space-y-2.5 mb-3 max-h-[220px] overflow-y-auto pe-1">
            {[initialQA, ...qas].map((qa, i) => (
              <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] text-sky-700 font-semibold mb-1">{isAr ? 'سؤال' : 'Q'}</p>
                <p className="text-xs text-slate-700" dir="auto">{qa.q}</p>
                <p className="text-[11px] text-brand-700 font-semibold mt-2 mb-1">{isAr ? 'إجابة' : 'A'}</p>
                <p className="text-xs text-slate-600 leading-relaxed" dir="auto">{qa.a}</p>
              </div>
            ))}
          </div>
          <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${canChat ? 'border-slate-300 bg-white focus-within:border-brand-600/60' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
            <input dir="auto"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              disabled={!canChat}
              placeholder={canChat ? (isAr ? 'اسأل عن أي مجموعة بيانات…' : 'Ask about any dataset…') : t('requiresPermission')}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none" />
            <Button size="sm" onClick={ask} disabled={!canChat} title={canChat ? undefined : t('requiresPermission')}><Send size={13} className="rtl:rotate-180" /></Button>
          </div>
        </Card>
      </div>

      <Modal
        open={!!extractedData}
        onClose={() => setExtractedData(null)}
        title={isAr ? 'البيانات المستخرجة' : 'Extracted Data'}
        subtitle={isAr ? 'البيانات النصية المستخرجة من المستند المرفوع' : 'Text data extracted from the uploaded document'}
      >
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-96 overflow-y-auto whitespace-pre-wrap text-xs text-slate-700">
          {extractedData}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => setExtractedData(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
        </div>
      </Modal>
    </div>
  )
}
