import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

const RISK_ORDER = { at_risk: 0, watch: 1, on_track: 2, advanced: 3 }

export default function KundeligImport() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }
  const fileRef = useRef()

  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all') // all | at_risk | watch | on_track | advanced
  const [sortBy, setSortBy] = useState('risk') // risk | name | predicted | avg

  const processFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xls|xlsx)$/i)) {
      setError('Тек .xls немесе .xlsx файлдары қолданылады (Күнделік.kz)')
      return
    }
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const result = await api.importJournal(file)
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleExport = async () => {
    try {
      const blob = await api.exportJournal()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ZerAql_Journal_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert(e.message) }
  }

  const filtered = data?.students
    ?.filter(s => filter === 'all' || s.risk === filter)
    ?.sort((a, b) => {
      if (sortBy === 'risk') return RISK_ORDER[a.risk] - RISK_ORDER[b.risk]
      if (sortBy === 'predicted') return b.predicted - a.predicted
      if (sortBy === 'avg') return (b.avgScore5 || 0) - (a.avgScore5 || 0)
      return a.name.localeCompare(b.name)
    }) || []

  const riskCounts = data?.students?.reduce((acc, s) => {
    acc[s.risk] = (acc[s.risk] || 0) + 1; return acc
  }, {}) || {}

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || ''} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Күнделік.kz Импорт" subtitle="Журналды жүктеп, ML болжамын алыңыз" hasSidebar />

      <main className="ml-64 p-8 space-y-8">

        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden px-8 py-7 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)' }}>
          <div>
            <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">AI · ҚР МОН РК 2023-2024</p>
            <h2 className="font-['Space_Grotesk'] text-2xl font-black text-white">Күнделік.kz → ML Болжам</h2>
            <p className="text-[#BFE3E1]/70 text-sm mt-1">XLS файлды жүктеңіз — ИИ әр оқушы үшін болжам жасайды</p>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span className="material-symbols-outlined text-sm">download</span>
            Журналды Excel-ге жүктеу
          </button>
        </div>

        {/* Upload zone */}
        {!data && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-3xl p-16 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? '#2F7F86' : '#BFE3E1'}`,
              background: dragging ? 'rgba(47,127,134,0.04)' : '#fff',
            }}>
            <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
              onChange={e => processFile(e.target.files[0])} />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
                <p className="font-bold text-[#66B2B2]">Файл талданып, ML болжам жасалуда...</p>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-5xl text-[#BFE3E1] mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>upload_file</span>
                <p className="font-['Space_Grotesk'] font-black text-lg text-[#0F4C5C] mb-2">
                  Күнделік.kz файлын осында сүйреңіз
                </p>
                <p className="text-sm text-[#66B2B2] mb-4">немесе файлды таңдау үшін басыңыз</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{ background: '#E6F4F3', color: '#2F7F86' }}>
                  <span className="material-symbols-outlined text-sm">description</span>
                  .xls / .xlsx — Күнделік.kz стандартты экспорт
                </div>
              </>
            )}
            {error && (
              <div className="mt-4 p-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* File info + model info */}
            <div className="grid grid-cols-2 gap-5">
              <div className="card-glow p-6 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#2F7F86]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                  <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Файл мәліметтері</h3>
                </div>
                {[
                  { label: 'Сынып', value: data.className },
                  { label: 'Пән', value: data.subject },
                  { label: 'Мұғалім', value: data.teacher },
                  { label: 'Сабақтар саны', value: data.lessonCount },
                  { label: 'Оқушылар', value: data.students.length },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-[#66B2B2] font-semibold">{r.label}</span>
                    <span className="font-bold text-[#0F4C5C]">{r.value}</span>
                  </div>
                ))}
              </div>

              <div className="card-glow p-6 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#2F7F86]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">ML Модель</h3>
                </div>
                {[
                  { label: 'Алгоритм', value: data.modelInfo.algorithm },
                  { label: 'Датасет', value: data.modelInfo.dataset },
                  { label: 'Пән зейін нормасы', value: `${data.modelInfo.subjectAvgAttention}%` },
                  { label: 'ҚР орташа баға', value: data.modelInfo.nationalAvg },
                  { label: 'Калибрация', value: data.modelInfo.calibration },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-[#66B2B2] font-semibold">{r.label}</span>
                    <span className="font-bold text-[#0F4C5C] text-right max-w-[200px] truncate">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk summary cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { key: 'at_risk',  label: 'Қауіп бар',      color: '#ef4444', bg: '#fef2f2', icon: 'warning' },
                { key: 'watch',    label: 'Назар аудар',     color: '#f59e0b', bg: '#fffbeb', icon: 'visibility' },
                { key: 'on_track', label: 'Жол үстінде',    color: '#2F7F86', bg: '#E6F4F3', icon: 'trending_up' },
                { key: 'advanced', label: 'Үздік',           color: '#22c55e', bg: '#f0fdf4', icon: 'star' },
              ].map(r => (
                <button key={r.key} onClick={() => setFilter(filter === r.key ? 'all' : r.key)}
                  className="p-5 rounded-2xl text-center transition-all hover:-translate-y-0.5"
                  style={{
                    background: filter === r.key ? r.color + '18' : r.bg,
                    border: `2px solid ${filter === r.key ? r.color : r.color + '30'}`,
                  }}>
                  <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: r.color, fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                  <div className="text-3xl font-['Space_Grotesk'] font-black" style={{ color: r.color }}>
                    {riskCounts[r.key] || 0}
                  </div>
                  <div className="text-xs font-bold text-[#66B2B2] mt-1">{r.label}</div>
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {['risk', 'predicted', 'avg', 'name'].map(s => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={sortBy === s ? { background: '#0F4C5C', color: '#fff' } : { background: '#E6F4F3', color: '#2F7F86' }}>
                    {s === 'risk' ? 'Қауіп' : s === 'predicted' ? 'Болжам ↓' : s === 'avg' ? 'Орташа ↓' : 'Аты-жөні'}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setData(null); setFilter('all') }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#BFE3E1] text-[#2F7F86] font-bold text-xs hover:bg-[#E6F4F3] transition-all">
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Жаңа файл
                </button>
                <button onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}>
                  <span className="material-symbols-outlined text-sm">download</span>
                  Excel жүктеу
                </button>
              </div>
            </div>

            {/* Students table */}
            <div className="card-glow rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#f8fdfc', borderBottom: '2px solid #E6F4F3' }}>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-[#66B2B2]">№</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-[#66B2B2]">Оқушы</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">Орт. баға (12б)</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">Орт. баға (5б)</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">БЖБ</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">Тренд</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">Қатысу</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">ML Болжам</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-[#66B2B2]">Қауіп</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-[#66B2B2]">Ұсыным</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((st, i) => (
                    <tr key={st.iin || i} style={{ borderBottom: '1px solid #E6F4F3' }}
                      className="hover:bg-[#f8fdfc] transition-colors">
                      <td className="px-4 py-3 text-[#66B2B2] font-bold">{st.num}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#0F4C5C]">{st.name}</div>
                        {st.absentCount > 0 && (
                          <div className="text-[10px] text-red-400 font-bold">{st.absentCount} рет қалған</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-[#0F4C5C]">
                          {st.avgScore5 ? (st.avgScore5 * 12 / 5).toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-black" style={{
                          color: !st.avgScore5 ? '#9ca3af'
                            : st.avgScore5 >= 4 ? '#22c55e'
                            : st.avgScore5 >= 3 ? '#2F7F86'
                            : st.avgScore5 >= 2 ? '#f59e0b'
                            : '#ef4444'
                        }}>
                          {st.avgScore5 || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-[#0F4C5C]">{st.bjb12 || '—'}</span>
                        {st.bjb5 && <span className="text-[10px] text-[#66B2B2] ml-1">({st.bjb5})</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="material-symbols-outlined text-lg"
                          style={{ color: st.trendDir === 'up' ? '#22c55e' : st.trendDir === 'down' ? '#ef4444' : '#66B2B2' }}>
                          {st.trendDir === 'up' ? 'trending_up' : st.trendDir === 'down' ? 'trending_down' : 'trending_flat'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-16 h-1.5 rounded-full bg-[#E6F4F3] overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${st.participationRate * 100}%`,
                              background: st.participationRate >= 0.8 ? '#22c55e' : st.participationRate >= 0.6 ? '#f59e0b' : '#ef4444'
                            }} />
                          </div>
                          <span className="text-[11px] font-bold text-[#66B2B2]">{Math.round(st.participationRate * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-['Space_Grotesk'] font-black" style={{ color: st.riskLabel.color }}>
                            {st.predictedGrade}
                          </span>
                          <span className="text-[10px] text-[#66B2B2]">{st.predicted}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-black"
                          style={{ background: st.riskLabel.bg, color: st.riskLabel.color }}>
                          {st.riskLabel.kz}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-xs text-[#66B2B2] leading-relaxed">{st.recommendation}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-10 text-center text-[#66B2B2] font-bold">
                  Бұл санатта оқушылар жоқ
                </div>
              )}
            </div>

            {/* Grade distribution */}
            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4">ML Болжам үлестірімі</h3>
              <div className="grid grid-cols-5 gap-3">
                {[5, 4, 3, 2, 1].map(grade => {
                  const count = data.students.filter(s => s.predictedGrade === grade).length
                  const pct = data.students.length ? Math.round(count / data.students.length * 100) : 0
                  const colors = { 5: '#22c55e', 4: '#2F7F86', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' }
                  return (
                    <div key={grade} className="text-center p-4 rounded-2xl"
                      style={{ background: colors[grade] + '10', border: `1px solid ${colors[grade]}25` }}>
                      <div className="text-3xl font-['Space_Grotesk'] font-black mb-1" style={{ color: colors[grade] }}>{grade}</div>
                      <div className="text-lg font-black text-[#0F4C5C]">{count} оқушы</div>
                      <div className="text-xs text-[#66B2B2] font-bold">{pct}%</div>
                      <div className="mt-2 h-1.5 rounded-full bg-[#E6F4F3] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[grade] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
