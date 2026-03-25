import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import { Bar, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Tooltip, Legend, ScatterController,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ScatterController)

const RISK_META = {
  at_risk:  { kz: 'Қауіп бар',     icon: 'warning',        color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  watch:    { kz: 'Назар аудар',   icon: 'visibility',     color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  on_track: { kz: 'Жол үстінде',   icon: 'trending_up',    color: '#2F7F86', bg: '#E6F4F3', border: '#BFE3E1' },
  advanced: { kz: 'Үздік',         icon: 'emoji_events',   color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
}

function TrendArrow({ trend }) {
  if (trend === 'up')   return <span className="material-symbols-outlined text-green-500 text-base">trending_up</span>
  if (trend === 'down') return <span className="material-symbols-outlined text-red-400 text-base">trending_down</span>
  return <span className="material-symbols-outlined text-[#66B2B2] text-base">trending_flat</span>
}

function ConfidenceBar({ value }) {
  const color = value >= 70 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#BFE3E1] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-black w-8 text-right" style={{ color }}>{value}%</span>
    </div>
  )
}

function GradeBar({ value, max = 5 }) {
  const pct = (value / max) * 100
  const color = value >= 4.5 ? '#22c55e' : value >= 3.5 ? '#2F7F86' : value >= 2.5 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#BFE3E1] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-black w-8 text-right" style={{ color }}>{value}</span>
    </div>
  )
}

export default function PerformancePrediction() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [classes, setClasses] = useState([])
  const [selClass, setSelClass] = useState('')
  const [predictions, setPredictions] = useState([])
  const [modelInfo, setModelInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('risk') // risk | name | predicted | confidence
  const [filterRisk, setFilterRisk] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    api.getClasses().then(data => {
      setClasses(data)
      if (data[0]) setSelClass(data[0].name)
    }).catch(() => {})
  }, [])

  const runPrediction = async () => {
    setLoading(true)
    try {
      const result = await api.predictPerformance({ class_name: selClass || undefined })
      setPredictions(result.predictions || [])
      setModelInfo(result.modelInfo)
    } catch (e) {
      alert(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selClass !== null) runPrediction()
  }, [selClass])

  const riskOrder = { at_risk: 0, watch: 1, on_track: 2, advanced: 3 }

  const filtered = useMemo(() => {
    let list = filterRisk === 'all' ? predictions : predictions.filter(p => p.risk === filterRisk)
    return [...list].sort((a, b) => {
      if (sortBy === 'risk') return riskOrder[a.risk] - riskOrder[b.risk]
      if (sortBy === 'predicted') return b.predicted - a.predicted
      if (sortBy === 'confidence') return b.confidence - a.confidence
      return a.name.localeCompare(b.name)
    })
  }, [predictions, sortBy, filterRisk])

  // Summary counts
  const counts = useMemo(() => {
    const c = { at_risk: 0, watch: 0, on_track: 0, advanced: 0 }
    predictions.forEach(p => { c[p.risk] = (c[p.risk] || 0) + 1 })
    return c
  }, [predictions])

  const avgPredicted = predictions.length
    ? (predictions.reduce((s, p) => s + p.predicted, 0) / predictions.length).toFixed(2)
    : '—'

  // Bar chart: predicted grades
  const barData = {
    labels: filtered.slice(0, 15).map(p => p.name.split(' ')[0]),
    datasets: [
      {
        label: 'Болжам',
        data: filtered.slice(0, 15).map(p => p.predicted),
        backgroundColor: filtered.slice(0, 15).map(p => RISK_META[p.risk]?.color + 'bb'),
        borderRadius: 6,
      },
      {
        label: 'Қазіргі',
        data: filtered.slice(0, 15).map(p => p.recentGrade || 0),
        backgroundColor: 'rgba(191,227,225,0.6)',
        borderRadius: 6,
      },
    ],
  }

  // Scatter: attention vs predicted grade
  const scatterData = {
    datasets: [{
      label: 'Оқушылар',
      data: predictions.map(p => ({ x: p.avgAttention, y: p.predicted, label: p.name })),
      backgroundColor: predictions.map(p => RISK_META[p.risk]?.color + 'cc'),
      pointRadius: 7,
      pointHoverRadius: 10,
    }],
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Болжам" subtitle="ML үлгерім болжауы" hasSidebar />

      <div className="ml-64">
        {/* Banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg,#0F4C5C 0%,#1a3a5c 50%,#2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px,transparent 1px),linear-gradient(90deg,#BFE3E1 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          {/* Decorative grid overlay */}
          <div className="absolute right-8 top-4 opacity-10 text-white font-mono text-[10px] leading-5 hidden lg:block select-none">
            {['β=[1.5, 0.8, 0.7, 1.8]', 'X·βᵀ → ŷ', 'OLS: (XᵀX)⁻¹Xᵀy', 'R²=0.74', 'MSE↓'].map((t, i) => <div key={i}>{t}</div>)}
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#66B2B2] text-xl">psychology</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#BFE3E1]/60">Machine Learning · OLS Regression</span>
              </div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-black text-white tracking-tight">Үлгерімді болжау</h1>
              <p className="text-[#BFE3E1]/60 mt-1 text-sm">Зейін, эмоция, баға тренді → болжамды баға</p>
            </div>
            <div className="flex items-center gap-3">
              {classes.length > 0 && (
                <div className="relative">
                  <select value={selClass} onChange={e => setSelClass(e.target.value)}
                    className="appearance-none bg-white/10 text-white border border-white/20 rounded-xl px-4 pr-8 py-2 text-sm font-bold focus:outline-none min-w-[130px]">
                    <option value="" className="text-[#0F4C5C] bg-white">Барлығы</option>
                    {classes.map(c => <option key={c.id} value={c.name} className="text-[#0F4C5C] bg-white">{c.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/60 text-sm">expand_more</span>
                </div>
              )}
              <button onClick={runPrediction} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#0F4C5C' }}>
                {loading
                  ? <><div className="w-4 h-4 rounded-full border-2 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />Есептелуде...</>
                  : <><span className="material-symbols-outlined text-sm text-[#2F7F86]">auto_fix_high</span>Болжау</>}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">

          {/* Model info badge */}
          {modelInfo && (
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 rounded-xl text-xs"
              style={{ background: '#f0fafa', border: '1.5px solid #BFE3E1' }}>
              <span className="material-symbols-outlined text-sm text-[#2F7F86]">model_training</span>
              <span className="font-bold text-[#0F4C5C]">{modelInfo.algorithm}</span>
              <span className="text-[#66B2B2]">·</span>
              <span className="text-[#66B2B2]">Үлгі: <b className="text-[#2F7F86]">{modelInfo.trained ? 'Деректерден оқытылған' : 'Калибрленген'}</b></span>
              <span className="text-[#66B2B2]">·</span>
              <span className="text-[#66B2B2]">R² = <b className="text-[#2F7F86]">{modelInfo.r2}</b></span>
              <span className="text-[#66B2B2]">·</span>
              <span className="text-[#66B2B2]">Оқу жиыны: <b className="text-[#2F7F86]">{modelInfo.sampleSize} оқушы</b></span>
              <span className="text-[#66B2B2]">·</span>
              <span className="text-[#66B2B2]">Белгілер: attention · emotion · grade_trend · participation</span>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(RISK_META).map(([key, meta]) => (
              <button key={key} type="button"
                onClick={() => setFilterRisk(filterRisk === key ? 'all' : key)}
                className="card-glow rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden transition-all hover:-translate-y-0.5 text-left"
                style={filterRisk === key ? { border: `2px solid ${meta.color}`, background: meta.bg } : {}}>
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: meta.color }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: meta.color, fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                </div>
                <div>
                  <p className="text-[9px] text-[#66B2B2] uppercase tracking-wider font-black">{meta.kz}</p>
                  <p className="font-['Space_Grotesk'] font-black text-2xl" style={{ color: meta.color }}>{counts[key] || 0}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Charts */}
          {predictions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar: current vs predicted */}
              <div className="card-glow p-6 rounded-2xl">
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4">Қазіргі → Болжамды баға</h3>
                <div style={{ height: 200 }}>
                  <Bar data={barData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true, labels: { color: '#66B2B2', font: { size: 10 }, boxWidth: 12 } } },
                    scales: {
                      x: { grid: { color: 'rgba(191,227,225,0.3)' }, ticks: { color: '#66B2B2', font: { size: 9 } } },
                      y: { grid: { color: 'rgba(191,227,225,0.3)' }, ticks: { color: '#66B2B2', font: { size: 9 } }, min: 0, max: 5 },
                    },
                  }} />
                </div>
              </div>

              {/* Scatter: attention vs grade */}
              <div className="card-glow p-6 rounded-2xl">
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-1">Зейін → Болжамды баға</h3>
                <p className="text-xs text-[#66B2B2] mb-4">Корреляция: зейін жоғары → баға жоғары</p>
                <div style={{ height: 200 }}>
                  <Scatter data={scatterData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: {
                      callbacks: { label: ctx => `${scatterData.datasets[0].data[ctx.dataIndex]?.label}: зейін=${ctx.parsed.x}% болжам=${ctx.parsed.y}` }
                    }},
                    scales: {
                      x: { title: { display: true, text: 'Зейін %', color: '#66B2B2', font: { size: 10 } }, grid: { color: 'rgba(191,227,225,0.3)' }, ticks: { color: '#66B2B2', font: { size: 9 } }, min: 0, max: 100 },
                      y: { title: { display: true, text: 'Болжам (1–5)', color: '#66B2B2', font: { size: 10 } }, grid: { color: 'rgba(191,227,225,0.3)' }, ticks: { color: '#66B2B2', font: { size: 9 } }, min: 1, max: 5 },
                    },
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#BFE3E1] flex flex-wrap items-center justify-between gap-3"
              style={{ background: 'linear-gradient(180deg,#fff,#f8fdfc)' }}>
              <div>
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Оқушылар болжамы</h3>
                <p className="text-xs text-[#66B2B2] mt-0.5">{filtered.length} оқушы · орт. болжам: <b className="text-[#2F7F86]">{avgPredicted}</b></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#66B2B2] font-bold">Сұрыптау:</span>
                {[['risk', 'Қауіп'], ['predicted', 'Болжам'], ['confidence', 'Сенімділік'], ['name', 'Аты']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setSortBy(v)}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={sortBy === v ? { background: '#2F7F86', color: '#fff' } : { background: '#f0fafa', color: '#66B2B2' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
                <span className="text-sm text-[#66B2B2]">ML модель есептеуде...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">psychology</span>
                <p className="text-sm text-[#66B2B2]">Деректер жоқ. Болжау үшін оқушыларда баға болуы керек.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#BFE3E1]">
                {filtered.map(p => {
                  const meta = RISK_META[p.risk]
                  const isExpanded = expandedId === p.studentId
                  return (
                    <div key={p.studentId}>
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : p.studentId)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#f8fdfc] transition-colors text-left">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg,${meta.bg},${meta.border})` }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: meta.color, fontVariationSettings: "'FILL' 1" }}>person</span>
                        </div>

                        {/* Name */}
                        <div className="w-40 min-w-0 flex-shrink-0">
                          <p className="font-bold text-sm text-[#0F4C5C] truncate">{p.name}</p>
                          <p className="text-[10px] text-[#66B2B2]">{p.class_name}</p>
                        </div>

                        {/* Risk badge */}
                        <span className="flex-shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"
                          style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                          {meta.kz}
                        </span>

                        {/* Predicted grade */}
                        <div className="flex-1 min-w-[100px]">
                          <p className="text-[9px] text-[#66B2B2] uppercase font-black mb-1">Болжамды баға</p>
                          <GradeBar value={p.predicted} />
                        </div>

                        {/* Current grade */}
                        <div className="w-20 flex-shrink-0 text-center hidden md:block">
                          <p className="text-[9px] text-[#66B2B2] uppercase font-black mb-1">Қазіргі</p>
                          <span className="font-['Space_Grotesk'] font-black text-lg text-[#0F4C5C]">{p.recentGrade ?? '—'}</span>
                        </div>

                        {/* Trend */}
                        <div className="w-8 flex-shrink-0 flex justify-center">
                          <TrendArrow trend={p.trend} />
                        </div>

                        {/* Confidence */}
                        <div className="w-28 flex-shrink-0 hidden lg:block">
                          <p className="text-[9px] text-[#66B2B2] uppercase font-black mb-1">Сенімділік</p>
                          <ConfidenceBar value={p.confidence} />
                        </div>

                        {/* Attention */}
                        <div className="w-16 flex-shrink-0 text-center hidden xl:block">
                          <p className="text-[9px] text-[#66B2B2] uppercase font-black mb-1">Зейін</p>
                          <span className="text-xs font-black text-[#2F7F86]">{p.avgAttention}%</span>
                        </div>

                        <span className="material-symbols-outlined text-[#BFE3E1] ml-auto transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                      </button>

                      {/* Expanded: feature contributions */}
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-1" style={{ background: '#f8fdfc' }}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Зейін ықпалы', value: p.contributions?.attention, icon: 'ads_click', color: '#2F7F86' },
                              { label: 'Эмоция ықпалы', value: p.contributions?.emotion, icon: 'mood', color: '#f59e0b' },
                              { label: 'Баға ықпалы', value: p.contributions?.grade, icon: 'grade', color: '#22c55e' },
                              { label: 'Тренд ықпалы', value: p.contributions?.trend, icon: 'trending_up', color: '#8b5cf6' },
                            ].map(f => (
                              <div key={f.label} className="p-3 rounded-xl" style={{ background: '#fff', border: '1px solid #BFE3E1' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="material-symbols-outlined text-sm" style={{ color: f.color }}>{f.icon}</span>
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[#66B2B2]">{f.label}</span>
                                </div>
                                <span className="font-['Space_Grotesk'] font-black text-xl" style={{ color: f.value >= 0 ? f.color : '#ef4444' }}>
                                  {f.value >= 0 ? '+' : ''}{f.value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-[#66B2B2] mt-3">
                            Деректер саны: {p.gradeCount} баға · {p.monitoringCount} мониторинг жазбасы
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Model explanation */}
          <div className="card-glow rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,rgba(15,76,92,0.03),rgba(47,127,134,0.02))' }}>
            <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#2F7F86]">info</span>
              Модель қалай жұмыс істейді
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#66B2B2]">
              <div className="space-y-1">
                <p className="font-black text-[#0F4C5C] text-xs uppercase tracking-wider">1. Деректер жинау</p>
                <p>Әр оқушының зейін орташасы, эмоция деңгейі, соңғы 3 бағасы, баға тренді жиналады.</p>
              </div>
              <div className="space-y-1">
                <p className="font-black text-[#0F4C5C] text-xs uppercase tracking-wider">2. OLS регрессия</p>
                <p>β = (XᵀX)⁻¹Xᵀy формуласымен ең кіші квадраттар әдісімен коэффициенттер есептеледі.</p>
              </div>
              <div className="space-y-1">
                <p className="font-black text-[#0F4C5C] text-xs uppercase tracking-wider">3. Болжам</p>
                <p>ŷ = β₀ + β₁·зейін + β₂·эмоция + β₃·баға + β₄·тренд формуласымен болжамды баға шығарылады.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
