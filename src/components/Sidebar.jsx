import { Link, useLocation } from 'react-router-dom'

const studentNav = [
  { icon: 'dashboard', label: 'Басты бет', path: '/student' },
  { icon: 'menu_book', label: 'Сабақтарым', path: '/lessons' },
  { icon: 'groups', label: 'Менің сыныбым', path: '/my-class' },
  { icon: 'task', label: 'Тапсырмалар', path: '/tasks' },
  { icon: 'insights', label: 'Аналитика', path: '/analytics' },
  { icon: 'military_tech', label: 'Рейтинг', path: '/leaderboard' },
  { icon: 'notifications', label: 'Хабарламалар', path: '/notifications' },
]

const teacherNav = [
  { icon: 'dashboard', label: 'Басты бет', path: '/teacher' },
  { icon: 'groups', label: 'Оқушылар', path: '/students' },
  { icon: 'school', label: 'Сыныптарым', path: '/classes' },
  { icon: 'edit_note', label: 'Сабақ жасау', path: '/create-lesson' },
  { icon: 'auto_stories', label: 'Журнал', path: '/journal' },
  { icon: 'bar_chart', label: 'Аналитика', path: '/teacher-analytics' },
  { icon: 'psychology', label: 'Болжау (ML)', path: '/prediction' },
  { icon: 'table_view', label: 'Күнделік импорт', path: '/kundelig' },
  { icon: 'map', label: 'Салыстырмалы карта', path: '/map' },
  { icon: 'military_tech', label: 'Рейтинг', path: '/leaderboard' },
]

export default function Sidebar({ role = 'student', userName = 'Нұржан Асанов', userClass = '9А СЫНЫП', onLogout }) {
  const location = useLocation()
  const items = role === 'teacher' ? teacherNav : studentNav

  return (
    <aside className="sidebar h-screen w-64 fixed left-0 top-0 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #66B2B2, #2F7F86)' }}>
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              visibility
            </span>
          </div>
          <span className="font-['Space_Grotesk'] font-black text-xl tracking-widest uppercase text-white">
            ZerAql
          </span>
        </div>

        {/* User card */}
        <div className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #66B2B2, #2F7F86)' }}>
              <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 rounded-full"
              style={{ borderColor: '#0F4C5C' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate font-['Space_Grotesk']">{userName}</p>
            <p className="text-[10px] tracking-wider uppercase truncate" style={{ color: 'rgba(191,227,225,0.5)' }}>
              {userClass}
            </p>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-6 mb-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(191,227,225,0.3)' }}>
          Навигация
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-0 space-y-0.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}>
          <span className="material-symbols-outlined text-[20px]" style={location.pathname === '/profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
          <span>Профиль</span>
        </Link>
        <Link to="/settings" className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}>
          <span className="material-symbols-outlined text-[20px]" style={location.pathname === '/settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
          <span>Баптаулар</span>
        </Link>
        <button onClick={onLogout} className="w-full flex items-center gap-3 py-2 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
          style={{ color: 'rgba(191,227,225,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(191,227,225,0.4)'; e.currentTarget.style.background = 'transparent' }}
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
