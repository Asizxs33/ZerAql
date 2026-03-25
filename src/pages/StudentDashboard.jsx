import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import { useGlobalProctoring } from '../context/ProctoringContext'

const EMOTION_ICON = {
  happy: 'sentiment_very_satisfied',
  sad: 'sentiment_dissatisfied',
  angry: 'sentiment_very_dissatisfied',
  fearful: 'sentiment_stressed',
  surprised: 'sentiment_excited',
  neutral: 'sentiment_neutral',
  disgusted: 'sick',
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [lessons, setLessons] = useState([])
  const [grades, setGrades] = useState([])
  
  const proctoring = useGlobalProctoring()
  const { metrics = {}, modelsLoaded = false, cameraActive = false, loadingStatus = '' } = proctoring || {}

  useEffect(() => {
    api.getLessons().then(setLessons).catch(() => {})
    api.getGrades().then(setGrades).catch(() => {})
  }, [])

  const avgGrade = grades.length
    ? (grades.reduce((s, g) => s + parseFloat(g.score), 0) / grades.length).toFixed(1)
    : '—'

  const handleLogout = () => { logout(); navigate('/login') }

  const firstName = user?.full_name?.split(' ')[0] || 'Оқушы'
  const attention = metrics.attention ?? 0
  const pulse = metrics.pulse ?? 0
  const activeCount = lessons.filter(l => l.status === 'active').length

  const aiMetrics = [
    { label: 'Эмоция', icon: EMOTION_ICON[metrics.emotion] || 'mood', value: cameraActive ? (metrics.emotionKz || 'Бейтарап') : '—', stat: cameraActive ? 'Белсенді' : '—', subIcon: 'trending_up', subColor: '#16a34a', accent: '#2F7F86' },
    { label: 'Зейін', icon: 'ads_click', value: cameraActive ? (attention >= 70 ? 'Фокус' : 'Шашыраңқы') : '—', stat: cameraActive ? `${attention}%` : '—', subIcon: 'my_location', subColor: attention >= 70 ? '#22c55e' : '#f59e0b', accent: '#0F4C5C' },
    { label: 'Тұлға', icon: metrics.faceVerified ? 'verified_user' : 'face_unlock', value: cameraActive ? (metrics.faceVerified ? 'Расталды' : 'Ізделуде...') : '—', stat: cameraActive ? (metrics.faceCount > 0 ? 'Иә' : 'Жоқ') : '—', subIcon: 'check_circle', subColor: metrics.faceVerified ? '#16a34a' : '#66B2B2', accent: '#2F7F86' },
    { label: 'Пульс', icon: 'favorite', value: cameraActive && pulse > 0 ? `${pulse} bpm` : '—', pulse: true, accent: '#ef4444' },
  ]

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="student" userName={user?.full_name || 'Оқушы'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Басты бет" subtitle="Оқушы кабинеті" hasSidebar />

      <main className="ml-64 p-8 space-y-7">

        {/* ── WELCOME BANNER ── */}
        <div className="relative rounded-3xl overflow-hidden px-8 py-7 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 60%, #2F7F86 100%)', boxShadow: '0 8px 32px rgba(15,76,92,0.2)' }}>
          <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10"
            style={{ background: 'radial-gradient(circle at right, #BFE3E1, transparent)' }} />
          <div>
            <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">Қош келдіңіз</p>
            <h2 className="font-['Space_Grotesk'] text-2xl font-black text-white">{firstName}, бүгін жақсы оқыдыңыз!</h2>
            <p className="text-[#BFE3E1]/70 text-sm mt-1">{activeCount} сабақ белсенді қазір · {cameraActive ? 'Камера қосулы' : 'Камера күтуде'}</p>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {[{ v: `${grades.length}`, l: 'Бағалар' }, { v: avgGrade, l: 'Орташа баға' }, { v: `${lessons.length}`, l: 'Сабақтар' }].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-2xl font-['Space_Grotesk'] font-black text-white">{s.v}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(191,227,225,0.5)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LIVE AI MONITOR ── */}
        <section className="card-glow p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            <h3 className="font-['Space_Grotesk'] font-bold text-[#0F4C5C] text-lg">Тірі AI Монитор</h3>
            <span className={cameraActive ? "badge-active ml-auto" : "badge-pending ml-auto"}>
              {cameraActive ? 'Нақты уақыт' : 'Офлайн'}
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Camera feed */}
            <div className="relative w-full lg:w-[400px] aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center bg-black"
              style={{ border: '1.5px solid #BFE3E1' }}>
              
              {proctoring && (
                <>
                  <video
                    ref={proctoring.videoRef}
                    autoPlay muted playsInline
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      transform: 'scaleX(-1)',
                      display: cameraActive ? 'block' : 'none',
                    }}
                  />
                  <canvas
                    ref={proctoring.canvasRef}
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      transform: 'scaleX(-1)', opacity: 0.7, pointerEvents: 'none',
                      display: cameraActive ? 'block' : 'none',
                    }}
                  />
                </>
              )}

              {!cameraActive && (
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-2 flex items-center justify-center"
                    style={{ background: 'rgba(47,127,134,0.12)', border: '2px dashed rgba(47,127,134,0.3)' }}>
                    <span className="material-symbols-outlined text-[#2F7F86] text-3xl">
                      {modelsLoaded ? 'videocam_off' : 'pending'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#66B2B2]">
                    {loadingStatus || 'Камера күтілуде...'}
                  </span>
                </div>
              )}

              {cameraActive && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #BFE3E1' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-[#2F7F86] uppercase">Камера белсенді</span>
                </div>
              )}
            </div>

            {/* Metrics grid */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              {aiMetrics.map(m => (
                <div key={m.label} className="rounded-2xl p-4 space-y-3 transition-all hover:-translate-y-0.5"
                  style={{ background: '#fff', border: '1px solid #BFE3E1', boxShadow: '0 2px 8px rgba(15,76,92,0.05)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#66B2B2]">{m.label}</span>
                    <span className="material-symbols-outlined text-base" style={{ color: m.accent, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  </div>
                  {m.pulse ? (
                    <>
                      <div className="text-2xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{m.value}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-0.5 items-end h-5">
                          {[2, 4, 1, 3, 2, 4, 3].map((h, i) => (
                            <div key={i} className="w-1 rounded-full" style={{ height: `${h * 4}px`, backgroundColor: cameraActive ? m.accent : '#e5e7eb' }} />
                          ))}
                        </div>
                        <span className={cameraActive && pulse > 0 ? "badge-success" : "badge-pending"}>Норма</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{m.value}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-['Space_Grotesk'] font-black" style={{ color: m.accent }}>{m.stat}</span>
                        <span className="material-symbols-outlined text-lg" style={{ color: cameraActive ? m.subColor : '#9ca3af', fontVariationSettings: "'FILL' 1" }}>{m.subIcon}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Tasks donut */}
          <div className="stat-card teal flex flex-col items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#66B2B2] mb-4">Менің бағаларым</span>
            <div className="relative w-28 h-28 my-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="44" fill="none" stroke="#BFE3E1" strokeWidth="10" />
                <circle cx="56" cy="56" r="44" fill="none" strokeWidth="10" strokeLinecap="round"
                  stroke="url(#donut-grad)"
                  strokeDasharray={`${(grades.length / (lessons.length || 1)) * 276.5 || 0} 276.5`} />
                <defs>
                  <linearGradient id="donut-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#66B2B2" />
                    <stop offset="100%" stopColor="#2F7F86" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{grades.length}</span>
                <span className="text-[10px] text-[#66B2B2]">тапсырма</span>
              </div>
            </div>
            <button onClick={() => navigate('/lessons')} className="mt-3 text-xs font-bold text-[#2F7F86] hover:text-[#0F4C5C] transition-colors">
              Мәліметтер →
            </button>
          </div>

          {/* Average grade */}
          <div className="stat-card dark flex flex-col items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#66B2B2] mb-4">Орташа баға</span>
            <div className="my-2">
              <div className="text-6xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{avgGrade}</div>
              <div className="flex justify-center gap-0.5 mt-2">
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="material-symbols-outlined text-amber-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {parseFloat(avgGrade) >= i + 1.5 ? 'star' : parseFloat(avgGrade) >= i + 0.5 ? 'star_half' : 'star_border'}
                  </span>
                ))}
                <span className="material-symbols-outlined text-amber-400 text-xl">
                  {parseFloat(avgGrade) >= 4.5 ? 'star' : 'star_border'}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-[#66B2B2] font-bold uppercase tracking-wider">Сынып бойынша рейтинг</p>
          </div>

          {/* Schedule */}
          <div className="stat-card green">
            <div className="flex justify-between items-center mb-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#66B2B2]">Сабақтар кестесі</span>
              {activeCount > 0 && <span className="badge-active">Бүгін {activeCount} сабақ</span>}
            </div>
            <div className="space-y-4 relative">
              <div className="absolute left-1 top-2 bottom-2 w-px" style={{ background: '#BFE3E1' }} />
              {lessons.slice(0, 3).length > 0 ? lessons.slice(0, 3).map((l, i) => (
                <div key={l.id} className="flex items-center gap-4 relative pl-1">
                  <div className="w-3 h-3 rounded-full ring-4 z-10 flex-shrink-0"
                    style={{ backgroundColor: l.status === 'active' ? '#22c55e' : '#BFE3E1', ringColor: l.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(191,227,225,0.4)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0F4C5C] truncate">{l.title}</p>
                    <p className="text-[10px] text-[#66B2B2] truncate">{l.subject || l.class_name}</p>
                  </div>
                  {l.status === 'active' && (
                    <span className="ml-auto text-[10px] font-bold text-[#2F7F86] animate-pulse">Өтіп жатыр...</span>
                  )}
                </div>
              )) : (
                <p className="text-xs text-[#66B2B2] pl-6">Әзірге сабақтар жоқ</p>
              )}
            </div>
          </div>
        </div>

        {/* ── LESSONS TABLE ── */}
        <section className="card overflow-hidden">
          <div className="px-7 py-5 flex justify-between items-center"
            style={{ background: 'linear-gradient(90deg, #f8fdfc, #fff)', borderBottom: '1px solid #BFE3E1' }}>
            <h3 className="font-['Space_Grotesk'] font-bold text-lg text-[#0F4C5C]">Барлық сабақтар</h3>
            <button onClick={() => navigate('/lessons')} className="text-xs font-bold text-[#2F7F86] border border-[#BFE3E1] px-4 py-2 rounded-full hover:bg-[#E6F4F3] transition-all">
              Толық кесте
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left data-table">
              <thead>
                <tr>
                  {['Сабақ атауы', 'Мұғалім', 'Түрі', 'Ұзақтығы', 'Мерзімі', 'Күйі', ''].map(h => (
                    <th key={h} className="px-7 py-4 text-[10px] font-bold uppercase tracking-widest text-[#66B2B2]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BFE3E1]">
                {lessons.length === 0 ? (
                  <tr><td colSpan={7} className="px-7 py-10 text-center text-sm text-[#66B2B2]">Сабақтар жоқ</td></tr>
                ) : lessons.map(l => (
                  <tr key={l.id}>
                    <td className="px-7 py-5">
                      <div className="font-bold text-sm text-[#0F4C5C]">{l.title}</div>
                      <div className="text-xs text-[#66B2B2] mt-0.5">{l.subject}</div>
                    </td>
                    <td className="px-7 py-5 text-sm font-semibold text-[#2F7F86]">{l.teacher_name || '—'}</td>
                    <td className="px-7 py-5">
                      <div className="flex items-center gap-2 text-xs text-[#66B2B2]">
                        <span className="material-symbols-outlined text-sm text-[#2F7F86]">description</span>
                        {l.class_name || '—'}
                      </div>
                    </td>
                    <td className="px-7 py-5 text-sm text-[#66B2B2]">{l.duration} мин</td>
                    <td className="px-7 py-5 text-sm font-semibold text-[#0F4C5C]">
                      {new Date(l.created_at).toLocaleDateString('kk-KZ')}
                    </td>
                    <td className="px-7 py-5">
                      <span className={l.status === 'done' ? 'badge-success' : l.status === 'active' ? 'badge-active' : 'badge-pending'}>
                        {l.status === 'done' ? 'Аяқталды' : l.status === 'active' ? 'Белсенді' : 'Жоба'}
                      </span>
                    </td>
                    <td className="px-7 py-5 text-right">
                      {l.status === 'active' ? (
                        <button onClick={() => navigate('/lessons')} className="flex items-center gap-1.5 ml-auto text-sm font-bold text-[#2F7F86] hover:text-[#0F4C5C] transition-colors">
                          Қосылу
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      ) : (
                        <button onClick={() => navigate('/lessons')} className="flex items-center gap-1.5 ml-auto text-sm font-bold text-[#66B2B2] hover:text-[#0F4C5C] transition-colors">
                          Ашу
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="ml-64 bg-white border-t border-[#BFE3E1] py-6 flex justify-between items-center px-8">
        <p className="text-xs text-[#66B2B2]">© {new Date().getFullYear()} ZerAql EdTech. Built for Kazakh Excellence.</p>
        <div className="flex gap-6">
          {['Privacy Policy', 'Terms of Service', 'AI Ethics', 'Support'].map(item => (
            <a key={item} className="text-xs text-[#66B2B2] hover:text-[#0F4C5C] transition-colors" href="#">{item}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
