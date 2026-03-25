import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [school, setSchool] = useState(user?.school || '')
  const [classCode, setClassCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [classJoining, setClassJoining] = useState(false)
  const [msg, setMsg] = useState(null)
  const [classMsg, setClassMsg] = useState(null)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setSchool(user.school || '')
    }
  }, [user])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await api.updateMe({ full_name: fullName, school })
      setMsg({ type: 'success', text: 'Профиль сәтті жаңартылды!' })
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleJoinClass = async () => {
    if (!classCode.trim()) return
    setClassJoining(true)
    setClassMsg(null)
    try {
      const res = await api.joinClass(classCode.trim())
      setClassMsg({ type: 'success', text: res.message })
      setClassCode('')
    } catch (e) {
      setClassMsg({ type: 'error', text: e.message })
    } finally {
      setClassJoining(false)
    }
  }

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role={user?.role || 'student'} userName={user?.full_name || ''} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Баптаулар" subtitle="Профиль мен жүйе параметрлері" hasSidebar />

      <main className="ml-64 p-8 space-y-8 max-w-3xl">

        {/* Profile editing */}
        <section className="card-glow p-8 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[#2F7F86]" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <h2 className="font-['Space_Grotesk'] text-xl font-black text-[#0F4C5C]">Жеке мәліметтер</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#66B2B2] uppercase tracking-wider block mb-1.5">Аты-жөні</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="input-field w-full py-3 px-4 text-sm" placeholder="Толық аты-жөні" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#66B2B2] uppercase tracking-wider block mb-1.5">Мектеп / Оқу орны</label>
              <input type="text" value={school} onChange={e => setSchool(e.target.value)}
                className="input-field w-full py-3 px-4 text-sm" placeholder="Мектеп атауы" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#66B2B2] uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" value={user?.email || ''} disabled
                className="input-field w-full py-3 px-4 text-sm opacity-60 cursor-not-allowed" />
              <p className="text-[10px] text-[#66B2B2] mt-1">Email-ді өзгерту мүмкін емес</p>
            </div>
          </div>

          {msg && (
            <div className={`text-sm font-bold p-3 rounded-xl ${msg.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
              {msg.text}
            </div>
          )}

          <button onClick={handleSaveProfile} disabled={saving}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#2F7F86] to-[#0F4C5C] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50">
            {saving ? 'Сақталуда...' : 'Сақтау'}
          </button>
        </section>

        {/* Join class */}
        {user?.role === 'student' && (
          <section className="card-glow p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-[#f59e0b]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              <h2 className="font-['Space_Grotesk'] text-xl font-black text-[#0F4C5C]">Сыныпқа қосылу</h2>
            </div>
            <p className="text-sm text-[#66B2B2]">Мұғаліміңізден алған 6 таңбалы сынып кодын енгізіңіз</p>

            <div className="flex gap-3">
              <input type="text" value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())}
                maxLength={6} placeholder="ABCDEF"
                className="input-field flex-1 py-3 px-4 text-sm font-['Space_Grotesk'] font-bold tracking-[0.3em] text-center uppercase" />
              <button onClick={handleJoinClass} disabled={classJoining || classCode.length < 3}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                {classJoining ? '...' : 'Қосылу'}
              </button>
            </div>

            {classMsg && (
              <div className={`text-sm font-bold p-3 rounded-xl ${classMsg.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                {classMsg.text}
              </div>
            )}
          </section>
        )}

        {/* Danger zone */}
        <section className="card-glow p-8 rounded-3xl space-y-4 border-red-200" style={{ borderColor: '#fecaca' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <h2 className="font-['Space_Grotesk'] text-xl font-black text-[#0F4C5C]">Қауіпті аймақ</h2>
          </div>
          <p className="text-sm text-[#66B2B2]">Аккаунттан шығу немесе сессияны тоқтату</p>
          <button onClick={handleLogout}
            className="px-6 py-3 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-200 hover:bg-red-100 transition-all">
            Жүйеден шығу
          </button>
        </section>
      </main>
    </div>
  )
}
