import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getMe().catch(() => null),
      user?.role === 'student' ? api.getMyAnalytics().catch(() => null) : Promise.resolve(null),
    ]).then(([p, a]) => {
      setProfile(p)
      setStats(a?.stats || null)
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('kk-KZ', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const daysActive = profile?.created_at
    ? Math.ceil((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    : 0

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role={user?.role || 'student'} userName={user?.full_name || ''} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Профиль" subtitle="Жеке кабинет" hasSidebar />

      <main className="ml-64 p-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
          </div>
        ) : (
          <>
            {/* ── HERO CARD ── */}
            <div className="relative rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)', boxShadow: '0 12px 48px rgba(15,76,92,0.25)' }}>
              {/* Decorations */}
              <div className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px, transparent 1px), linear-gradient(90deg, #BFE3E1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #66B2B2, transparent)', filter: 'blur(60px)' }} />
              <div className="absolute bottom-[-60px] left-[-40px] w-72 h-72 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #BFE3E1, transparent)', filter: 'blur(50px)' }} />

              <div className="relative z-10 p-10 flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, rgba(102,178,178,0.3), rgba(47,127,134,0.5))', border: '3px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '4.5rem', fontVariationSettings: "'FILL' 1" }}>person</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ background: profile?.role === 'teacher' ? '#f59e0b' : '#22c55e', border: '3px solid #0F4C5C' }}>
                    <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {profile?.role === 'teacher' ? 'school' : 'menu_book'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="text-center md:text-left flex-1">
                  <h1 className="font-['Space_Grotesk'] text-4xl font-black text-white leading-tight">{profile?.full_name}</h1>
                  <p className="text-[#BFE3E1]/60 text-sm mt-1 flex items-center gap-2 justify-center md:justify-start">
                    <span className="material-symbols-outlined text-sm">email</span>
                    {profile?.email}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                    <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-bold border border-white/15 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {profile?.role === 'teacher' ? 'school' : 'menu_book'}
                      </span>
                      {profile?.role === 'teacher' ? 'Мұғалім' : 'Оқушы'}
                    </span>
                    {profile?.class_name && (
                      <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-bold border border-white/15 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">groups</span>
                        {profile.class_name}
                        {profile.class_code && <span className="text-[#BFE3E1]/40 ml-1">({profile.class_code})</span>}
                      </span>
                    )}
                    {profile?.school && (
                      <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-bold border border-white/15 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">apartment</span>
                        {profile.school}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick stats in hero */}
                <div className="flex gap-4">
                  <div className="text-center px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <div className="text-3xl font-['Space_Grotesk'] font-black text-white">{daysActive}</div>
                    <div className="text-[9px] uppercase tracking-wider text-[#BFE3E1]/50 font-bold mt-1">Күн жүйеде</div>
                  </div>
                  {stats && (
                    <div className="text-center px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                      <div className="text-3xl font-['Space_Grotesk'] font-black text-amber-400">#{stats.rank}</div>
                      <div className="text-[9px] uppercase tracking-wider text-[#BFE3E1]/50 font-bold mt-1">Рейтинг</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── INFO GRID ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { icon: 'calendar_today', label: 'Тіркелу күні', value: joined, accent: '#2F7F86' },
                { icon: 'badge', label: 'Рөлі', value: profile?.role === 'teacher' ? 'Мұғалім' : 'Оқушы', accent: '#0F4C5C' },
                { icon: 'apartment', label: 'Мектеп', value: profile?.school || 'Көрсетілмеген', accent: '#66B2B2' },
                { icon: 'groups', label: 'Сыныбы', value: profile?.class_name || 'Қосылмаған', accent: '#f59e0b' },
              ].map(item => (
                <div key={item.label} className="card-glow p-5 rounded-2xl space-y-3 hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${item.accent}15`, border: `1px solid ${item.accent}25` }}>
                      <span className="material-symbols-outlined text-sm" style={{ color: item.accent, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#66B2B2]">{item.label}</span>
                  </div>
                  <p className="font-bold text-sm text-[#0F4C5C] truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* ── STATS ROW (students only) ── */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { icon: 'grade', label: 'Орташа баға', value: stats.avgGrade || '—', accent: '#f59e0b', gradient: 'from-amber-50 to-orange-50' },
                  { icon: 'ads_click', label: 'Орта зейін', value: `${stats.avgAttention || 0}%`, accent: stats.avgAttention >= 70 ? '#22c55e' : '#f59e0b', gradient: 'from-green-50 to-emerald-50' },
                  { icon: 'military_tech', label: 'Рейтинг', value: `#${stats.rank}`, accent: '#2F7F86', gradient: 'from-teal-50 to-cyan-50' },
                  { icon: 'task_alt', label: 'Бағалар саны', value: stats.totalGrades || 0, accent: '#0F4C5C', gradient: 'from-sky-50 to-blue-50' },
                ].map(s => (
                  <div key={s.label} className={`p-6 rounded-2xl text-center space-y-3 bg-gradient-to-br ${s.gradient} border border-[#BFE3E1]/50 hover:-translate-y-1 transition-transform shadow-sm`}>
                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
                      style={{ background: `${s.accent}18`, border: `1.5px solid ${s.accent}30` }}>
                      <span className="material-symbols-outlined text-2xl" style={{ color: s.accent, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                    </div>
                    <div className="text-3xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{s.value}</div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-[#66B2B2]">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── ACTIONS ── */}
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/settings')}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#2F7F86] to-[#0F4C5C] text-white font-bold text-sm shadow-lg shadow-[#2F7F86]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">edit</span> Профильді өңдеу
              </button>
              <button onClick={() => navigate('/analytics')}
                className="px-8 py-3.5 rounded-2xl border-2 border-[#BFE3E1] text-[#2F7F86] font-bold text-sm hover:bg-[#E6F4F3] transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">insights</span> Аналитика
              </button>
              <button onClick={() => navigate('/leaderboard')}
                className="px-8 py-3.5 rounded-2xl border-2 border-[#BFE3E1] text-[#2F7F86] font-bold text-sm hover:bg-[#E6F4F3] transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">military_tech</span> Рейтинг
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
