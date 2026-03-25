import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

export default function MyClass() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getMyClass()
      .then(res => setData(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="student" userName={user?.full_name || 'Оқушы'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Менің сыныбым" subtitle="Сыныптастар мен Мұғалімдер" hasSidebar />

      <main className="ml-64 p-8">
        
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
            <p className="text-sm text-[#66B2B2] font-bold">Деректер жүктелуде...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card-glow p-12 rounded-3xl text-center space-y-4 max-w-2xl mx-auto mt-10">
            <span className="material-symbols-outlined text-6xl text-[#f59e0b]">sentiment_dissatisfied</span>
            <h2 className="text-2xl font-black text-[#0F4C5C] font-['Space_Grotesk']">Сынып табылмады</h2>
            <p className="text-[#2F7F86]">{error === 'Сынып тағайындалмаған' ? 'Сіз әлі ешқандай сыныпқа тіркелмегенсіз. Мұғаліміңізден сынып кодын сұраңыз.' : error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Class Banner */}
            <div className="relative rounded-3xl overflow-hidden px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
              style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 60%, #2F7F86 100%)', boxShadow: '0 8px 32px rgba(15,76,92,0.2)' }}>
              <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10"
                style={{ background: 'radial-gradient(circle at right, #BFE3E1, transparent)' }} />
              
              <div className="relative z-10">
                <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">Сынып атауы</p>
                <h2 className="font-['Space_Grotesk'] text-3xl font-black text-white">{data.classInfo.name}</h2>
                <div className="flex items-center gap-3 mt-3">
                  <span className="badge-active bg-[#2F7F86]/30 text-[#BFE3E1] border border-[#BFE3E1]/20">Код: {data.classInfo.code}</span>
                  <span className="text-[#BFE3E1]/80 text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                    {data.students.length} оқушы
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-white text-2xl font-light">school</span>
                </div>
                <div>
                  <p className="text-[#BFE3E1]/60 text-[10px] uppercase font-bold tracking-wider">Сынып жетекшісі</p>
                  <p className="text-white font-bold text-lg leading-tight">{data.classInfo.teacher_name}</p>
                  <p className="text-[#BFE3E1] text-xs mt-0.5">{data.classInfo.teacher_email || '—'}</p>
                </div>
              </div>
            </div>

            {/* Students Grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#0F4C5C]">Сыныптастар</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.students.map((student, i) => (
                  <div key={student.id} className="card-glow p-4 rounded-2xl flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default"
                    style={{ border: user?.id === student.id ? '2px solid #2F7F86' : '1px solid #BFE3E1' }}>
                    
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg"
                        style={{ 
                          background: user?.id === student.id ? 'linear-gradient(135deg, #2F7F86, #0F4C5C)' : '#E6F4F3',
                          color: user?.id === student.id ? 'white' : '#2F7F86'
                        }}>
                        {student.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center text-[9px] font-black text-[#66B2B2] shadow-sm">
                        {i + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[#0F4C5C] truncate">
                        {student.full_name} 
                        {user?.id === student.id && <span className="ml-2 text-[10px] text-[#2F7F86] bg-[#E6F4F3] px-2 py-0.5 rounded-full font-bold">Мен</span>}
                      </p>
                      <p className="text-xs text-[#66B2B2] truncate mt-0.5">{student.email}</p>
                    </div>
                  </div>
                ))}

                {data.students.length === 0 && (
                  <div className="col-span-full py-10 text-center text-[#66B2B2] text-sm card-glow rounded-3xl">
                    Сыныпта әзірге басқа оқушылар жоқ
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
