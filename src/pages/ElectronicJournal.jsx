import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function gradeStyle(g) {
  const n = Number(g)
  if (n === 5) return { background: '#dcfce7', color: '#15803d' }
  if (n === 4) return { background: '#E6F4F3', color: '#2F7F86' }
  if (n === 3) return { background: '#fef3c7', color: '#b45309' }
  return { background: '#fee2e2', color: '#dc2626' }
}

export default function ElectronicJournal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [grades, setGrades] = useState([])

  const [selClass, setSelClass] = useState('')
  const [selSubject, setSelSubject] = useState('Барлығы')

  // Add grade modal
  const [modal, setModal] = useState(null) // { studentId, lessonId, existing }
  const [scoreInput, setScoreInput] = useState('')
  const [saving, setSaving] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getClasses(),
      api.getStudents(),
      api.getLessons(),
      api.getGrades(),
    ]).then(([cls, sts, lsn, grd]) => {
      setClasses(cls)
      setStudents(sts)
      setLessons(lsn)
      setGrades(grd)
      if (cls[0]) setSelClass(cls[0].name)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Filtered students by class
  const filteredStudents = useMemo(() =>
    students.filter(s => !selClass || s.class_name === selClass),
    [students, selClass]
  )

  // All subjects from lessons
  const subjects = useMemo(() => {
    const set = new Set(lessons.map(l => l.subject).filter(Boolean))
    return ['Барлығы', ...set]
  }, [lessons])

  // Filtered lessons by subject
  const filteredLessons = useMemo(() =>
    lessons.filter(l => selSubject === 'Барлығы' || l.subject === selSubject),
    [lessons, selSubject]
  )

  // gradeMap[studentId][lessonId] = grade object
  const gradeMap = useMemo(() => {
    const map = {}
    for (const g of grades) {
      if (!map[g.student_id]) map[g.student_id] = {}
      // index by lesson_id if present
      if (g.lesson_id != null) {
        map[g.student_id][g.lesson_id] = g
      }
      // also index by subject as fallback key (for grades without lesson_id)
      if (g.subject && g.lesson_id == null) {
        const key = `subj_${g.subject}`
        if (!map[g.student_id][key]) map[g.student_id][key] = g
      }
    }
    return map
  }, [grades])

  // Per-student average
  const avgFor = (studentId) => {
    const sGrades = grades.filter(g => g.student_id === studentId)
    if (!sGrades.length) return null
    return (sGrades.reduce((s, g) => s + Number(g.score), 0) / sGrades.length).toFixed(1)
  }

  // Global stats
  const allScores = grades.filter(g => filteredStudents.find(s => s.id === g.student_id)).map(g => Number(g.score))
  const globalAvg = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : '—'
  const bestStudent = filteredStudents.reduce((best, s) => {
    const avg = avgFor(s.id)
    if (!avg) return best
    if (!best || Number(avg) > Number(avgFor(best.id))) return s
    return best
  }, null)

  // Open modal
  const openCell = (studentId, lessonId) => {
    const existing = gradeMap[studentId]?.[lessonId]
    setScoreInput(existing ? String(existing.score) : '')
    setModal({ studentId, lessonId, existing })
  }

  const handleSaveGrade = async () => {
    const score = Number(scoreInput)
    if (!scoreInput || isNaN(score) || score < 1 || score > 5) return
    setSaving(true)
    try {
      if (modal.existing) {
        await api.deleteGrade(modal.existing.id)
        setGrades(prev => prev.filter(g => g.id !== modal.existing.id))
      }
      const lesson = lessons.find(l => l.id === modal.lessonId)
      const newGrade = await api.addGrade({
        student_id: modal.studentId,
        lesson_id: modal.lessonId,
        subject: lesson?.subject || null,
        score,
      })
      setGrades(prev => [...prev, newGrade])
      setModal(null)
    } catch (e) {
      alert(e.message)
    }
    setSaving(false)
  }

  const handleDeleteGrade = async () => {
    if (!modal.existing) return
    setSaving(true)
    try {
      await api.deleteGrade(modal.existing.id)
      setGrades(prev => prev.filter(g => g.id !== modal.existing.id))
      setModal(null)
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16); doc.setTextColor(15, 76, 92)
    doc.text('ZerAql — Электронды журнал', 14, 15)
    doc.setFontSize(10); doc.setTextColor(102, 178, 178)
    doc.text(`${selSubject === 'Барлығы' ? 'Барлық пәндер' : selSubject} · ${selClass} · ${new Date().getFullYear()}`, 14, 22)
    doc.setFontSize(9); doc.setTextColor(80, 80, 80)
    doc.text(`Орташа баға: ${globalAvg}   Оқушылар: ${filteredStudents.length}`, 14, 29)

    const head = [['Оқушы', ...filteredLessons.map(l => l.title.slice(0, 12)), 'Орташа']]
    const body = filteredStudents.map(s => [
      s.full_name,
      ...filteredLessons.map(l => gradeMap[s.id]?.[l.id]?.score ?? '—'),
      avgFor(s.id) ?? '—',
    ])
    autoTable(doc, {
      head, body, startY: 34,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 76, 92], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 250, 250] },
      columnStyles: { 0: { cellWidth: 35 } },
    })
    doc.save('zeraql-jurnal.pdf')
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Журнал" subtitle="Электронды журнал" hasSidebar />

      {/* Grade modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl space-y-4">
            <div>
              <p className="font-black text-[#0F4C5C] text-base">
                {modal.existing ? 'Бағаны өзгерту' : 'Баға қою'}
              </p>
              <p className="text-xs text-[#66B2B2] mt-0.5">
                {students.find(s => s.id === modal.studentId)?.full_name} —{' '}
                {lessons.find(l => l.id === modal.lessonId)?.title}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2">Баға (1–5)</label>
              <div className="flex gap-2">
                {[5, 4, 3, 2].map(n => (
                  <button key={n} type="button"
                    onClick={() => setScoreInput(String(n))}
                    className="flex-1 py-3 rounded-xl text-lg font-black transition-all"
                    style={scoreInput === String(n) ? gradeStyle(n) : { background: '#f0fafa', color: '#66B2B2', border: '1.5px solid #BFE3E1' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveGrade} disabled={saving || !scoreInput}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg,#2F7F86,#0F4C5C)' }}>
                {saving ? 'Сақталуда...' : 'Сақтау'}
              </button>
              {modal.existing && (
                <button onClick={handleDeleteGrade} disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-50 transition-all border border-red-200">
                  Жою
                </button>
              )}
              <button onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#66B2B2] hover:bg-[#f0fafa] transition-all">
                Бас тарту
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ml-64">
        {/* Banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg,#0F4C5C 0%,#1a6474 50%,#2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px,transparent 1px),linear-gradient(90deg,#BFE3E1 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#66B2B2] text-xl">auto_stories</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#BFE3E1]/60">Электронды журнал</span>
              </div>
              <h1 className="font-['Space_Grotesk'] text-3xl font-black text-white tracking-tight">
                {selSubject === 'Барлығы' ? 'Барлық пәндер' : selSubject} · {selClass || '—'}
              </h1>
              <p className="text-[#BFE3E1]/60 mt-1 text-sm">{new Date().getFullYear()} оқу жылы</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Class filter */}
              <div className="relative">
                <select value={selClass} onChange={e => setSelClass(e.target.value)}
                  className="appearance-none bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl px-4 pr-8 py-2 text-xs font-bold focus:outline-none min-w-[120px]">
                  {classes.map(c => <option key={c.id} value={c.name} className="text-[#0F4C5C] bg-white">{c.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/60 text-sm">expand_more</span>
              </div>
              {/* Subject filter */}
              <div className="relative">
                <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
                  className="appearance-none bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-xl px-4 pr-8 py-2 text-xs font-bold focus:outline-none min-w-[130px]">
                  {subjects.map(s => <option key={s} value={s} className="text-[#0F4C5C] bg-white">{s}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/60 text-sm">expand_more</span>
              </div>
              <button onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0F4C5C] hover:shadow-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.9)' }}>
                <span className="material-symbols-outlined text-sm text-[#2F7F86]">picture_as_pdf</span>
                PDF жүктеу
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Орташа баға', value: globalAvg, icon: 'grade', color: '#2F7F86', bg: '#E6F4F3' },
              { label: 'Үздік оқушы', value: bestStudent ? avgFor(bestStudent.id) : '—', icon: 'emoji_events', color: '#f59e0b', bg: '#fffbeb' },
              { label: 'Жазылған бағалар', value: String(allScores.length), icon: 'edit_note', color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Оқушылар', value: String(filteredStudents.length), icon: 'groups', color: '#0F4C5C', bg: '#E6F4F3' },
            ].map(s => (
              <div key={s.label} className="card-glow rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ backgroundColor: s.color }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                  <span className="material-symbols-outlined" style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                </div>
                <div>
                  <p className="text-[9px] text-[#66B2B2] uppercase tracking-wider font-black">{s.label}</p>
                  <p className="font-['Space_Grotesk'] font-black text-2xl" style={{ color: s.color }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#BFE3E1] flex justify-between items-center"
              style={{ background: 'linear-gradient(180deg,#fff,#f8fdfc)' }}>
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C]">Баға журналы</h3>
              <p className="text-xs text-[#66B2B2]">Бағаны қосу немесе өзгерту үшін ұяшыққа басыңыз</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
                <span className="text-sm text-[#66B2B2]">Жүктелуде...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">group_off</span>
                <p className="text-sm text-[#66B2B2]">Бұл сыныпта оқушылар жоқ</p>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="material-symbols-outlined text-4xl text-[#BFE3E1]">menu_book</span>
                <p className="text-sm text-[#66B2B2]">Бұл пән бойынша сабақтар жоқ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead style={{ background: '#E6F4F3' }}>
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#66B2B2] sticky left-0 bg-[#E6F4F3] min-w-[180px]">Оқушы</th>
                      {filteredLessons.map(l => (
                        <th key={l.id} className="px-2 py-3 text-[9px] font-black uppercase tracking-wider text-[#66B2B2] text-center min-w-[80px] max-w-[100px]">
                          <div className="truncate max-w-[80px]" title={l.title}>{l.title}</div>
                          <div className="text-[8px] text-[#BFE3E1] font-normal normal-case">{l.subject}</div>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#66B2B2] text-center">Орт.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#BFE3E1]">
                    {filteredStudents.map(s => {
                      const avg = avgFor(s.id)
                      return (
                        <tr key={s.id} className="hover:bg-[#E6F4F3]/30 transition-colors bg-white">
                          <td className="px-5 py-3 sticky left-0 bg-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#BFE3E1,#66B2B2)' }}>
                                <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                              </div>
                              <span className="font-bold text-sm text-[#0F4C5C] whitespace-nowrap">{s.full_name}</span>
                            </div>
                          </td>
                          {filteredLessons.map(l => {
                            const g = gradeMap[s.id]?.[l.id] ?? gradeMap[s.id]?.[`subj_${l.subject}`]
                            return (
                              <td key={l.id} className="px-2 py-3 text-center">
                                <button type="button"
                                  onClick={() => openCell(s.id, l.id)}
                                  className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-xs font-black transition-all hover:scale-110 hover:shadow-md"
                                  style={g ? gradeStyle(g.score) : { background: '#f0fafa', color: '#BFE3E1', border: '1.5px dashed #BFE3E1' }}>
                                  {g ? g.score : '+'}
                                </button>
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 text-center">
                            {avg
                              ? <span className="font-['Space_Grotesk'] font-black text-lg" style={{ color: Number(avg) >= 4.5 ? '#22c55e' : Number(avg) >= 3.5 ? '#2F7F86' : '#f59e0b' }}>{avg}</span>
                              : <span className="text-[#BFE3E1] text-sm">—</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="px-6 py-3 border-t border-[#BFE3E1] flex flex-wrap items-center gap-4 text-xs text-[#66B2B2]"
              style={{ background: '#f8fdfc' }}>
              <span className="font-black uppercase tracking-wider">Бағалар:</span>
              {[
                { label: '5 — Үздік', s: gradeStyle(5) },
                { label: '4 — Жақсы', s: gradeStyle(4) },
                { label: '3 — Қанағат', s: gradeStyle(3) },
                { label: '2 — Нашар', s: gradeStyle(2) },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded text-xs font-black flex items-center justify-center" style={l.s}>{l.label[0]}</span>
                  <span>{l.label}</span>
                </div>
              ))}
              <span className="ml-auto text-[10px]">+ басу арқылы баға қосыңыз</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
