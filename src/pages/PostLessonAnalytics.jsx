import { useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

function statusOf(attention, score) {
  const avg = (attention + score) / 2
  if (avg >= 85) return 'excellent'
  if (avg >= 70) return 'good'
  if (avg >= 50) return 'average'
  return 'poor'
}
function statusStyle(s) {
  if (s === 'excellent') return { color: '#22c55e', background: '#f0fdf4', border: '1px solid #bbf7d0' }
  if (s === 'good') return { color: '#2F7F86', background: '#E6F4F3', border: '1px solid #BFE3E1' }
  if (s === 'average') return { color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a' }
  return { color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }
}
function statusLabel(s) {
  if (s === 'excellent') return 'Үздік'
  if (s === 'good') return 'Жақсы'
  if (s === 'average') return 'Орташа'
  return 'Назар аудару'
}

const baseChartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { color: 'rgba(191,227,225,0.3)' }, ticks: { color: '#66B2B2', font: { size: 10 } } },
    y: { grid: { color: 'rgba(191,227,225,0.3)' }, ticks: { color: '#66B2B2', font: { size: 10 } }, min: 0, max: 100 },
  },
}

export default function PostLessonAnalytics() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [lessons, setLessons] = useState([])
  const [selLesson, setSelLesson] = useState(null)
  const [students, setStudents] = useState([])
  const [grades, setGrades] = useState([])
  const [monitoring, setMonitoring] = useState([])
  const [loading, setLoading] = useState(false)

  const [aiRecs, setAiRecs] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiModel, setAiModel] = useState(null)

  // Load lessons on mount
  useEffect(() => {
    api.getLessons().then(data => {
      setLessons(data)
      if (data[0]) setSelLesson(data[0])
    }).catch(() => {})
  }, [])

  // Load data when lesson changes
  useEffect(() => {
    if (!selLesson) return
    setLoading(true)
    Promise.all([
      api.getStudents(),
      api.getGrades(),
      api.getMonitoring(selLesson.id),
    ]).then(([sts, grd, mon]) => {
      setStudents(sts)
      setGrades(grd.filter(g => g.lesson_id === selLesson.id))
      setMonitoring(mon)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selLesson])

  // Compute per-student stats
  const studentStats = useMemo(() => {
    if (!selLesson) return []
    return students
      .filter(s => !selLesson.class_name || s.class_name === selLesson.class_name)
      .map(s => {
        const mon = monitoring.filter(m => m.student_id === s.id)
        const grade = grades.find(g => g.student_id === s.id)
        const avgAtt = mon.length ? Math.round(mon.reduce((a, m) => a + (m.attention || 0), 0) / mon.length) : 0
        const avgEmo = mon.length ? Math.round(mon.reduce((a, m) => a + (m.emotion || 0), 0) / mon.length) : 0
        const avgPls = mon.length ? Math.round(mon.reduce((a, m) => a + (m.pulse || 0), 0) / mon.length) : 0
        const score = grade ? Math.round(Number(grade.score) * 20) : 0 // score 1-5 → 20-100
        return {
          id: s.id, name: s.full_name,
          attention: avgAtt, emotion: avgEmo, pulse: avgPls,
          score, grade: grade?.score ?? null,
          status: statusOf(avgAtt, score),
          hasMonitoring: mon.length > 0,
        }
      })
  }, [students, grades, monitoring, selLesson])

  // Timeline: average metrics by time slot across all students
  const timeline = useMemo(() => {
    if (!monitoring.length) return { labels: [], attention: [], emotion: [], pulse: [] }
    const sorted = [...monitoring].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    // Group into 12 buckets
    const buckets = 12
    const chunkSize = Math.ceil(sorted.length / buckets)
    const labels = [], attention = [], emotion = [], pulse = []
    for (let i = 0; i < buckets; i++) {
      const chunk = sorted.slice(i * chunkSize, (i + 1) * chunkSize)
      if (!chunk.length) break
      labels.push(`${i * 4}м`)
      attention.push(Math.round(chunk.reduce((a, m) => a + (m.attention || 0), 0) / chunk.length))
      emotion.push(Math.round(chunk.reduce((a, m) => a + (m.emotion || 0), 0) / chunk.length))
      pulse.push(Math.round(chunk.reduce((a, m) => a + (m.pulse || 0), 0) / chunk.length))
    }
    return { labels, attention, emotion, pulse }
  }, [monitoring])

  // Global averages
  const withMon = studentStats.filter(s => s.hasMonitoring)
  const globalAvgAtt = withMon.length ? Math.round(withMon.reduce((a, s) => a + s.attention, 0) / withMon.length) : 0
  const globalAvgEmo = withMon.length ? Math.round(withMon.reduce((a, s) => a + s.emotion, 0) / withMon.length) : 0
  const globalAvgPls = withMon.length ? Math.round(withMon.reduce((a, s) => a + s.pulse, 0) / withMon.length) : 0
  const completion = studentStats.length ? Math.round((studentStats.filter(s => s.grade !== null).length / studentStats.length) * 100) : 0

  // Fetch AI recs when lesson changes
  useEffect(() => {
    if (!selLesson || !studentStats.length) return
    setAiLoading(true)
    setAiRecs(null)
    api.getAIRecommendations({
      lessonTitle: selLesson.title,
      subject: selLesson.subject,
      className: selLesson.class_name,
      durationMinutes: selLesson.duration,
      studentCount: studentStats.length,
      avgAttention: globalAvgAtt,
      avgEmotion: globalAvgEmo,
      avgPulse: globalAvgPls,
      completionRate: completion,
      attentionTimeline: timeline.attention,
      studentResults: studentStats.slice(0, 6),
    }).then(res => {
      setAiRecs(res.recommendations)
      setAiModel(res.model)
    }).catch(() => {
      setAiRecs([
        { icon: 'trending_up', text: 'Сабақтың ортасында зейін төмендеген. Интерактивті тапсырма қосыңыз.', type: 'info' },
        { icon: 'group', text: `${studentStats.filter(s => s.status === 'poor').length} оқушы назар аударуды қажет етеді.`, type: 'warning' },
        { icon: 'star', text: 'Үздік оқушылар үшін күрделірек материал дайындаңыз.', type: 'success' },
        { icon: 'schedule', text: `Сабақ ұзақтығы: ${selLesson.duration} мин. Оңтайлы деп саналады.`, type: 'info' },
      ])
    }).finally(() => setAiLoading(false))
  }, [selLesson?.id, studentStats.length])

  const exportPDF = () => {
    if (!selLesson) return
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(18); doc.setTextColor(15, 76, 92)
    doc.text('ZerAql — Сабақтан кейінгі есеп', 14, 16)
    doc.setFontSize(10); doc.setTextColor(102, 178, 178)
    doc.text(`${selLesson.title} · ${selLesson.class_name || ''} · ${selLesson.subject || ''} · ${selLesson.duration} мин`, 14, 24)
    doc.setFontSize(9); doc.setTextColor(80, 80, 80)
    doc.text(`Зейін: ${globalAvgAtt}%   Эмоция: ${globalAvgEmo}%   Пульс: ${globalAvgPls} bpm   Орындалу: ${completion}%`, 14, 32)
    autoTable(doc, {
      head: [['Оқушы', 'Зейін', 'Эмоция', 'Пульс', 'Баға', 'Бағалау']],
      body: studentStats.map(s => [s.name, `${s.attention}%`, `${s.emotion}%`, s.pulse ? `${s.pulse} bpm` : '—', s.grade ?? '—', statusLabel(s.status)]),
      startY: 38,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 76, 92], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 250, 250] },
    })
    doc.save('zeraql-analytics.pdf')
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const distCounts = ['excellent', 'good', 'average', 'poor'].map(st => studentStats.filter(s => s.status === st).length)

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Аналитика" subtitle="Сабақтан кейінгі есеп" hasSidebar />

      <div className="ml-64">
        {/* Banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg,#0F4C5C 0%,#1a6474 50%,#2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px,transparent 1px),linear-gradient(90deg,#BFE3E1 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#66B2B2] text-xl">bar_chart</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#BFE3E1]/60">Сабақтан кейінгі есеп</span>
              </div>
              {/* Lesson selector */}
              <div className="relative inline-block mb-1">
                <select
                  value={selLesson?.id || ''}
                  onChange={e => setSelLesson(lessons.find(l => l.id === Number(e.target.value)))}
                  className="appearance-none bg-transparent text-white font-['Space_Grotesk'] text-2xl font-black tracking-tight pr-8 focus:outline-none cursor-pointer">
                  {lessons.map(l => <option key={l.id} value={l.id} className="text-[#0F4C5C] bg-white text-base font-normal">{l.title}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">expand_more</span>
              </div>
              <p className="text-[#BFE3E1]/60 text-sm">
                {selLesson?.class_name || '—'} · {selLesson?.subject || '—'} · {selLesson?.duration || 0} мин · {studentStats.length} оқушы
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#0F4C5C' }}>
                <span className="material-symbols-outlined text-sm text-[#2F7F86]">picture_as_pdf</span>
                PDF жүктеу
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Орташа зейін', value: `${globalAvgAtt}%`, icon: 'ads_click', color: '#2F7F86' },
              { label: 'Орташа эмоция', value: `${globalAvgEmo}%`, icon: 'mood', color: '#f59e0b' },
              { label: 'Орындалу', value: `${completion}%`, icon: 'task_alt', color: '#22c55e' },
              { label: 'Орт. пульс', value: globalAvgPls ? `${globalAvgPls} bpm` : '—', icon: 'favorite', color: '#ef4444' },
            ].map(m => (
              <div key={m.label} className="card-glow rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: m.color }} />
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#66B2B2]">{m.label}</span>
                  <span className="material-symbols-outlined text-sm" style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                </div>
                <div className="font-['Space_Grotesk'] text-2xl font-black" style={{ color: m.color }}>{loading ? '...' : m.value}</div>
              </div>
            ))}
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4">Зейін динамикасы</h3>
              <div style={{ height: 180 }}>
                <Line data={{
                  labels: timeline.labels,
                  datasets: [{ label: 'Зейін %', data: timeline.attention, fill: true, borderColor: '#2F7F86', backgroundColor: 'rgba(47,127,134,0.1)', tension: 0.4, pointRadius: 4, pointBackgroundColor: timeline.attention.map(v => v >= 80 ? '#22c55e' : v >= 65 ? '#2F7F86' : '#f59e0b') }],
                }} options={baseChartOpts} />
              </div>
            </div>
            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4">Эмоция динамикасы</h3>
              <div style={{ height: 180 }}>
                <Line data={{
                  labels: timeline.labels,
                  datasets: [{ label: 'Эмоция %', data: timeline.emotion, fill: true, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, pointRadius: 4, pointBackgroundColor: '#f59e0b' }],
                }} options={baseChartOpts} />
              </div>
            </div>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4">Пульс динамикасы</h3>
              <div style={{ height: 150 }}>
                <Line data={{
                  labels: timeline.labels,
                  datasets: [{ label: 'Пульс bpm', data: timeline.pulse, fill: false, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, pointRadius: 4, pointBackgroundColor: '#ef4444' }],
                }} options={{ ...baseChartOpts, scales: { ...baseChartOpts.scales, y: { ...baseChartOpts.scales.y, min: 50, max: 110 } } }} />
              </div>
              <p className="text-[10px] text-[#66B2B2] mt-3">* rPPG алгоритмі · ±10–15 bpm қателік</p>
            </div>

            <div className="card-glow p-6 rounded-2xl flex flex-col">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4">Нәтиже бөлінісі</h3>
              <div className="flex-1 flex items-center justify-center" style={{ height: 160 }}>
                <Doughnut data={{
                  labels: ['Үздік', 'Жақсы', 'Орташа', 'Назар аудару'],
                  datasets: [{ data: distCounts, backgroundColor: ['#22c55e', '#2F7F86', '#f59e0b', '#ef4444'], borderWidth: 0 }],
                }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#66B2B2', font: { size: 9 }, boxWidth: 10, padding: 8 } } } }} />
              </div>
            </div>

            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[#2F7F86]">psychology</span>
                AI Ұсынымдары
              </h3>
              {aiModel && <p className="text-[9px] text-[#66B2B2] mb-3 uppercase tracking-wider font-black">{aiModel === 'gpt-4o-mini' ? '⚡ GPT-4o-mini' : '📐 Ереже негізінде'}</p>}
              {aiLoading ? (
                <div className="space-y-2 mt-2">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#E6F4F3' }} />)}</div>
              ) : (
                <div className="space-y-2 mt-2">
                  {(aiRecs || []).map((r, i) => (
                    <div key={i} className="flex gap-2 p-2.5 rounded-xl"
                      style={r.type === 'warning' ? { background: '#fffbeb', border: '1px solid #fde68a' } : r.type === 'success' ? { background: '#f0fdf4', border: '1px solid #bbf7d0' } : { background: '#E6F4F3', border: '1px solid #BFE3E1' }}>
                      <span className="material-symbols-outlined text-sm mt-0.5 flex-shrink-0"
                        style={{ color: r.type === 'warning' ? '#f59e0b' : r.type === 'success' ? '#22c55e' : '#2F7F86' }}>{r.icon}</span>
                      <p className="text-xs text-[#0F4C5C] leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Student bar chart */}
          {studentStats.length > 0 && (
            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-6">Оқушылар салыстыруы</h3>
              <div style={{ height: 220 }}>
                <Bar data={{
                  labels: studentStats.slice(0, 12).map(s => s.name.split(' ')[0]),
                  datasets: [
                    { label: 'Зейін', data: studentStats.slice(0, 12).map(s => s.attention), backgroundColor: 'rgba(47,127,134,0.7)', borderRadius: 4 },
                    { label: 'Эмоция', data: studentStats.slice(0, 12).map(s => s.emotion), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
                    { label: 'Баға (%)', data: studentStats.slice(0, 12).map(s => s.score), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
                  ],
                }} options={{ ...baseChartOpts, plugins: { legend: { display: true, labels: { color: '#66B2B2', font: { size: 10 }, boxWidth: 12 } } } }} />
              </div>
            </div>
          )}

          {/* Student results table */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-[#BFE3E1]" style={{ background: 'linear-gradient(180deg,#fff,#f8fdfc)' }}>
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Оқушылар нәтижелері</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
                <span className="text-sm text-[#66B2B2]">Жүктелуде...</span>
              </div>
            ) : studentStats.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">group_off</span>
                <p className="text-sm text-[#66B2B2]">Бұл сабақта оқушылар жоқ</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead style={{ background: '#E6F4F3' }}>
                  <tr>
                    {['Оқушы', 'Зейін', 'Эмоция', 'Пульс', 'Баға', 'Бағалау'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#66B2B2]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BFE3E1]">
                  {studentStats.map(s => (
                    <tr key={s.id} className="hover:bg-[#E6F4F3]/40 transition-colors bg-white">
                      <td className="px-6 py-4">
                        <Link to={`/student-analytics/${s.id}`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#BFE3E1,#66B2B2)' }}>
                            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                          </div>
                          <span className="font-bold text-sm text-[#0F4C5C] group-hover:text-[#2F7F86] transition-colors underline-offset-2 group-hover:underline">{s.name}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-[#BFE3E1] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s.attention}%`, backgroundColor: s.attention >= 80 ? '#2F7F86' : s.attention >= 65 ? '#66B2B2' : '#f59e0b' }} />
                          </div>
                          <span className="text-xs font-black text-[#0F4C5C]">{s.attention}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-[#BFE3E1] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${s.emotion}%` }} />
                          </div>
                          <span className="text-xs font-black text-[#0F4C5C]">{s.emotion}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-[#0F4C5C]">{s.pulse ? `${s.pulse} bpm` : '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">{s.grade ?? '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black px-3 py-1 rounded-full" style={statusStyle(s.status)}>{statusLabel(s.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
