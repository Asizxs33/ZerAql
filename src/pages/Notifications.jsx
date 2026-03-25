import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import { useGlobalProctoring } from '../context/ProctoringContext'

export default function Notifications() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const proctoring = useGlobalProctoring()
  const violations = proctoring?.violations || []

  const [grades, setGrades] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getGrades().catch(() => []),
      api.getLessons().catch(() => []),
    ]).then(([g, l]) => {
      setGrades(g || [])
      setLessons(l || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  // Build unified notification feed
  const notifications = [
    ...violations.map(v => ({
      type: 'violation',
      icon: 'warning',
      color: '#ef4444',
      bg: '#fef2f2',
      title: v.message,
      sub: `Бұзушылық · ${v.timestamp}`,
      time: v.timestamp,
    })),
    ...grades.map(g => ({
      type: 'grade',
      icon: 'grade',
      color: '#f59e0b',
      bg: '#fffbeb',
      title: `${g.lesson_title || 'Сабақ'} — ${Number(g.score)} балл`,
      sub: `Бағалау · ${new Date(g.grade_date).toLocaleDateString('kk-KZ')}`,
      time: g.grade_date,
    })),
    ...lessons.map(l => ({
      type: 'lesson',
      icon: l.status === 'active' ? 'play_circle' : 'menu_book',
      color: l.status === 'active' ? '#22c55e' : '#2F7F86',
      bg: l.status === 'active' ? '#f0fdf4' : '#f0fafa',
      title: `${l.title}${l.status === 'active' ? ' — Белсенді!' : ''}`,
      sub: `${l.subject || l.class_name || 'Сабақ'} · ${new Date(l.created_at).toLocaleDateString('kk-KZ')}`,
      time: l.created_at,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time))

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="student" userName={user?.full_name || 'Оқушы'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Хабарламалар" subtitle="Соңғы оқиғалар мен ескертулер" hasSidebar />

      <main className="ml-64 p-8 space-y-6">
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden px-8 py-7 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 60%, #2F7F86 100%)', boxShadow: '0 8px 32px rgba(15,76,92,0.2)' }}>
          <div className="relative z-10">
            <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">Хабарламалар</p>
            <h2 className="font-['Space_Grotesk'] text-3xl font-black text-white">Соңғы оқиғалар</h2>
          </div>
          <div className="relative z-10 flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-['Space_Grotesk'] font-black text-[#ef4444]">{violations.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">Ескертулер</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-['Space_Grotesk'] font-black text-[#f59e0b]">{grades.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">Бағалар</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-['Space_Grotesk'] font-black text-[#22c55e]">{lessons.filter(l => l.status === 'active').length}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">Белсенді</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="card-glow py-16 rounded-3xl text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#BFE3E1]">notifications_none</span>
            <h3 className="text-xl font-bold text-[#0F4C5C]">Хабарламалар жоқ</h3>
            <p className="text-sm text-[#66B2B2]">Жаңа оқиғалар пайда болғанда осында көрсетіледі</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div key={i} className="card-glow p-5 rounded-2xl flex items-start gap-4 hover:-translate-y-0.5 transition-transform">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: n.bg, border: `1px solid ${n.color}30` }}>
                  <span className="material-symbols-outlined text-lg" style={{ color: n.color, fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#0F4C5C] truncate">{n.title}</p>
                  <p className="text-xs text-[#66B2B2] mt-0.5">{n.sub}</p>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0`}
                  style={{ background: n.bg, color: n.color, border: `1px solid ${n.color}30` }}>
                  {n.type === 'violation' ? 'Ескерту' : n.type === 'grade' ? 'Баға' : 'Сабақ'}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
