import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

const contentTypes = [
  { id: 'quiz', icon: 'quiz', label: 'Тест / Quiz' },
  { id: 'video', icon: 'videocam', label: 'Видео сабақ' },
  { id: 'reading', icon: 'menu_book', label: 'Оқу материалы' },
  { id: 'task', icon: 'assignment', label: 'Тапсырма' },
]

const SUBJECTS = ['Математика', 'Алгебра', 'Геометрия', 'Физика', 'Химия', 'Биология', 'Тарих', 'Қазақ тілі', 'Орыс тілі', 'Информатика', 'Ағылшын тілі']

const EMPTY_Q = { text: '', type: 'single', options: ['', '', '', ''], answer: 0 }

export default function CreateLesson() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Form state
  const [lessonType, setLessonType] = useState('quiz')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [className, setClassName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState(50)
  const [duration, setDuration] = useState(45)
  const [maxScore, setMaxScore] = useState(100)
  const [aiAssist, setAiAssist] = useState(true)

  // Quiz questions
  const [questions, setQuestions] = useState([])
  const [editingQ, setEditingQ] = useState(null) // index or null
  const [qDraft, setQDraft] = useState(EMPTY_Q)

  // Classes from API
  const [classes, setClasses] = useState([])

  // UI state
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.getClasses().then(data => {
      setClasses(data)
      if (data[0]) setClassName(data[0].name)
    }).catch(() => {})
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  // Save lesson
  const save = async (status) => {
    if (!title.trim()) { setError('Сабақ атауын жазыңыз'); return }
    setSaving(true)
    setError('')
    try {
      await api.createLesson({
        title: title.trim(),
        subject,
        class_name: className,
        difficulty,
        duration: Number(duration),
        max_score: Number(maxScore),
        status,
      })
      setSuccess(status === 'active' ? 'Сабақ жарияланды!' : 'Жоба сақталды!')
      setTimeout(() => navigate('/teacher'), 1200)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  // AI generate questions
  const generateAI = async () => {
    if (!title.trim() && !subject) return
    setAiLoading(true)
    try {
      const data = await api.generateLessonQuestions({ title: title || subject, subject, count: 5 })
      if (data.questions?.length) {
        const mapped = data.questions.map(q => ({
          text: q.question || q.text || '',
          type: q.type === 'open' ? 'open' : 'single',
          options: q.options?.length ? q.options : ['', '', '', ''],
          answer: q.answer ?? 0,
        }))
        setQuestions(prev => [...prev, ...mapped])
      }
    } catch {
      // fallback: add sample questions
      setQuestions(prev => [...prev,
        { text: `${subject} бойынша негізгі ұғым қандай?`, type: 'single', options: ['1-нұсқа', '2-нұсқа', '3-нұсқа', '4-нұсқа'], answer: 0 },
        { text: `${subject} тақырыбын қысқаша сипаттаңыз`, type: 'open', options: [], answer: 0 },
      ])
    }
    setAiLoading(false)
  }

  // Question editor
  const openAddQ = () => { setQDraft({ ...EMPTY_Q, options: ['', '', '', ''] }); setEditingQ('new') }
  const openEditQ = (i) => { setQDraft({ ...questions[i], options: [...questions[i].options] }); setEditingQ(i) }
  const saveQ = () => {
    if (!qDraft.text.trim()) return
    if (editingQ === 'new') setQuestions(prev => [...prev, qDraft])
    else setQuestions(prev => prev.map((q, i) => i === editingQ ? qDraft : q))
    setEditingQ(null)
  }
  const deleteQ = (i) => setQuestions(prev => prev.filter((_, idx) => idx !== i))

  const diffLabel = difficulty < 33 ? 'Жеңіл' : difficulty < 66 ? 'Орташа' : 'Қиын'

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="teacher" userName={user?.full_name || 'Мұғалім'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Сабақ жасау" subtitle="Lesson Builder" hasSidebar />

      <div className="ml-64">
        {/* Banner */}
        <div className="relative overflow-hidden mx-8 mt-8 rounded-3xl p-8"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)' }}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px,transparent 1px),linear-gradient(90deg,#BFE3E1 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#66B2B2] text-xl">edit_note</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#BFE3E1]/60">Жаңа сабақ</span>
            </div>
            <h1 className="font-['Space_Grotesk'] text-3xl font-black text-white tracking-tight">Сабақ жасау</h1>
            <p className="text-[#BFE3E1]/60 mt-1 text-sm">AI-қолдауымен интерактивті сабақ жасаңыз</p>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Alerts */}
            {error && (
              <div className="flex items-center gap-2 p-4 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200">
                <span className="material-symbols-outlined text-base">error</span>{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-4 rounded-xl text-sm font-semibold text-green-700 bg-green-50 border border-green-200">
                <span className="material-symbols-outlined text-base">check_circle</span>{success}
              </div>
            )}

            {/* Lesson type */}
            <div className="card-glow rounded-2xl p-6">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] mb-4 text-sm uppercase tracking-wider">Сабақ түрі</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {contentTypes.map(t => (
                  <button key={t.id} type="button" onClick={() => setLessonType(t.id)}
                    className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5"
                    style={lessonType === t.id ? {
                      background: 'linear-gradient(135deg,rgba(47,127,134,0.1),rgba(15,76,92,0.05))',
                      border: '2px solid #2F7F86', boxShadow: '0 4px 12px rgba(47,127,134,0.15)',
                    } : { background: '#f8fdfc', border: '2px solid #BFE3E1' }}>
                    <span className="material-symbols-outlined text-2xl"
                      style={{ color: lessonType === t.id ? '#2F7F86' : '#66B2B2', fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                    <span className="text-xs font-bold" style={{ color: lessonType === t.id ? '#0F4C5C' : '#66B2B2' }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic info */}
            <div className="card-glow rounded-2xl p-6 space-y-5">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] text-sm uppercase tracking-wider">Негізгі ақпарат</h3>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Сабақ атауы *</label>
                <input className="input-field" placeholder="Мысалы: Квадрат теңдеулер — 1-бөлім"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Пән</label>
                  <div className="relative">
                    <select className="input-field appearance-none pr-10" value={subject} onChange={e => setSubject(e.target.value)}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#66B2B2]">expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Сынып</label>
                  <div className="relative">
                    <select className="input-field appearance-none pr-10" value={className} onChange={e => setClassName(e.target.value)}>
                      {classes.length > 0
                        ? classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                        : <option value="">Сыныптар жоқ</option>
                      }
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#66B2B2]">expand_more</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Сипаттамасы</label>
                <textarea className="input-field resize-none" rows={3}
                  placeholder="Сабақтың мақсаты мен мазмұнын сипаттаңыз..."
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Settings */}
            <div className="card-glow rounded-2xl p-6 space-y-6">
              <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] text-sm uppercase tracking-wider">Параметрлер</h3>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#66B2B2]">Қиындық деңгейі</label>
                  <span className="text-sm font-black text-[#2F7F86]">{diffLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={difficulty}
                  onChange={e => setDifficulty(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right,#2F7F86 0%,#2F7F86 ${difficulty}%,#BFE3E1 ${difficulty}%,#BFE3E1 100%)` }} />
                <div className="flex justify-between text-[9px] text-[#66B2B2] uppercase tracking-wider mt-2">
                  <span>Жеңіл</span><span>Орташа</span><span>Қиын</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Ұзақтығы (мин)</label>
                  <div className="relative">
                    <input className="input-field pr-10" type="number" min="1" max="180"
                      value={duration} onChange={e => setDuration(e.target.value)} />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-sm">timer</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Макс. ұпай</label>
                  <div className="relative">
                    <input className="input-field pr-10" type="number" min="1" max="1000"
                      value={maxScore} onChange={e => setMaxScore(e.target.value)} />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-sm">grade</span>
                  </div>
                </div>
              </div>

              {/* AI toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl cursor-pointer"
                onClick={() => setAiAssist(v => !v)}
                style={{ background: aiAssist ? 'linear-gradient(135deg,rgba(47,127,134,0.08),rgba(15,76,92,0.04))' : '#f8fdfc', border: `1.5px solid ${aiAssist ? '#2F7F86' : '#BFE3E1'}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: aiAssist ? 'linear-gradient(135deg,#66B2B2,#2F7F86)' : '#E6F4F3' }}>
                    <span className="material-symbols-outlined" style={{ color: aiAssist ? '#fff' : '#66B2B2' }}>psychology</span>
                  </div>
                  <div>
                    <p className="font-black text-sm text-[#0F4C5C]">AI Қолдауы</p>
                    <p className="text-xs text-[#66B2B2]">AI сабақты автоматты оңтайландырады</p>
                  </div>
                </div>
                <div className="relative w-12 h-6 rounded-full transition-all" style={{ background: aiAssist ? '#2F7F86' : '#BFE3E1' }}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${aiAssist ? 'left-7' : 'left-1'}`} />
                </div>
              </div>
            </div>

            {/* Quiz questions */}
            {lessonType === 'quiz' && (
              <div className="card-glow rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: 'linear-gradient(180deg,#2F7F86,#66B2B2)' }} />

                <div className="flex items-center justify-between">
                  <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#2F7F86]">auto_fix_high</span>
                    Сұрақтар ({questions.length})
                  </h3>
                  <button onClick={generateAI} disabled={aiLoading}
                    className="text-xs font-bold text-[#2F7F86] border border-[#BFE3E1] px-3 py-1.5 rounded-xl hover:bg-[#E6F4F3] transition-all flex items-center gap-1 disabled:opacity-50">
                    {aiLoading
                      ? <><div className="w-3 h-3 rounded-full border-2 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />AI жасауда...</>
                      : <><span className="material-symbols-outlined text-sm">auto_fix_high</span>AI-мен жасау</>}
                  </button>
                </div>

                {questions.length === 0 && (
                  <div className="text-center py-8 text-[#66B2B2] text-sm">
                    Сұрақтар жоқ. AI-мен жасаңыз немесе өзіңіз қосыңыз.
                  </div>
                )}

                {questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#E6F4F3', border: '1px solid #BFE3E1' }}>
                    <span className="font-['Space_Grotesk'] font-black text-lg text-[#66B2B2] min-w-[28px]">{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#0F4C5C]">{q.text}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{ background: 'rgba(47,127,134,0.1)', color: '#2F7F86' }}>
                        {q.type === 'open' ? 'Ашық жауап' : 'Бір жауап'}
                      </span>
                      {q.type !== 'open' && q.options.filter(Boolean).length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {q.options.filter(Boolean).map((opt, oi) => (
                            <span key={oi} className={`text-[10px] px-2 py-0.5 rounded ${oi === q.answer ? 'bg-green-100 text-green-700 font-bold' : 'text-[#66B2B2]'}`}>
                              {oi === q.answer ? '✓ ' : ''}{opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditQ(i)} className="p-1.5 rounded-lg hover:bg-white transition-colors text-[#66B2B2] hover:text-[#2F7F86]">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => deleteQ(i)} className="p-1.5 rounded-lg hover:bg-white transition-colors text-[#66B2B2] hover:text-red-400">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Question editor modal inline */}
                {editingQ !== null && (
                  <div className="p-4 rounded-xl space-y-3" style={{ background: '#fff', border: '2px solid #2F7F86' }}>
                    <p className="text-xs font-black uppercase tracking-wider text-[#2F7F86]">
                      {editingQ === 'new' ? 'Жаңа сұрақ' : `${editingQ + 1}-сұрақты өңдеу`}
                    </p>
                    <input className="input-field" placeholder="Сұрақ мәтіні..."
                      value={qDraft.text} onChange={e => setQDraft(p => ({ ...p, text: e.target.value }))} />
                    <div className="flex gap-3">
                      {['single', 'open'].map(t => (
                        <button key={t} onClick={() => setQDraft(p => ({ ...p, type: t }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={qDraft.type === t ? { background: '#2F7F86', color: '#fff' } : { background: '#f0fafa', color: '#66B2B2', border: '1px solid #BFE3E1' }}>
                          {t === 'single' ? 'Бір жауап' : 'Ашық жауап'}
                        </button>
                      ))}
                    </div>
                    {qDraft.type === 'single' && (
                      <div className="space-y-2">
                        {qDraft.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button onClick={() => setQDraft(p => ({ ...p, answer: oi }))}
                              className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all"
                              style={{ borderColor: qDraft.answer === oi ? '#2F7F86' : '#BFE3E1', background: qDraft.answer === oi ? '#2F7F86' : 'transparent' }} />
                            <input className="input-field py-1.5 text-sm" placeholder={`${oi + 1}-нұсқа`}
                              value={opt} onChange={e => setQDraft(p => { const opts = [...p.options]; opts[oi] = e.target.value; return { ...p, options: opts } })} />
                          </div>
                        ))}
                        <p className="text-[10px] text-[#66B2B2]">Дұрыс жауапты шеңберге басу арқылы белгілеңіз</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveQ} disabled={!qDraft.text.trim()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
                        style={{ background: 'linear-gradient(135deg,#2F7F86,#0F4C5C)' }}>Сақтау</button>
                      <button onClick={() => setEditingQ(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-[#66B2B2] hover:bg-[#f0fafa] transition-all">Бас тарту</button>
                    </div>
                  </div>
                )}

                <button onClick={openAddQ}
                  className="w-full py-3 rounded-xl text-[#66B2B2] hover:text-[#2F7F86] hover:border-[#66B2B2] transition-all flex items-center justify-center gap-2 text-sm font-bold"
                  style={{ border: '2px dashed #BFE3E1' }}>
                  <span className="material-symbols-outlined">add</span>Сұрақ қосу
                </button>
              </div>
            )}

            {/* Video lesson */}
            {lessonType === 'video' && (
              <div className="card-glow rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: 'linear-gradient(180deg,#2F7F86,#66B2B2)' }} />
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2F7F86]" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                  Видео контент
                </h3>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">YouTube / Vimeo сілтемесі</label>
                  <div className="relative">
                    <input className="input-field pr-10" placeholder="https://youtube.com/watch?v=..." />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-sm">link</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Видеоға сипаттама</label>
                  <textarea className="input-field resize-none" rows={3} placeholder="Бұл видеода нені үйренесіз..." />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0fafa', border: '1px solid #BFE3E1' }}>
                  <span className="material-symbols-outlined text-[#2F7F86]">info</span>
                  <p className="text-xs text-[#66B2B2]">Видео сабақ оқушыларға белсенді режимде ашылады</p>
                </div>
              </div>
            )}

            {/* Reading material */}
            {lessonType === 'reading' && (
              <div className="card-glow rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: 'linear-gradient(180deg,#2F7F86,#66B2B2)' }} />
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2F7F86]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  Оқу материалы
                </h3>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Мәтін мазмұны</label>
                  <textarea className="input-field resize-none" rows={8} placeholder="Сабақтың негізгі мазмұнын осында жазыңыз. Параграфтар, анықтамалар, мысалдар..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Қосымша файл (PDF, DOC)</label>
                  <div className="flex items-center justify-center py-8 rounded-xl cursor-pointer hover:bg-[#f0fafa] transition-all"
                    style={{ border: '2px dashed #BFE3E1' }}>
                    <div className="text-center">
                      <span className="material-symbols-outlined text-3xl text-[#BFE3E1]">upload_file</span>
                      <p className="text-sm text-[#66B2B2] mt-1">Файлды осында сүйреңіз немесе басыңыз</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOC, DOCX • макс. 10MB</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task */}
            {lessonType === 'task' && (
              <div className="card-glow rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: 'linear-gradient(180deg,#2F7F86,#66B2B2)' }} />
                <h3 className="font-['Space_Grotesk'] font-black text-[#0F4C5C] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2F7F86]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                  Тапсырма мазмұны
                </h3>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Тапсырма шарты</label>
                  <textarea className="input-field resize-none" rows={5} placeholder="Оқушы не істеуі керек? Нақты нұсқаулар мен талаптарды жазыңыз..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Тапсыру мерзімі</label>
                    <div className="relative">
                      <input className="input-field pr-10" type="date" />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-sm">calendar_today</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Тапсыру форматы</label>
                    <div className="relative">
                      <select className="input-field appearance-none pr-10">
                        <option>Мәтін жауап</option>
                        <option>Файл жүктеу</option>
                        <option>Сілтеме</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#66B2B2]">expand_more</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Бағалау критерийлері</label>
                  <textarea className="input-field resize-none" rows={3} placeholder="Тапсырма қалай бағаланады? Критерийлер..." />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pb-8">
              <button onClick={() => save('draft')} disabled={saving}
                className="px-6 py-3 rounded-2xl border-2 border-[#BFE3E1] text-[#66B2B2] font-bold text-sm hover:border-[#66B2B2] hover:text-[#2F7F86] transition-all flex items-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">save</span>
                Жоба ретінде сақтау
              </button>
              <button onClick={() => save('active')} disabled={saving}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                {saving
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Сақталуда...</>
                  : <><span className="material-symbols-outlined text-sm">publish</span>Жариялау</>}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
