import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import { useTeacherMonitoring } from '../hooks/useMonitoringSocket'

const variantStyles = {
  teal: { bar: '#2F7F86', icon: 'text-[#2F7F86]', bg: 'bg-[#E6F4F3]' },
  dark: { bar: '#0F4C5C', icon: 'text-[#0F4C5C]', bg: 'bg-[#E6F4F3]' },
  amber: { bar: '#f59e0b', icon: 'text-amber-500', bg: 'bg-amber-50' },
  red: { bar: '#ef4444', icon: 'text-red-500', bg: 'bg-red-50' },
}

function getStatus(s) {
  if (s.attention >= 70 && s.emotion >= 70) return 'success'
  if (s.attention >= 50 || s.emotion >= 50) return 'warning'
  return 'danger'
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [classesList, setClassesList] = useState([])
  const [newClassName, setNewClassName] = useState('')
  const [grades, setGrades] = useState([])

  useEffect(() => {
    api.getStudents().then(data => {
      setStudents(data.map(s => ({ ...s, name: s.full_name, emotion: 0, attention: 0, pulse: 0, status: 'warning' })))
    }).catch(() => {})
    api.getLiveMonitoring().then(data => {
      if (data.length > 0) {
        setStudents(prev => prev.map(s => {
          const live = data.find(d => d.student_id === s.id)
          return live ? { ...s, attention: live.attention || 0, emotion: live.emotion || 0, pulse: live.pulse || 0, status: getStatus(live) } : s
        }))
      }
    }).catch(() => {})
    api.getLessons().then(setLessons).catch(() => {})
    api.getClasses().then(setClassesList).catch(() => {})
    api.getGrades().then(setGrades).catch(() => {})
  }, [])

  const handleCreateClass = async (e) => {
    e.preventDefault()
    if (!newClassName.trim()) return
    try {
      const cls = await api.createClass({ name: newClassName.trim() })
      setClassesList([cls, ...classesList])
      setNewClassName('')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  // WebSocket real-time monitoring
  const classId = classesList[0]?.id || null
  const { connected: wsConnected, students: wsStudents, alerts: wsAlerts, violations: wsViolations } =
    useTeacherMonitoring({ teacherId: user?.id, classId, enabled: !!classId })

  // Alert teacher when a new violation comes in
  const prevViolationCount = useRef(0)
  useEffect(() => {
    if (wsViolations.length > prevViolationCount.current) {
      prevViolationCount.current = wsViolations.length
      // Browser notification
      if (Notification.permission === 'granted') {
        const v = wsViolations[0]
        new Notification(`⚠ Бұзушылық: ${v.studentName}`, {
          body: v.violation?.message || v.violation?.type,
          icon: '/favicon.ico',
        })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [wsViolations.length])

  // Dynamic stats
  const activeLessons = lessons.filter(l => l.status === 'active')
  const draftLessons = lessons.filter(l => l.status === 'draft')
  const totalStudents = classesList.reduce((sum, c) => sum + (Number(c.student_count) || 0), 0)

  const stats = [
    { label: 'Барлық сабақтар', value: String(lessons.length), icon: 'calendar_today', variant: 'teal' },
    { label: 'Менің оқушыларым', value: String(totalStudents || students.length), icon: 'groups', variant: 'dark' },
    { label: 'Тексеру күтеді', value: String(draftLessons.length), icon: 'fact_check', variant: 'amber' },
    { label: 'Менің сыныптарым', value: String(classesList.length), icon: 'school', variant: 'red' },
  ]

  // Compute class averages dynamically from grades
  const avgScore = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + Number(g.score || 0), 0) / grades.length) : 0
  const avgAttention = students.length > 0 ? Math.round(students.reduce((s, st) => s + (st.attention || 0), 0) / students.length) : 0
  const avgEmotion = students.length > 0 ? Math.round(students.reduce((s, st) => s + (st.emotion || 0), 0) / students.length) : 0

  const classAverages = [
    { label: 'Зейін', value: avgAttention, color: '#2F7F86' },
    { label: 'Эмоция', value: avgEmotion, color: '#66B2B2' },
    { label: 'Орта балл', value: avgScore, color: '#0F4C5C' },
  ]

  // Find alert student — the one with the lowest attention
  const alertStudent = students.length > 0
    ? students.reduce((min, s) => (s.attention < min.attention ? s : min), students[0])
    : null

  const firstName = user?.full_name || 'Мұғалім'

  // Active lesson for the banner
  const currentLesson = activeLessons[0] || null

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || 'Мұғалім'} onLogout={handleLogout} />
      <TopBar breadcrumb="Мұғалім" subtitle="Басты панель" hasSidebar />

      <div className="ml-64">
        {/* Welcome banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px, transparent 1px), linear-gradient(90deg, #BFE3E1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #66B2B2, transparent)', filter: 'blur(60px)' }} />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {currentLesson ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-green-400">Тірі эфир</span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFE3E1]/60">Белсенді сабақ жоқ</span>
                )}
                <span className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={wsConnected
                    ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#BFE3E1', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
                  {wsConnected ? 'WS Онлайн' : 'WS Офлайн'}
                </span>
              </div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-black text-white tracking-tight">
                Қош келдіңіз, {firstName}
              </h1>
              <p className="text-[#BFE3E1]/70 mt-1 text-sm">
                {currentLesson ? `${currentLesson.subject || currentLesson.title} — ${currentLesson.class_name || ''} сынып қазір өтіп жатыр` : 'Оң жақтағы панельден сынып қосыңыз және оқушыларға кодын беріңіз'}
              </p>
            </div>

            <div className="flex gap-8">
              {[
                { label: 'Сыныптар', value: String(classesList.length) },
                { label: 'Оқушылар', value: String(totalStudents || students.length) },
                { label: 'Сабақтар', value: String(lessons.length) },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="font-['Space_Grotesk'] text-3xl font-black text-white">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/50 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 grid grid-cols-12 gap-8">
          {/* Left column */}
          <div className="col-span-12 lg:col-span-9 space-y-8">

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s) => {
                const v = variantStyles[s.variant]
                return (
                  <div key={s.label} className="card-glow rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: v.bar }} />
                    <span className={`material-symbols-outlined text-2xl ${v.icon} mb-2`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                    <div className="font-['Space_Grotesk'] text-3xl font-black" style={{ color: v.bar }}>{s.value}</div>
                    <div className="text-[10px] text-[#66B2B2] uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Alert card — only show if there's a student with low attention */}
            {alertStudent && alertStudent.attention < 50 && (
              <div className="relative overflow-hidden rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
                style={{ background: 'linear-gradient(135deg, #fef2f2, #fff5f5)', border: '2px solid #fca5a5' }}>
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-red-400" />
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 border-2 border-red-300 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-red-500 text-3xl">person_off</span>
                  </div>
                  <div>
                    <h3 className="font-['Space_Grotesk'] font-black text-red-600 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                      НАЗАР! {alertStudent.name}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs font-bold">
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">trending_down</span>
                        Зейін {alertStudent.attention}% — ТӨМЕН
                      </span>
                      {alertStudent.pulse > 0 && (
                        <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded-lg flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">favorite</span>
                          Пульс: {alertStudent.pulse} bpm
                        </span>
                      )}
                      <span className="bg-red-50 text-red-500 px-2 py-1 rounded-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">mood_bad</span>
                        Эмоция: {alertStudent.emotion}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time WS alerts */}
            {wsAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded-2xl px-5 py-3 flex items-center gap-3"
                style={alert.type === 'online'
                  ? { background: '#f0fdf4', border: '1px solid #bbf7d0' }
                  : { background: '#fef2f2', border: '1px solid #fecaca' }}>
                <span className="material-symbols-outlined text-sm"
                  style={{ color: alert.type === 'online' ? '#22c55e' : '#ef4444', fontVariationSettings: "'FILL' 1" }}>
                  {alert.type === 'online' ? 'person_check' : 'warning'}
                </span>
                <span className="text-sm font-bold"
                  style={{ color: alert.type === 'online' ? '#15803d' : '#dc2626' }}>
                  {alert.message}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {new Date(alert.timestamp).toLocaleTimeString('kk-KZ')}
                </span>
              </div>
            ))}

            {/* Violations panel — always visible */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${wsViolations.length > 0 ? '#fecaca' : '#BFE3E1'}`, background: wsViolations.length > 0 ? '#fff5f5' : '#fff' }}>
              <div className="flex items-center gap-2 px-5 py-3" style={{ background: wsViolations.length > 0 ? '#fef2f2' : '#f0fafa', borderBottom: `1px solid ${wsViolations.length > 0 ? '#fecaca' : '#BFE3E1'}` }}>
                <span className="material-symbols-outlined text-base" style={{ color: wsViolations.length > 0 ? '#ef4444' : '#66B2B2', fontVariationSettings: "'FILL' 1" }}>gpp_bad</span>
                <span className="font-['Space_Grotesk'] font-black text-sm" style={{ color: wsViolations.length > 0 ? '#b91c1c' : '#0F4C5C' }}>
                  Бұзушылықтар
                </span>
                <span className="text-[10px] text-[#66B2B2] ml-1">— нақты уақытта</span>
                {wsViolations.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">{wsViolations.length}</span>
                )}
                {!wsConnected && (
                  <span className="ml-auto text-[10px] text-[#66B2B2]">WS офлайн</span>
                )}
              </div>
              {wsViolations.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-4 text-[#66B2B2]">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  <span className="text-xs">Бұзушылықтар жоқ — барлығы жақсы</span>
                </div>
              ) : (
                <div className="divide-y divide-red-100 max-h-52 overflow-y-auto">
                  {wsViolations.slice(0, 20).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="material-symbols-outlined text-sm text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {v.violation?.type === 'tab_switch' ? 'tab_unselected'
                          : v.violation?.type === 'face_missing' ? 'face_retouching_off'
                          : v.violation?.type === 'multiple_faces' ? 'group'
                          : v.violation?.type === 'face_mismatch' ? 'person_off'
                          : 'warning'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-red-700 truncate">{v.studentName}</p>
                        <p className="text-[11px] text-red-500 truncate">{v.violation?.message || v.violation?.type}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(v.timestamp).toLocaleTimeString('kk-KZ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Students section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C] tracking-tight">
                    Менің оқушыларым
                    <span className="text-[#66B2B2] font-normal text-base ml-2">({students.length} оқушы)</span>
                  </h2>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="card-glow rounded-2xl p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#BFE3E1] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>group_add</span>
                  <p className="font-['Space_Grotesk'] font-bold text-[#0F4C5C]">Әлі оқушылар жоқ</p>
                  <p className="text-sm text-[#66B2B2] mt-1">Алдымен сынып қосып, оқушыларға сынып кодын беріңіз</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                  {students.map((s, i) => {
                    const liveData = s.id ? wsStudents[s.id] : null
                    const liveMetrics = liveData?.metrics
                    const attention = liveMetrics?.attention ?? s.attention ?? 0
                    const emotion = liveMetrics?.emotionKz ?? (s.emotion ? `${s.emotion}%` : '—')
                    const pulse = liveMetrics?.pulse ?? s.pulse ?? 0
                    const isLive = !!liveMetrics
                    const borderColor = attention >= 70 ? '#22c55e' : attention >= 40 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={s.id || i} className="card rounded-xl overflow-hidden hover:-translate-y-0.5 transition-all cursor-pointer"
                        style={{ borderLeft: `3px solid ${borderColor}` }}>
                        <div className="p-2.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #BFE3E1, #66B2B2)' }}>
                              <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[11px] text-[#0F4C5C] truncate leading-tight">{s.name}</h4>
                              <div className="flex items-center gap-1">
                                {s.class_name && <span className="text-[8px] text-[#66B2B2]">{s.class_name}</span>}
                                {isLive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1 bg-[#BFE3E1] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${attention}%`, backgroundColor: borderColor }} />
                            </div>
                            <span className="text-[9px] font-black w-6 text-right" style={{ color: borderColor }}>{attention}%</span>
                          </div>
                          <div className="flex gap-2 text-[9px] text-[#66B2B2]">
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>mood</span>
                              {emotion}
                            </span>
                            {pulse > 0 && (
                              <span className="flex items-center gap-0.5 text-red-400">
                                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                {pulse}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Lessons section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C] tracking-tight">
                  Сабақтар
                  <span className="text-[#66B2B2] font-normal text-base ml-2">({lessons.length})</span>
                </h2>
                <Link to="/create-lesson" className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Жаңа сабақ
                </Link>
              </div>

              {lessons.length === 0 ? (
                <div className="card-glow rounded-2xl p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-[#BFE3E1] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  <p className="font-['Space_Grotesk'] font-bold text-[#0F4C5C]">Әлі сабақтар жоқ</p>
                  <p className="text-sm text-[#66B2B2] mt-1">Жаңа сабақ жасау үшін жоғарыдағы батырманы басыңыз</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map(l => {
                    const statusColor = l.status === 'active' ? '#22c55e' : l.status === 'draft' ? '#f59e0b' : '#66B2B2'
                    const statusLabel = l.status === 'active' ? 'Белсенді' : l.status === 'draft' ? 'Жоба' : 'Аяқталды'
                    return (
                      <div key={l.id} className="card-glow rounded-2xl p-4 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-all">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[#0F4C5C] truncate">{l.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-[#66B2B2]">
                              {l.subject && <span>{l.subject}</span>}
                              {l.class_name && <span>• {l.class_name}</span>}
                              {l.duration && <span>• {l.duration} мин</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
                          style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                          {statusLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-3 space-y-5">

            {/* Class averages */}
            <div className="card-glow p-5 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[#0F4C5C] mb-4">Жалпы статистика</h3>
              {classAverages.map((m) => (
                <div key={m.label} className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#66B2B2] font-bold">{m.label}</span>
                    <span className="font-black" style={{ color: m.color }}>{m.value}%</span>
                  </div>
                  <div className="h-2 bg-[#E6F4F3] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${m.value}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* My Classes */}
            <div className="card-glow p-5 rounded-2xl flex flex-col max-h-80">
              <h3 className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[#0F4C5C] mb-4">Менің сыныптарым</h3>
              
              <form onSubmit={handleCreateClass} className="flex gap-2 mb-4 shrink-0">
                <input type="text" className="input-field text-xs py-2 px-3 flex-1" placeholder="Сынып аты (мысалы: 9А)" value={newClassName} onChange={e => setNewClassName(e.target.value)} required />
                <button type="submit" className="btn-primary py-2 px-3 text-xs bg-[#2F7F86] hover:bg-[#0F4C5C] text-white rounded-xl font-bold">Қосу</button>
              </form>

              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {classesList.length === 0 ? (
                  <p className="text-xs text-[#66B2B2] text-center mt-2">Сыныптар жоқ. Жаңадан қосыңыз.</p>
                ) : (
                  classesList.map(cls => (
                    <div key={cls.id} className="flex flex-col gap-1 p-3 rounded-xl bg-[#E6F4F3] border border-[#BFE3E1]/40">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-[#0F4C5C]">{cls.name}</span>
                        <span className="text-[10px] text-[#2F7F86] bg-white px-2 py-0.5 rounded-full border border-[#BFE3E1]">{cls.student_count || 0} оқушы</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#2F7F86] font-bold">Сынып коды:</span>
                        <span className="font-mono font-black text-[#0F4C5C] select-all bg-white px-2 py-0.5 rounded border border-[#BFE3E1]">{cls.code}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="card-glow p-5 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[#0F4C5C] mb-4">Жылдам әрекеттер</h3>
              <div className="space-y-2">
                {[
                  { icon: 'edit_note', label: 'Сабақ жасау', path: '/create-lesson', primary: true },
                  { icon: 'auto_stories', label: 'Журнал', path: '/journal', primary: false },
                  { icon: 'bar_chart', label: 'Аналитика', path: '/teacher-analytics', primary: false },
                  { icon: 'military_tech', label: 'Рейтинг', path: '/leaderboard', primary: false },
                ].map((a) => (
                  <Link key={a.label} to={a.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      a.primary
                        ? 'text-white'
                        : 'text-[#2F7F86] hover:bg-[#BFE3E1]/50'
                    }`}
                    style={a.primary ? { background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' } : { background: '#E6F4F3' }}>
                    <span className="material-symbols-outlined text-lg">{a.icon}</span>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Today lessons */}
            <div className="card-glow p-5 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] text-xs font-black uppercase tracking-widest text-[#0F4C5C] mb-4">Сабақтар тізімі</h3>
              <div className="space-y-3">
                {lessons.length === 0 ? (
                  <p className="text-xs text-[#66B2B2] text-center">Сабақтар жоқ</p>
                ) : (
                  lessons.slice(0, 5).map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: l.status === 'active' ? 'rgba(47,127,134,0.08)' : 'transparent', border: l.status === 'active' ? '1px solid rgba(47,127,134,0.2)' : '1px solid transparent' }}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        l.status === 'done' ? 'bg-green-500' : l.status === 'active' ? 'bg-[#2F7F86] animate-pulse' : 'bg-[#BFE3E1]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#0F4C5C] truncate">{l.title}</p>
                        <p className="text-[10px] text-[#66B2B2]">{l.subject || ''} {l.class_name ? `— ${l.class_name}` : ''}</p>
                      </div>
                      {l.status === 'active' && (
                        <span className="text-[9px] text-[#2F7F86] font-black uppercase tracking-wider animate-pulse">Өтіп жатыр</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
