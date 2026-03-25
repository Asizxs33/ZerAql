import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import { useGlobalProctoring } from '../context/ProctoringContext'

function StatCard({ icon, label, value, sub, accent = '#2F7F86' }) {
  return (
    <div className="card-glow p-6 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#66B2B2]">{label}</span>
        <span className="material-symbols-outlined text-xl" style={{ color: accent, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div className="text-4xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{value}</div>
      {sub && <p className="text-xs text-[#66B2B2]">{sub}</p>}
    </div>
  )
}

function AttentionBar({ value = 0, label }) {
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#66B2B2] font-semibold">{label}</span>
        <span className="font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#E6F4F3] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Analytics() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const proctoring = useGlobalProctoring()
  const { metrics = {}, cameraActive = false } = proctoring || {}

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getMyAnalytics()
      .then(res => setData(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  // Build simple bar chart data from weeklyData
  const maxAttention = data?.weeklyData?.length > 0
    ? Math.max(...data.weeklyData.map(d => d.attention || 0), 1)
    : 1

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="student" userName={user?.full_name || 'Оқушы'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Аналитика" subtitle="Жеке үлгеріміңіз туралы деректер" hasSidebar />

      <main className="ml-64 p-8 space-y-8">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
            <p className="text-sm text-[#66B2B2] font-bold">Деректер жүктелуде...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card-glow p-12 rounded-3xl text-center max-w-lg mx-auto space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#f59e0b]">error_outline</span>
            <p className="text-[#0F4C5C] font-bold">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Banner */}
            <div className="relative rounded-3xl overflow-hidden px-8 py-7 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 60%, #2F7F86 100%)', boxShadow: '0 8px 32px rgba(15,76,92,0.2)' }}>
              <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10"
                style={{ background: 'radial-gradient(circle at right, #BFE3E1, transparent)' }} />
              <div className="relative z-10">
                <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">Жеке аналитика</p>
                <h2 className="font-['Space_Grotesk'] text-3xl font-black text-white">{user?.full_name}</h2>
                <p className="text-[#BFE3E1]/70 text-sm mt-1">{user?.school || '—'}</p>
              </div>
              <div className="relative z-10 flex gap-8">
                <div className="text-center">
                  <div className="text-3xl font-['Space_Grotesk'] font-black text-white">{data.stats.avgGrade || '—'}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">Орт. баға</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-['Space_Grotesk'] font-black text-[#f59e0b]">#{data.stats.rank}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">{data.stats.totalStudents} оқушыдан</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-['Space_Grotesk'] font-black text-[#22c55e]">{data.stats.avgAttention}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">Орт. зейін</div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard icon="school" label="Жалпы бағалар" value={data.stats.totalGrades} sub="Тіркелген нәтижелер" />
              <StatCard icon="grade" label="Орташа балл" value={data.stats.avgGrade || '—'} sub="/ 100 балл жүйесі" accent="#0F4C5C" />
              <StatCard icon="ads_click" label="Орта зейін" value={`${data.stats.avgAttention}%`} sub="Барлық сессиялар бойынша" accent={data.stats.avgAttention >= 70 ? '#22c55e' : '#f59e0b'} />
              <StatCard icon="military_tech" label="Рейтинг" value={`#${data.stats.rank}`} sub={`${data.stats.totalStudents} оқушы ішінде`} accent="#2F7F86" />
            </div>

            {/* Weekly chart + live metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly chart */}
              <div className="lg:col-span-2 card-glow p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-['Space_Grotesk'] font-bold text-lg text-[#0F4C5C]">Апталық зейін динамикасы</h3>
                  <span className="badge-active">Соңғы 7 күн</span>
                </div>

                {data.weeklyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">bar_chart</span>
                    <p className="text-sm text-[#66B2B2]">Соңғы 7 күнде мониторинг деректері жоқ</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-3 h-40">
                    {data.weeklyData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-[#0F4C5C]">{d.attention || 0}%</span>
                        <div className="w-full rounded-t-lg transition-all duration-700 relative group"
                          style={{
                            height: `${Math.max(4, ((d.attention || 0) / maxAttention) * 120)}px`,
                            background: `linear-gradient(180deg, #2F7F86, #0F4C5C)`,
                            minHeight: '4px',
                          }}>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#0F4C5C] text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap">
                            Зейін: {d.attention}% | Эмоция: {d.emotion}%
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#66B2B2] uppercase">{d.day}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live AI metrics */}
              <div className="card-glow p-6 rounded-2xl space-y-5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-400 animate-pulse' : 'bg-gray-300'}`} />
                  <h3 className="font-['Space_Grotesk'] font-bold text-[#0F4C5C]">Нақты уақыт</h3>
                </div>
                <AttentionBar value={cameraActive ? (metrics.attention ?? 0) : 0} label="Зейін" />
                <AttentionBar value={cameraActive ? (metrics.emotionScore ?? 0) : 0} label="Эмоция сенімділігі" />
                <div className="pt-3 border-t border-[#BFE3E1]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#66B2B2] font-semibold">Пульс</span>
                    <span className="font-black text-[#0F4C5C]">{cameraActive && metrics.pulse > 0 ? `${metrics.pulse} bpm` : '—'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-[#66B2B2] font-semibold">Тұлға</span>
                    <span className={`font-black ${metrics.faceVerified ? 'text-green-600' : 'text-[#f59e0b]'}`}>
                      {cameraActive ? (metrics.faceVerified ? 'Расталды ✓' : 'Тексерілуде...') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-[#66B2B2] font-semibold">Эмоция</span>
                    <span className="font-black text-[#0F4C5C]">{cameraActive ? (metrics.emotionKz || '—') : '—'}</span>
                  </div>
                </div>
                {!cameraActive && <p className="text-[10px] text-[#66B2B2] text-center">Камера белсенді болғанда нақты деректер шығады</p>}
              </div>
            </div>

            {/* Grades history */}
            <section className="card overflow-hidden rounded-2xl">
              <div className="px-7 py-5 flex justify-between items-center border-b border-[#BFE3E1]"
                style={{ background: 'linear-gradient(90deg, #f8fdfc, #fff)' }}>
                <h3 className="font-['Space_Grotesk'] font-bold text-lg text-[#0F4C5C]">Бағалар тарихы</h3>
                <span className="text-xs text-[#66B2B2]">{data.grades.length} жазба</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left data-table">
                  <thead>
                    <tr>
                      {['Сабақ', 'Пән', 'Балл', 'Күні'].map(h => (
                        <th key={h} className="px-7 py-4 text-[10px] font-bold uppercase tracking-widest text-[#66B2B2]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#BFE3E1]">
                    {data.grades.length === 0 ? (
                      <tr><td colSpan={4} className="px-7 py-10 text-center text-sm text-[#66B2B2]">Бағалар жоқ</td></tr>
                    ) : data.grades.map(g => (
                      <tr key={g.id}>
                        <td className="px-7 py-4 font-bold text-sm text-[#0F4C5C]">{g.lesson_title || '—'}</td>
                        <td className="px-7 py-4 text-sm text-[#66B2B2]">{g.subject || '—'}</td>
                        <td className="px-7 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-[#0F4C5C]">{Number(g.score)}</span>
                            <span className="text-xs text-[#66B2B2]">/ 100</span>
                            <span className={Number(g.score) >= 80 ? 'badge-success' : Number(g.score) >= 60 ? 'badge-active' : 'badge-pending'}>
                              {Number(g.score) >= 80 ? 'Өте жақсы' : Number(g.score) >= 60 ? 'Жақсы' : 'Орта'}
                            </span>
                          </div>
                        </td>
                        <td className="px-7 py-4 text-sm text-[#66B2B2]">
                          {new Date(g.grade_date).toLocaleDateString('kk-KZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
