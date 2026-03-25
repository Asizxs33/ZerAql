import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

function statusStyle(s) {
  if (s === 'excellent') return { color: '#22c55e', background: '#f0fdf4', border: '1px solid #bbf7d0' }
  if (s === 'good') return { color: '#2F7F86', background: '#E6F4F3', border: '1px solid #BFE3E1' }
  if (s === 'average') return { color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a' }
  return { color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }
}
function statusLabel(avg) {
  if (avg >= 85) return { key: 'excellent', label: 'Үздік' }
  if (avg >= 70) return { key: 'good', label: 'Жақсы' }
  if (avg >= 50) return { key: 'average', label: 'Орташа' }
  return { key: 'poor', label: 'Назар аудару' }
}

const KZ_DAYS = { Mon: 'Дс', Tue: 'Сс', Wed: 'Ср', Thu: 'Бс', Fri: 'Жм', Sat: 'Сб', Sun: 'Жк' }

export default function StudentAnalyticsTeacherView() {
  const [tab, setTab] = useState('week')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { studentId } = useParams()
  const handleLogout = () => { logout(); navigate('/login') }

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aiInsights, setAiInsights] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Fetch analytics data
  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    api.getStudentAnalytics(studentId)
      .then(res => {
        setData(res)
        // Fetch AI feedback
        setAiLoading(true)
        api.getStudentFeedback({
          studentName: res.student.full_name,
          className: res.student.class_name,
          avgGrade: res.stats.avgGrade,
          avgAttention: res.stats.avgAttention,
          avgEmotion: res.stats.avgEmotion,
          totalTasks: res.stats.totalTasks,
          totalLessons: res.stats.totalLessons,
          recentLessons: res.recentLessons.slice(0, 5),
        }).then(aiRes => {
          setAiInsights(aiRes.insights || aiRes.recommendations || aiRes)
        }).catch(() => {
          // Fallback AI insights based on real data
          const insights = []
          if (res.stats.avgAttention >= 80) {
            insights.push({ label: 'Үйренуші типі', value: 'Белсенді', icon: 'visibility', color: '#2F7F86' })
          } else if (res.stats.avgAttention >= 60) {
            insights.push({ label: 'Үйренуші типі', value: 'Визуал', icon: 'visibility', color: '#2F7F86' })
          } else {
            insights.push({ label: 'Үйренуші типі', value: 'Назар аудару қажет', icon: 'visibility', color: '#f59e0b' })
          }
          insights.push({ label: 'Орт. зейін', value: `${res.stats.avgAttention}%`, icon: 'ads_click', color: res.stats.avgAttention >= 70 ? '#22c55e' : '#f59e0b' })
          insights.push({ label: 'Орт. баға', value: `${res.stats.avgGrade}`, icon: 'grade', color: res.stats.avgGrade >= 4 ? '#22c55e' : '#f59e0b' })
          if (res.stats.avgAttention < 70) {
            insights.push({ label: 'Жақсарту керек', value: 'Зейін деңгейі', icon: 'trending_up', color: '#f97316' })
          } else {
            insights.push({ label: 'Күшті жағы', value: 'Зейін тұрақты', icon: 'star', color: '#22c55e' })
          }
          setAiInsights(insights)
        }).finally(() => setAiLoading(false))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
        <TopBar breadcrumb="Аналитика" subtitle="Оқушы нәтижелері" hasSidebar />
        <div className="ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin mx-auto" />
            <p className="text-sm text-[#66B2B2] font-bold">Жүктелуде...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="page-bg min-h-screen">
        <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
        <TopBar breadcrumb="Аналитика" subtitle="Оқушы нәтижелері" hasSidebar />
        <div className="ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#BFE3E1]">person_off</span>
            <p className="text-sm text-[#66B2B2] font-bold">{error || 'Оқушы табылмады'}</p>
            <button onClick={() => navigate(-1)} className="btn-primary px-4 py-2 text-xs">← Қайту</button>
          </div>
        </div>
      </div>
    )
  }

  const { student, stats, weeklyData, recentLessons } = data

  // Map weekly data to display format
  const weeklyDisplay = weeklyData.length > 0
    ? weeklyData.map(w => ({
        day: KZ_DAYS[w.day?.trim()] || w.day,
        attention: w.attention || 0,
        emotion: w.emotion || 0,
      }))
    : [
        { day: 'Дс', attention: 0, emotion: 0 },
        { day: 'Сс', attention: 0, emotion: 0 },
        { day: 'Ср', attention: 0, emotion: 0 },
        { day: 'Бс', attention: 0, emotion: 0 },
        { day: 'Жм', attention: 0, emotion: 0 },
      ]

  // Map recent lessons for table
  const lessonRows = recentLessons.map(l => {
    const attention = l.avg_attention || 0
    const score = l.grade_score ? Math.round(Number(l.grade_score) * 20) : 0
    const avg = (attention + score) / 2
    const st = statusLabel(avg)
    return {
      name: l.title,
      date: l.created_at ? new Date(l.created_at).toLocaleDateString('kk-KZ', { day: '2-digit', month: '2-digit' }) : '—',
      attention,
      score,
      status: st.key,
    }
  })

  // AI insights (either from API or fallback)
  const aiItems = Array.isArray(aiInsights)
    ? aiInsights
    : [
        { label: 'Орт. зейін', value: `${stats.avgAttention}%`, icon: 'ads_click', color: '#66B2B2' },
        { label: 'Орт. баға', value: `${stats.avgGrade}`, icon: 'grade', color: '#f59e0b' },
        { label: 'Тапсырмалар', value: `${stats.totalTasks}/${stats.totalLessons}`, icon: 'task_alt', color: '#22c55e' },
        { label: 'Рейтинг', value: `#${stats.rank}`, icon: 'military_tech', color: '#BFE3E1' },
      ]

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Аналитика" subtitle="Оқушы нәтижелері" hasSidebar />

      <div className="ml-64">
        {/* Student profile banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px, transparent 1px), linear-gradient(90deg, #BFE3E1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #66B2B2, transparent)', filter: 'blur(60px)' }} />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(102,178,178,0.5)' }}>
              <span className="material-symbols-outlined text-[#BFE3E1]" style={{ fontSize: '3rem', fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                <h1 className="font-['Space_Grotesk'] text-2xl font-black text-white">{student.full_name}</h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{ background: 'rgba(255,255,255,0.12)', color: '#BFE3E1', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {student.class_name} сынып
                </span>
              </div>
              <p className="text-[#BFE3E1]/60 text-sm">{student.school || 'Мектеп көрсетілмеген'}</p>

              <div className="flex flex-wrap gap-6 mt-4">
                {[
                  { label: 'Орташа баға', value: stats.avgGrade || '—', icon: 'grade', color: '#f59e0b' },
                  { label: 'Орт. зейін', value: `${stats.avgAttention}%`, icon: 'ads_click', color: '#66B2B2' },
                  { label: 'Тапсырмалар', value: `${stats.totalTasks}/${stats.totalLessons}`, icon: 'task_alt', color: '#BFE3E1' },
                  { label: 'Рейтинг', value: `#${stats.rank}`, icon: 'military_tech', color: '#BFE3E1' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="font-['Space_Grotesk'] font-black text-xl flex items-center gap-1.5" style={{ color: s.color }}>
                      <span className="material-symbols-outlined text-sm">{s.icon}</span>
                      {s.value}
                    </div>
                    <div className="text-[9px] text-[#BFE3E1]/50 uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#BFE3E1', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Қайту
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Weekly chart */}
            <div className="lg:col-span-2 card-glow p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Апталық нәтижелер</h3>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#E6F4F3', border: '1px solid #BFE3E1' }}>
                  {[{ id: 'week', label: 'Апта' }, { id: 'month', label: 'Ай' }].map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="px-3 py-1 rounded-lg text-xs font-black transition-all"
                      style={tab === t.id
                        ? { background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)', color: '#fff' }
                        : { color: '#66B2B2' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {weeklyDisplay.every(d => d.attention === 0 && d.emotion === 0) ? (
                <div className="flex flex-col items-center py-12 gap-2">
                  <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">monitoring</span>
                  <p className="text-sm text-[#66B2B2]">Бұл аптада мониторинг деректері жоқ</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {weeklyDisplay.map((d) => (
                    <div key={d.day} className="flex items-center gap-4">
                      <span className="text-xs font-black text-[#66B2B2] w-8 text-right">{d.day}</span>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 rounded-full overflow-hidden flex-1" style={{ background: '#E6F4F3' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${d.attention}%`, background: 'linear-gradient(90deg, #2F7F86, #0F4C5C)' }} />
                          </div>
                          <span className="text-[10px] font-black text-[#2F7F86] w-9">{d.attention}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 rounded-full overflow-hidden flex-1" style={{ background: '#E6F4F3' }}>
                            <div className="h-full rounded-full transition-all bg-amber-400" style={{ width: `${d.emotion}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-amber-500 w-9">{d.emotion}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-5 text-xs text-[#66B2B2] pt-4 mt-4 border-t border-[#BFE3E1]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }} />
                  <span>Зейін</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span>Эмоция</span>
                </div>
              </div>
            </div>

            {/* AI insights */}
            <div className="card-glow p-6 rounded-2xl">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-[#2F7F86]">psychology</span>
                AI Талдауы
              </h3>

              {aiLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: '#E6F4F3' }} />)}
                </div>
              ) : (
                <div className="space-y-2 mb-5">
                  {aiItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: '#f8fdfc', border: '1px solid #BFE3E1' }}>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>{item.icon}</span>
                        <span className="text-xs text-[#66B2B2] font-bold">{item.label}</span>
                      </div>
                      <span className="text-xs font-black text-[#0F4C5C]">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(47,127,134,0.06), rgba(102,178,178,0.04))', border: '1px solid #BFE3E1' }}>
                <p className="text-xs text-[#0F4C5C] leading-relaxed">
                  <span className="font-black text-[#2F7F86]">Ұсыным:</span>{' '}
                  {stats.avgAttention >= 80
                    ? `${student.full_name} тұрақты зейінмен оқады. Күрделірек тапсырмалар дайындау ұсынылады.`
                    : stats.avgAttention >= 60
                    ? `${student.full_name} бейнелі материалдарды жақсы қабылдайды. Диаграммалар мен схемалар арқылы сабақ өткізу тиімді болады.`
                    : `${student.full_name}-ға қосымша назар аудару қажет. Интерактивті тапсырмалар мен топтық жұмыс ұсынылады.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Recent lessons */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-[#BFE3E1]"
              style={{ background: 'linear-gradient(180deg, #fff, #f8fdfc)' }}>
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Соңғы сабақтар</h3>
            </div>

            {lessonRows.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">menu_book</span>
                <p className="text-sm text-[#66B2B2]">Сабақ деректері жоқ</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead style={{ background: '#E6F4F3' }}>
                  <tr>
                    {['Сабақ', 'Күні', 'Зейін', 'Тест ұпайы', 'Бағалау'].map((h) => (
                      <th key={h} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#66B2B2]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#BFE3E1]">
                  {lessonRows.map((l) => (
                    <tr key={l.name} className="hover:bg-[#E6F4F3]/40 transition-colors bg-white">
                      <td className="px-8 py-4 font-bold text-sm text-[#0F4C5C]">{l.name}</td>
                      <td className="px-8 py-4 text-sm text-[#66B2B2] font-bold">{l.date}</td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-[#BFE3E1] rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${l.attention}%`, backgroundColor: l.attention >= 80 ? '#2F7F86' : l.attention >= 65 ? '#66B2B2' : '#f59e0b' }} />
                          </div>
                          <span className="text-xs font-black text-[#0F4C5C]">{l.attention}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 font-black text-sm text-[#0F4C5C]">{l.score}/100</td>
                      <td className="px-8 py-4">
                        <span className="text-xs font-black px-3 py-1 rounded-full" style={statusStyle(l.status)}>
                          {l.status === 'excellent' ? 'Үздік' : l.status === 'good' ? 'Жақсы' : l.status === 'average' ? 'Орташа' : 'Назар аудару'}
                        </span>
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
