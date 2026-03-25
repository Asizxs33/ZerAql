import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function StudentRow({ student }) {
  const attention = student.attention ?? null
  const emotion = student.emotion ?? null
  const lastActive = student.last_active
    ? new Date(student.last_active).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#f0fafa] transition-all">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #BFE3E1, #66B2B2)' }}>
        <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0F4C5C] truncate">{student.full_name}</p>
        <p className="text-xs text-[#66B2B2] truncate">{student.email}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {attention !== null ? (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#2F7F86]">psychology</span>
            <span className="text-xs font-bold text-[#2F7F86]">{attention}%</span>
          </div>
        ) : null}
        {emotion !== null ? (
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#66B2B2]">mood</span>
            <span className="text-xs font-bold text-[#66B2B2]">{emotion}%</span>
          </div>
        ) : null}
        {lastActive && (
          <span className="text-[10px] text-gray-400 hidden sm:block">{lastActive}</span>
        )}
        {attention === null && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Белсенді емес</span>
        )}
      </div>
    </div>
  )
}

function ClassCard({ cls, onStudentsLoad }) {
  const [expanded, setExpanded] = useState(false)
  const [students, setStudents] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const toggle = async () => {
    if (!expanded && students === null) {
      setLoading(true)
      try {
        const data = await api.getClassStudents(cls.id)
        setStudents(data)
        onStudentsLoad?.(cls.id, data)
      } catch {
        setStudents([])
      }
      setLoading(false)
    }
    setExpanded(v => !v)
  }

  const handleCopy = (e) => {
    e.stopPropagation()
    copyToClipboard(cls.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const count = students !== null ? students.length : Number(cls.student_count || 0)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #BFE3E1', background: '#fff' }}>
      {/* Header */}
      <button onClick={toggle} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#f0fafa] transition-all text-left">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}>
          <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#0F4C5C]">{cls.name}</h3>
          <p className="text-xs text-[#66B2B2] mt-0.5">{count} оқушы</p>
        </div>

        {/* Code badge */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
          style={{ background: copied ? '#e6f4f3' : '#f0fafa', border: '1px solid #BFE3E1' }}
          title="Кодты көшіру"
        >
          <span className="material-symbols-outlined text-sm text-[#2F7F86]">
            {copied ? 'check_circle' : 'key'}
          </span>
          <span className="text-sm font-bold tracking-widest text-[#2F7F86]">{cls.code}</span>
          <span className="material-symbols-outlined text-xs text-[#66B2B2]">
            {copied ? 'done' : 'content_copy'}
          </span>
        </button>

        <span className="material-symbols-outlined text-[#66B2B2] text-xl transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>

      {/* Students list */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e6f4f3' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
              <span className="text-sm text-[#66B2B2]">Жүктелуде...</span>
            </div>
          ) : students && students.length > 0 ? (
            <div className="px-2 py-2 space-y-0.5">
              {students.map(s => <StudentRow key={s.id} student={s} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="material-symbols-outlined text-3xl text-[#BFE3E1]">group_off</span>
              <p className="text-sm text-[#66B2B2]">Оқушылар жоқ</p>
              <p className="text-xs text-gray-400">Оқушылар кіру үшін кодты бөлісіңіз: <strong>{cls.code}</strong></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Classes() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    api.getClasses().then(setClasses).catch(() => {})
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const cls = await api.createClass({ name: newName.trim() })
      setClasses(prev => [{ ...cls, student_count: 0 }, ...prev])
      setNewName('')
      setShowForm(false)
    } catch (err) {
      alert(err.message)
    }
    setCreating(false)
  }

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || 'Мұғалім'} onLogout={() => { logout(); navigate('/login') }} />
      <TopBar breadcrumb="Сыныптарым" subtitle="Сыныптар және оқушылар" hasSidebar />

      <main className="ml-64 pt-20 px-8 pb-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0F4C5C]">Менің сыныптарым</h1>
            <p className="text-sm text-[#66B2B2] mt-0.5">{classes.length} сынып</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}
          >
            <span className="material-symbols-outlined text-base">add</span>
            Жаңа сынып
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="flex gap-3 mb-6 p-4 rounded-2xl" style={{ background: '#f0fafa', border: '1.5px solid #BFE3E1' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Сынып атауы (мыс. 9А, 10Б)"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: '#BFE3E1', background: '#fff', color: '#0F4C5C' }}
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}
            >
              {creating ? 'Жасалуда...' : 'Жасау'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#66B2B2] hover:bg-white transition-all">
              Бас тарту
            </button>
          </form>
        )}

        {/* Classes */}
        {classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <span className="material-symbols-outlined text-5xl text-[#BFE3E1]">school</span>
            <p className="text-lg font-bold text-[#0F4C5C]">Сыныптар жоқ</p>
            <p className="text-sm text-[#66B2B2]">"Жаңа сынып" батырмасын басып сынып жасаңыз</p>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map(cls => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
