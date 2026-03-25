import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

const PODIUM_COLORS = ['#f59e0b', '#94a3b8', '#b45309'] // gold, silver, bronze
const PODIUM_HEIGHTS = ['h-32', 'h-20', 'h-16']
const PODIUM_ORDER = [1, 0, 2] // display: 2nd, 1st, 3rd

export default function Leaderboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getLeaderboard()
      .then(d => setData(d || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }
  const sidebarRole = user?.role || 'student'

  const filtered = data.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const topThree = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  // Find current user rank in unfiltered data
  const myRank = data.findIndex(s => s.id === user?.id) + 1
  const myData = data.find(s => s.id === user?.id)

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role={sidebarRole} userName={user?.full_name || ''} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Рейтинг" subtitle="Leaderboard" hasSidebar />

      <div className="ml-64">
        {/* Hero banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px, transparent 1px), linear-gradient(90deg, #BFE3E1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute top-[-60px] right-[-60px] w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #66B2B2, transparent)', filter: 'blur(60px)' }} />

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-400 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Рейтинг кестесі</span>
              </div>
              <h1 className="font-['Space_Grotesk'] text-4xl font-black text-white tracking-tight">
                Үздіктер тізімі
              </h1>
              <p className="text-[#BFE3E1]/60 mt-2 text-sm">{data.length} оқушы бар жүйеде</p>
            </div>

            {/* My rank badge */}
            {myRank > 0 && (
              <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/50 font-bold">Сіздің орныңыз</p>
                  <p className="text-3xl font-['Space_Grotesk'] font-black text-amber-400">#{myRank}</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/50 font-bold">Ұпайыңыз</p>
                  <p className="text-3xl font-['Space_Grotesk'] font-black text-white">{myData?.points || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8">

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
              <p className="text-sm text-[#66B2B2] font-bold">Деректер жүктелуде...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Podium */}
              {topThree.length >= 3 && (
                <div className="card-glow rounded-3xl p-10 relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[600px] h-[300px] rounded-full opacity-40"
                      style={{ background: 'radial-gradient(ellipse, rgba(102,178,178,0.2), transparent)' }} />
                  </div>

                  <div className="relative z-10 flex items-end justify-center gap-6 md:gap-16 min-h-[320px]">
                    {PODIUM_ORDER.map(idx => {
                      const p = topThree[idx]
                      if (!p) return null
                      const rank = idx + 1
                      const color = PODIUM_COLORS[idx]
                      const isFirst = idx === 0
                      return (
                        <div key={rank}
                          className={`flex flex-col items-center group hover:-translate-y-2 transition-all ${isFirst ? 'w-52 -mb-4 z-10' : 'w-40'}`}>
                          {isFirst && (
                            <div className="mb-3 animate-bounce">
                              <span className="material-symbols-outlined text-amber-400 text-5xl drop-shadow-lg"
                                style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                            </div>
                          )}

                          <div className="relative mb-4">
                            <div className={`${isFirst ? 'w-28 h-28' : 'w-20 h-20'} rounded-full p-1 flex items-center justify-center shadow-xl`}
                              style={{ border: `3px solid ${color}`, background: `${color}15` }}>
                              <span className="material-symbols-outlined text-[#66B2B2]"
                                style={{ fontSize: isFirst ? '3.5rem' : '2.5rem', fontVariationSettings: "'FILL' 1" }}>
                                {p.id === user?.id ? 'person_celebrate' : 'person'}
                              </span>
                            </div>
                            <div className={`absolute -bottom-2 -right-2 ${isFirst ? 'w-10 h-10 text-lg' : 'w-8 h-8 text-sm'} rounded-full flex items-center justify-center font-['Space_Grotesk'] font-black text-white shadow-lg`}
                              style={{ backgroundColor: color }}>
                              {rank}
                            </div>
                          </div>

                          <div className="card rounded-2xl p-4 text-center w-full"
                            style={isFirst ? { border: `2px solid ${color}40` } : {}}>
                            <h4 className={`font-['Space_Grotesk'] font-black text-[#0F4C5C] uppercase tracking-tight truncate ${isFirst ? 'text-sm' : 'text-xs'}`}>
                              {p.full_name}
                              {p.id === user?.id && <span className="ml-1 text-[8px] text-[#2F7F86] bg-[#E6F4F3] px-1.5 py-0.5 rounded-full">Мен</span>}
                            </h4>
                            <p className={`font-['Space_Grotesk'] font-black mt-1 ${isFirst ? 'text-3xl' : 'text-xl'}`}
                              style={{ color }}>
                              {(p.points || 0).toLocaleString()}
                              <span className="text-[9px] font-normal text-[#66B2B2] ml-1">ұпай</span>
                            </p>
                          </div>

                          <div className={`w-20 ${PODIUM_HEIGHTS[idx]} rounded-t-xl mt-3 opacity-30`}
                            style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Rankings table */}
              <div className="card rounded-2xl overflow-hidden">
                <div className="px-8 py-5 border-b border-[#BFE3E1] flex justify-between items-center"
                  style={{ background: 'linear-gradient(180deg, #fff, #f8fdfc)' }}>
                  <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Толық тізім</h3>
                  <div className="relative">
                    <input
                      className="input-field pr-10 py-2 text-sm w-48"
                      placeholder="Іздеу..."
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-lg">search</span>
                  </div>
                </div>

                <table className="w-full text-left">
                  <thead style={{ background: '#E6F4F3' }}>
                    <tr>
                      {['#', 'Оқушы', 'Мектеп', 'Бағалар', 'Ұпай'].map((h) => (
                        <th key={h} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#66B2B2]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#BFE3E1]">
                    {rest.length === 0 && topThree.length <= 3 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 text-center text-sm text-[#66B2B2]">
                          {search ? 'Іздеу бойынша нәтиже табылмады' : 'Деректер жоқ'}
                        </td>
                      </tr>
                    )}
                    {rest.map((s, i) => {
                      const rank = i + 4
                      const isMe = s.id === user?.id
                      return (
                        <tr key={s.id} className={`transition-colors ${isMe ? 'bg-[#E6F4F3]' : 'hover:bg-[#E6F4F3]/50 bg-white'}`}>
                          <td className="px-8 py-4">
                            <span className="font-['Space_Grotesk'] font-black text-[#66B2B2]">{rank}</span>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                                style={{ background: isMe ? 'linear-gradient(135deg, #2F7F86, #0F4C5C)' : 'linear-gradient(135deg, #BFE3E1, #66B2B2)' }}>
                                <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                              </div>
                              <span className="font-bold text-sm text-[#0F4C5C]">
                                {s.full_name}
                                {isMe && <span className="ml-2 text-[9px] text-[#2F7F86] bg-[#E6F4F3] px-2 py-0.5 rounded-full font-bold border border-[#BFE3E1]">Мен</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-sm text-[#66B2B2]">{s.school || '—'}</td>
                          <td className="px-8 py-4 text-sm text-[#66B2B2] font-bold">{s.total_grades}</td>
                          <td className="px-8 py-4">
                            <span className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">
                              {(s.points || 0).toLocaleString()}
                              <span className="text-[9px] font-normal text-[#66B2B2] ml-1">ұпай</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
