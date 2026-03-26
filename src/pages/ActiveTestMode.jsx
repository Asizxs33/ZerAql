import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGlobalProctoring } from '../context/ProctoringContext'
import { useStudentMonitoring } from '../hooks/useMonitoringSocket'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'
import { useLocalAI } from '../hooks/useLocalAI'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

const VIOLATION_COLORS = {
  tab_switch: '#ef4444',
  face_missing: '#f59e0b',
  multiple_faces: '#ef4444',
  devtools_key: '#ef4444',
  devtools_open: '#ef4444',
  low_attention: '#f59e0b',
  face_mismatch: '#ef4444',
  sleepy: '#f59e0b',
  extra_person: '#ef4444',
  default: '#66B2B2',
}

export default function ActiveTestMode() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const lessonId = searchParams.get('lessonId')

  const [lesson, setLesson] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({}) // { qIndex: letterOrText }
  const [openText, setOpenText] = useState('')
  const [timeLeft, setTimeLeft] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showViolations, setShowViolations] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { score, correct, total }
  const [openScores, setOpenScores] = useState({}) // qIndex → { score, label, color }
  const alertTimeout = useRef(null)
  const metricsHistory = useRef([])

  const { status: aiStatus, loadModel, classifyAnswer } = useLocalAI()

  const { sendMetrics, sendViolation } = useStudentMonitoring({
    studentId: user?.id || 'demo',
    studentName: user?.full_name || 'Оқушы',
    classId: user?.class_id || 'demo',
  })

  const {
    videoRef, canvasRef, modelsLoaded, cameraActive,
    metrics, violations, loadingStatus, enrollFace,
  } = useGlobalProctoring() || {}

  // Preload local AI model in background
  useEffect(() => { loadModel() }, [])

  // Load lesson + questions
  useEffect(() => {
    if (!lessonId) { setLoading(false); return }
    api.getLesson(lessonId)
      .then(l => {
        setLesson(l)
        const qs = Array.isArray(l.questions) ? l.questions : []
        setQuestions(qs)
        setTimeLeft((l.duration || 30) * 60)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [lessonId])

  // Enroll face when camera ready
  useEffect(() => {
    if (cameraActive && modelsLoaded && enrollFace) {
      setTimeout(() => enrollFace(), 2000)
    }
  }, [cameraActive, modelsLoaded])

  // Collect metrics history for monitoring save
  useEffect(() => {
    if (metrics && cameraActive) {
      metricsHistory.current.push(metrics)
      sendMetrics(metrics)
    }
  }, [metrics?.attention, metrics?.pulse])

  // Violation toast
  const latestViolation = violations?.[0]
  useEffect(() => {
    if (!latestViolation) return
    if (alertTimeout.current) clearTimeout(alertTimeout.current)
    setAlertMsg(latestViolation.message)
    alertTimeout.current = setTimeout(() => setAlertMsg(null), 3500)
    sendViolation(latestViolation, lesson?.teacher_id)
  }, [latestViolation?.timestamp])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); handleFinish(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft !== null])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const selectAnswer = (letter) => {
    setAnswers(prev => ({ ...prev, [currentQ]: letter }))
  }

  const saveOpenText = () => {
    if (openText.trim()) {
      setAnswers(prev => ({ ...prev, [currentQ]: openText.trim() }))
    }
  }

  const goNext = () => {
    // save open text answer before moving
    const q = questions[currentQ]
    if (q?.type === 'open' && openText.trim()) {
      setAnswers(prev => ({ ...prev, [currentQ]: openText.trim() }))
    }
    if (currentQ < questions.length - 1) {
      setCurrentQ(i => i + 1)
      setOpenText(typeof answers[currentQ + 1] === 'string' && questions[currentQ + 1]?.type === 'open' ? (answers[currentQ + 1] || '') : '')
    } else {
      setShowModal(true)
    }
  }

  const goPrev = () => {
    if (currentQ > 0) {
      setCurrentQ(i => i - 1)
      const prevQ = questions[currentQ - 1]
      setOpenText(prevQ?.type === 'open' ? (answers[currentQ - 1] || '') : '')
    }
  }

  const handleFinish = async () => {
    if (submitting || result) return
    // Block submit if Face ID not enrolled or not verified
    if (cameraActive) {
      if (!metrics?.faceEnrolled) {
        setShowModal(false)
        setAlertMsg('Face ID тіркелмеген — камераға тікелей қараңыз!')
        if (alertTimeout.current) clearTimeout(alertTimeout.current)
        alertTimeout.current = setTimeout(() => setAlertMsg(null), 4000)
        return
      }
      if (!metrics?.faceVerified) {
        setShowModal(false)
        setAlertMsg('Face ID расталмады — камераға тікелей қараңыз!')
        if (alertTimeout.current) clearTimeout(alertTimeout.current)
        alertTimeout.current = setTimeout(() => setAlertMsg(null), 4000)
        return
      }
    }
    setSubmitting(true)
    setShowModal(false)

    // Score single-choice questions
    const singleQs = questions.filter(q => q.type === 'single')
    let correct = 0
    singleQs.forEach((q) => {
      const qIdx = questions.indexOf(q)
      const selectedLetter = answers[qIdx]
      const correctLetter = LETTERS[q.answer ?? 0]
      if (selectedLetter === correctLetter) correct++
    })

    // Score open questions locally via Transformers.js (offline AI)
    const openQs = questions.filter(q => q.type === 'open')
    const openResults = {}
    let openTotal = 0
    if (openQs.length > 0 && aiStatus === 'ready') {
      for (const q of openQs) {
        const qIdx = questions.indexOf(q)
        const studentAnswer = answers[qIdx] || ''
        const modelAnswer = q.modelAnswer || q.text // fallback: use question as reference
        if (studentAnswer.trim()) {
          const result = await classifyAnswer(studentAnswer, modelAnswer)
          openResults[qIdx] = result
          openTotal += result.score
        }
      }
      setOpenScores(openResults)
    }

    const singlePct = singleQs.length > 0 ? correct / singleQs.length : null
    const openAvg = openQs.length > 0 && openTotal > 0 ? openTotal / openQs.length / 5 : null
    const combined = singlePct !== null && openAvg !== null
      ? (singlePct * singleQs.length + openAvg * openQs.length) / questions.length
      : singlePct ?? openAvg ?? 1
    const pct = combined
    const score = pct >= 0.8 ? 5 : pct >= 0.6 ? 4 : pct >= 0.4 ? 3 : pct >= 0.2 ? 2 : 1

    // Submit grade
    try {
      await api.addGrade({
        lesson_id: lessonId ? Number(lessonId) : null,
        subject: lesson?.subject || null,
        score,
      })
    } catch (e) {
      console.error('Grade submit failed:', e.message)
    }

    // Save monitoring session
    if (metricsHistory.current.length > 0) {
      const hist = metricsHistory.current
      const avgAttention = Math.round(hist.reduce((s, m) => s + (m.attention || 0), 0) / hist.length)
      const avgEmotion = Math.round(hist.reduce((s, m) => s + (m.emotionScore || 0), 0) / hist.length)
      const avgPulse = Math.round(hist.filter(m => m.pulse > 0).reduce((s, m) => s + m.pulse, 0) / (hist.filter(m => m.pulse > 0).length || 1))
      try {
        await api.saveMonitoring({
          lesson_id: lessonId ? Number(lessonId) : null,
          attention: avgAttention,
          emotion: avgEmotion,
          pulse: avgPulse || 0,
        })
      } catch {}
    }

    setResult({
      score,
      correct,
      total: singleQs.length,
      pct: Math.round(pct * 100),
      openScored: Object.keys(openResults).length,
      localAI: Object.keys(openResults).length > 0,
    })
    setSubmitting(false)
  }

  const emotionIcon = {
    happy: 'sentiment_very_satisfied', sad: 'sentiment_dissatisfied',
    angry: 'sentiment_very_dissatisfied', fearful: 'sentiment_stressed',
    surprised: 'sentiment_excited', neutral: 'sentiment_neutral', disgusted: 'sick',
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    const colors = { 5: '#22c55e', 4: '#2F7F86', 3: '#f59e0b', 2: '#f97316', 1: '#ef4444' }
    const labels = { 5: 'Өте жақсы!', 4: 'Жақсы!', 3: 'Қанағаттанарлық', 2: 'Нашар', 1: 'Өте нашар' }
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fafa' }}>
        <div className="w-full max-w-md rounded-3xl p-10 text-center shadow-2xl" style={{ background: '#fff', border: '2px solid #BFE3E1' }}>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `${colors[result.score]}18`, border: `2px solid ${colors[result.score]}40` }}>
            <span className="text-5xl font-['Space_Grotesk'] font-black" style={{ color: colors[result.score] }}>{result.score}</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl font-black text-[#0F4C5C] mb-2">{labels[result.score]}</h2>
          <p className="text-[#66B2B2] text-sm mb-6">
            {result.nonQuiz
              ? 'Тапсырма сәтті аяқталды!'
              : result.total > 0
                ? `${result.correct} / ${result.total} дұрыс жауап (${result.pct}%)`
                : 'Ашық сұрақтар орындалды'}
          </p>
          {result.localAI && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-bold"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
              <span className="material-symbols-outlined text-sm">computer</span>
              Ашық жауаптар офлайн AI арқылы тексерілді
            </div>
          )}
          {violations.length > 0 && (
            <div className="mb-6 p-3 rounded-xl text-left" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-xs font-black text-red-600">⚠ {violations.length} бұзушылық тіркелді — мұғалімге хабарланды</p>
            </div>
          )}
          <button onClick={() => navigate('/tasks')}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}>
            Тапсырмаларға қайту
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fafa' }}>
        <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
      </div>
    )
  }

  // ── Complete non-quiz lesson (video/reading/task) ─────────────────────────
  const completeLesson = async (textAnswer = '') => {
    if (submitting || result) return
    if (cameraActive && (!metrics?.faceEnrolled || !metrics?.faceVerified)) {
      setAlertMsg(!metrics?.faceEnrolled
        ? 'Face ID тіркелмеген — камераға тікелей қараңыз!'
        : 'Face ID расталмады — камераға тікелей қараңыз!')
      if (alertTimeout.current) clearTimeout(alertTimeout.current)
      alertTimeout.current = setTimeout(() => setAlertMsg(null), 4000)
      return
    }
    setSubmitting(true)
    try {
      await api.addGrade({ lesson_id: lessonId ? Number(lessonId) : null, subject: lesson?.subject || null, score: 5 })
    } catch {}
    setResult({ score: 5, correct: 0, total: 0, pct: 100, openScored: 0, localAI: false, nonQuiz: true })
    setSubmitting(false)
  }

  const lessonType = lesson?.lesson_type || 'quiz'
  const lessonContent = lesson?.content || ''

  // ── Video lesson ───────────────────────────────────────────────────────────
  if (lessonType === 'video' && questions.length === 0) {
    const isYoutube = lessonContent.includes('youtube.com/embed') || lessonContent.includes('youtu.be')
    return (
      <div className="min-h-screen flex flex-col items-center justify-start pt-10 px-4" style={{ background: '#f0fafa' }}>
        {alertMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-bold text-sm text-white shadow-xl"
            style={{ background: '#ef4444' }}>{alertMsg}</div>
        )}
        <div className="w-full max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/tasks')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#E6F4F3] transition-all">
              <span className="material-symbols-outlined text-[#2F7F86]">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wider">Видео сабақ</p>
              <h1 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C]">{lesson?.title}</h1>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl" style={{ background: '#000', aspectRatio: '16/9' }}>
            {isYoutube ? (
              <iframe src={lessonContent} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="video" />
            ) : (
              <video src={lessonContent} controls className="w-full h-full" />
            )}
          </div>
          <div className="card rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-[#0F4C5C]">{lesson?.subject}</p>
              <p className="text-sm text-[#66B2B2]">{lesson?.duration} мин · {lesson?.teacher_name}</p>
            </div>
            <button onClick={() => completeLesson()} disabled={submitting}
              className="px-6 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              {submitting ? 'Жіберілуде...' : cameraActive && !metrics?.faceVerified ? '🔒 Face ID қажет' : '✓ Қараып шықтым'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Reading material ───────────────────────────────────────────────────────
  if (lessonType === 'reading' && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start pt-10 px-4" style={{ background: '#f0fafa' }}>
        {alertMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-bold text-sm text-white shadow-xl"
            style={{ background: '#ef4444' }}>{alertMsg}</div>
        )}
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/tasks')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#E6F4F3]">
              <span className="material-symbols-outlined text-[#2F7F86]">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#0369a1] uppercase tracking-wider">Оқу материалы</p>
              <h1 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C]">{lesson?.title}</h1>
            </div>
          </div>
          <div className="card rounded-3xl p-8 prose max-w-none text-[#0F4C5C] leading-relaxed">
            {lessonContent.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="font-['Space_Grotesk'] font-black text-lg text-[#0F4C5C] mt-6 mb-2">{line.slice(3)}</h2>
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[#0F4C5C] my-1">{line.slice(2,-2)}</p>
              if (line.startsWith('`') && line.endsWith('`')) return <code key={i} className="block bg-[#E6F4F3] px-4 py-2 rounded-xl font-mono text-sm text-[#0F4C5C] my-2">{line.slice(1,-1)}</code>
              if (line.startsWith('- ') || line.match(/^\d+\./)) return <p key={i} className="text-sm text-[#0F4C5C] my-0.5 pl-4">• {line.replace(/^-\s|^\d+\.\s/, '')}</p>
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-[#BFE3E1] pl-4 text-[#66B2B2] italic text-sm my-2">{line.slice(2)}</blockquote>
              if (!line.trim()) return <br key={i} />
              return <p key={i} className="text-sm text-[#0F4C5C] my-1">{line}</p>
            })}
          </div>
          <div className="flex justify-end">
            <button onClick={() => completeLesson()} disabled={submitting}
              className="px-8 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0369a1, #0284c7)' }}>
              {submitting ? 'Жіберілуде...' : cameraActive && !metrics?.faceVerified ? '🔒 Face ID қажет' : '✓ Оқып шықтым'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Assignment / task ──────────────────────────────────────────────────────
  if (lessonType === 'task' && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start pt-10 px-4" style={{ background: '#f0fafa' }}>
        {alertMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-bold text-sm text-white shadow-xl"
            style={{ background: '#ef4444' }}>{alertMsg}</div>
        )}
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/tasks')} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#E6F4F3]">
              <span className="material-symbols-outlined text-[#2F7F86]">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#065f46] uppercase tracking-wider">Тапсырма</p>
              <h1 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C]">{lesson?.title}</h1>
            </div>
          </div>
          <div className="card rounded-3xl p-8">
            {lessonContent.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="font-['Space_Grotesk'] font-black text-lg text-[#0F4C5C] mt-4 mb-2">{line.slice(3)}</h2>
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-[#0F4C5C] my-1">{line.slice(2,-2)}</p>
              if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-[#34d399] pl-4 text-[#065f46] text-sm my-2">{line.slice(2)}</blockquote>
              if (!line.trim()) return <br key={i} />
              return <p key={i} className="text-sm text-[#0F4C5C] my-1">{line}</p>
            })}
          </div>
          <div className="card rounded-2xl p-5 space-y-3">
            <label className="text-sm font-black text-[#0F4C5C]">Жауабыңыз:</label>
            <textarea
              value={openText}
              onChange={e => setOpenText(e.target.value)}
              rows={6}
              placeholder="Есептердің шешімін осында жазыңыз..."
              className="w-full rounded-xl border border-[#BFE3E1] px-4 py-3 text-sm text-[#0F4C5C] resize-none focus:outline-none focus:border-[#2F7F86]"
            />
            <div className="flex justify-end">
              <button onClick={() => completeLesson(openText)} disabled={submitting || !openText.trim()}
                className="px-8 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #065f46, #047857)' }}>
                {submitting ? 'Жіберілуде...' : cameraActive && !metrics?.faceVerified ? '🔒 Face ID қажет' : '✓ Тапсыру'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── No questions fallback ──────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fafa' }}>
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-5xl text-[#BFE3E1]">quiz</span>
          <p className="font-bold text-[#66B2B2]">Бұл сабақта сұрақтар жоқ</p>
          <button onClick={() => navigate('/tasks')} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#2F7F86' }}>
            Қайту
          </button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  const isOpen = q.type === 'open'
  const currentAnswer = answers[currentQ]
  const answered = Object.keys(answers).length
  const total = questions.length

  // ── Face ID gate: block entire test if camera on but face not verified ─────
  const faceBlocked = cameraActive && modelsLoaded && metrics?.faceEnrolled && !metrics?.faceVerified
  const faceScanning = cameraActive && modelsLoaded && !metrics?.faceEnrolled

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: '#f0fafa' }}>

      {/* ── Face ID blocking overlay ─────────────────────────────────────── */}
      {(faceBlocked || faceScanning) && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ background: faceBlocked ? 'rgba(15,20,30,0.92)' : 'rgba(15,20,30,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm mx-4 rounded-3xl p-8 text-center space-y-5"
            style={{ background: '#fff', border: faceBlocked ? '2px solid #fecaca' : '2px solid #BFE3E1' }}>

            {faceBlocked ? (
              <>
                {/* Mismatch — hard block */}
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
                  style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>
                  <span className="material-symbols-outlined text-5xl text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                    person_off
                  </span>
                </div>
                <div>
                  <h2 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C]">Face ID расталмады</h2>
                  <p className="text-sm text-[#66B2B2] mt-2">Тіркелген тұлғамен сәйкес келмейді.<br/>Тестті жалғастыру үшін камераға тікелей қараңыз.</p>
                </div>
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black text-red-600">Бұзушылық тіркелді — мұғалімге хабарланды</span>
                </div>
                <button onClick={() => navigate('/tasks')}
                  className="w-full py-3 rounded-2xl font-black text-sm border-2 border-[#BFE3E1] text-[#2F7F86] hover:bg-[#E6F4F3] transition-all">
                  Тапсырмаларға шығу
                </button>
              </>
            ) : (
              <>
                {/* Still enrolling — soft wait */}
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
                  style={{ background: '#E6F4F3', border: '2px solid #BFE3E1' }}>
                  <span className="material-symbols-outlined text-5xl text-[#2F7F86] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                    face_unlock
                  </span>
                </div>
                <div>
                  <h2 className="font-['Space_Grotesk'] font-black text-xl text-[#0F4C5C]">Face ID сканерлеуде...</h2>
                  <p className="text-sm text-[#66B2B2] mt-2">Камераға тікелей қараңыз.<br/>Жүйе сіздің тұлғаңызды тіркеп жатыр.</p>
                </div>
                <div className="flex justify-center gap-1.5">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[#BFE3E1] animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 z-50 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #0F4C5C, #1a6474)', borderBottom: '1px solid rgba(102,178,178,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="font-['Space_Grotesk'] font-black text-[10px] tracking-wider uppercase text-red-300">ТЖД</span>
          </div>
          <span className="font-['Space_Grotesk'] font-bold text-xs tracking-wider uppercase text-white/70 max-w-[200px] truncate">
            {lesson ? `${lesson.subject || ''} ${lesson.subject ? '·' : ''} ${lesson.title}` : 'Тест'}
          </span>
        </div>

        {timeLeft !== null && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-1.5 rounded-full"
            style={{ background: timeLeft < 300 ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="material-symbols-outlined text-red-400 text-lg">timer</span>
            <span className="font-['Space_Grotesk'] font-black text-xl text-red-400">{formatTime(timeLeft)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(102,178,178,0.12)', border: '1px solid rgba(102,178,178,0.25)' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: modelsLoaded ? '#22c55e' : '#f59e0b', fontVariationSettings: "'FILL' 1" }}>
              {modelsLoaded ? 'verified_user' : 'pending'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#BFE3E1]/80">
              {modelsLoaded ? 'AI Белсенді' : (loadingStatus || 'Жүктелуде...')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: aiStatus === 'ready' ? 'rgba(34,197,94,0.15)' : 'rgba(102,178,178,0.12)', border: `1px solid ${aiStatus === 'ready' ? 'rgba(34,197,94,0.3)' : 'rgba(102,178,178,0.25)'}` }}>
            <span className="material-symbols-outlined text-sm" style={{ color: aiStatus === 'ready' ? '#22c55e' : '#66B2B2', fontVariationSettings: "'FILL' 1" }}>computer</span>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: aiStatus === 'ready' ? '#22c55e' : '#66B2B2' }}>
              {aiStatus === 'ready' ? 'Офлайн AI' : 'AI жүктелуде'}
            </span>
          </div>
          {violations?.length > 0 && (
            <button onClick={() => setShowViolations(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
              <span className="text-red-300 text-[10px] font-black">{violations.length}</span>
            </button>
          )}
        </div>
      </header>

      {/* Anti-cheat warning banner */}
      <div className="flex items-center justify-center gap-3 py-2 px-4 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}>
        <span className="material-symbols-outlined text-white text-sm">security</span>
        <p className="text-xs font-bold uppercase tracking-tight text-white">
          Бетті ауыстырмаңыз · Барлық əрекеттер тіркеліп отыр · Камера белсенді
        </p>
      </div>

      {/* Alert toast */}
      {alertMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl"
          style={{ background: '#ef4444', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span className="material-symbols-outlined text-white text-sm">security</span>
          <span className="text-white font-black text-sm">{alertMsg}</span>
        </div>
      )}

      {/* Violations panel */}
      {showViolations && violations?.length > 0 && (
        <div className="fixed top-16 right-4 z-[150] w-72 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#0F4C5C', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="px-4 py-3 flex justify-between items-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <span className="text-red-300 font-black text-xs uppercase tracking-wider">Бұзушылықтар ({violations.length})</span>
            <button onClick={() => setShowViolations(false)}>
              <span className="material-symbols-outlined text-white/60 text-sm">close</span>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
            {violations.slice(0, 20).map((v, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: VIOLATION_COLORS[v.type] || VIOLATION_COLORS.default }} />
                <div>
                  <p className="text-white/80 text-xs">{v.message}</p>
                  <p className="text-white/30 text-[10px]">{v.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {/* Question area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #f0fafa 0%, #e8f7f6 100%)' }}>
          <div className="w-full max-w-[680px]">
            {/* Progress */}
            <div className="mb-7">
              <div className="flex justify-between items-center mb-2">
                <span className="font-['Space_Grotesk'] font-black text-sm uppercase tracking-widest text-[#0F4C5C]">
                  Сұрақ {currentQ + 1} / {total}
                </span>
                <span className="text-[#66B2B2] text-xs font-bold">{answered} жауап берілді</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: '#BFE3E1' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${((currentQ + 1) / total) * 100}%`, background: 'linear-gradient(90deg, #2F7F86, #0F4C5C)' }} />
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-3xl p-10 relative overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 8px 40px rgba(15,76,92,0.08)', border: '1px solid #BFE3E1' }}>
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ border: '24px solid #E6F4F3' }} />

              <div className="relative z-10">
                <span className="font-['Space_Grotesk'] text-6xl font-black block mb-2"
                  style={{ color: 'rgba(15,76,92,0.06)' }}>{String(currentQ + 1).padStart(2, '0')}</span>
                <h2 className="font-['Space_Grotesk'] text-xl font-black text-[#0F4C5C] mb-8 leading-tight">{q.text}</h2>

                {isOpen ? (
                  <textarea
                    value={openText}
                    onChange={e => setOpenText(e.target.value)}
                    rows={4}
                    placeholder="Жауабыңызды жазыңыз..."
                    className="w-full p-4 rounded-2xl text-sm font-medium resize-none outline-none"
                    style={{ border: '2px solid #BFE3E1', background: '#f8fdfc', color: '#0F4C5C' }}
                  />
                ) : (
                  <div className="space-y-3 mb-10">
                    {(q.options || []).map((opt, oi) => {
                      const letter = LETTERS[oi]
                      const selected = currentAnswer === letter
                      return (
                        <button key={oi} onClick={() => selectAnswer(letter)}
                          className="flex items-center w-full p-4 rounded-2xl text-[#0F4C5C] font-bold text-left transition-all hover:-translate-y-0.5"
                          style={selected ? {
                            border: '2px solid #2F7F86',
                            background: 'linear-gradient(135deg, rgba(47,127,134,0.08), rgba(15,76,92,0.04))',
                            boxShadow: '0 4px 16px rgba(47,127,134,0.12)',
                          } : { border: '2px solid #BFE3E1', background: '#f8fdfc' }}>
                          <span className="w-9 h-9 flex items-center justify-center rounded-xl mr-4 font-black text-sm flex-shrink-0 transition-all"
                            style={selected ? { background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)', color: '#fff' } : { background: '#E6F4F3', color: '#66B2B2' }}>
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex justify-between pt-6 border-t border-[#BFE3E1]">
                  <button onClick={goPrev} disabled={currentQ === 0}
                    className="px-6 py-3 rounded-2xl border-2 border-[#BFE3E1] text-[#2F7F86] font-bold text-sm hover:bg-[#E6F4F3] transition-all disabled:opacity-30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Алдыңғы
                  </button>
                  <button onClick={goNext}
                    className="px-8 py-3 rounded-2xl font-bold text-sm text-white flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)', boxShadow: '0 4px 14px rgba(47,127,134,0.3)' }}>
                    {currentQ === total - 1 ? 'Аяқтау' : 'Келесі'}
                    <span className="material-symbols-outlined text-sm">{currentQ === total - 1 ? 'flag' : 'arrow_forward'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right surveillance panel */}
        <aside className="w-[260px] flex flex-col gap-4 overflow-y-auto p-5 flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #0F4C5C 0%, #0a3a47 100%)', borderLeft: '1px solid rgba(102,178,178,0.1)' }}>
          {/* Live camera */}
          <div>
            <h3 className="font-['Space_Grotesk'] text-[9px] font-black text-[#BFE3E1]/50 tracking-[0.2em] uppercase mb-3">Live AI Monitor</h3>
            <div className="relative rounded-xl overflow-hidden aspect-video" style={{ background: '#000', border: '1px solid rgba(102,178,178,0.15)' }}>
              <video ref={videoRef} autoPlay muted playsInline
                className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              <canvas ref={canvasRef}
                className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)', opacity: 0.4 }} />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#66B2B2] text-4xl">videocam_off</span>
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cameraActive ? 'bg-red-400 animate-ping' : 'bg-gray-500'}`} />
                <span className="text-[8px] font-black text-white uppercase">{cameraActive ? 'REC' : 'ОФЛАЙН'}</span>
              </div>
              {metrics?.faceCount > 1 && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.85)' }}>
                  <span className="text-[8px] font-black text-white">{metrics.faceCount} БЕТ</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1">Эмоция</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm text-[#66B2B2]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {emotionIcon[metrics?.emotion] || 'sentiment_neutral'}
                </span>
                <div className="text-right">
                  <p className="text-xs font-['Space_Grotesk'] font-black text-[#BFE3E1]">{metrics?.emotionKz || '—'}</p>
                  <p className="text-[9px] text-[#BFE3E1]/50">{metrics?.emotionScore || 0}%</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Зейін</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm text-[#66B2B2]" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                <span className="text-xs font-['Space_Grotesk'] font-black"
                  style={{ color: (metrics?.attention || 0) >= 70 ? '#22c55e' : (metrics?.attention || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {metrics?.attention || 0}%
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Тұлға</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm" style={{ color: metrics?.faceVerified ? '#22c55e' : metrics?.faceEnrolled ? '#ef4444' : '#f59e0b', fontVariationSettings: "'FILL' 1" }}>
                  {metrics?.faceVerified ? 'verified_user' : metrics?.faceEnrolled ? 'warning' : 'face_unlock'}
                </span>
                <span className="text-xs font-['Space_Grotesk'] font-black"
                  style={{ color: metrics?.faceVerified ? '#22c55e' : metrics?.faceEnrolled ? '#ef4444' : '#f59e0b' }}>
                  {metrics?.faceVerified ? 'OK' : metrics?.faceEnrolled ? 'Сәйкес емес' : 'Оқыту...'}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl col-span-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Зейін деңгейі</p>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics?.attention || 0}%`, background: (metrics?.attention || 0) >= 70 ? '#22c55e' : (metrics?.attention || 0) >= 40 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </div>
          </div>

          {/* Question map */}
          <div>
            <h3 className="font-['Space_Grotesk'] text-[9px] font-black text-[#BFE3E1]/40 tracking-[0.2em] uppercase mb-3">Сұрақтар картасы</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, n) => {
                const done = answers[n] !== undefined
                const current = n === currentQ
                return (
                  <button key={n} onClick={() => { setCurrentQ(n); setOpenText(questions[n]?.type === 'open' ? (answers[n] || '') : '') }}
                    className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition-all"
                    style={current ? { border: '2px solid #66B2B2', color: '#66B2B2', boxShadow: '0 0 8px rgba(102,178,178,0.3)' }
                      : done ? { background: 'rgba(47,127,134,0.25)', border: '1px solid rgba(102,178,178,0.3)', color: '#BFE3E1' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
                    {String(n + 1).padStart(2, '0')}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <button onClick={() => setShowModal(true)}
              className="w-full font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#BFE3E1', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}>
              <span className="material-symbols-outlined text-sm">flag</span>
              Тестті аяқтау
            </button>
          </div>
        </aside>
      </main>

      {/* Finish modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)' }}>
          <div className="fixed inset-0 pointer-events-none animate-pulse" style={{ border: '16px solid rgba(239,68,68,0.1)' }} />
          <div className="relative w-full max-w-md rounded-3xl p-8 text-center"
            style={{ background: '#fff', border: '2px solid #fca5a5', boxShadow: '0 24px 80px rgba(239,68,68,0.12)' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: '#fef2f2', border: '2px solid #fca5a5' }}>
              <span className="material-symbols-outlined text-red-400 text-4xl">flag</span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-2xl font-black text-[#0F4C5C] mb-2">Тестті аяқтаймысыз?</h2>
            <p className="text-[#66B2B2] text-sm mb-4">
              {answered} / {total} сұраққа жауап берілді.
              {answered < total && <span className="text-amber-500 font-bold"> {total - answered} жауапсыз!</span>}
            </p>
            {violations?.length > 0 && (
              <div className="mb-4 p-3 rounded-xl text-left" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="text-xs font-black text-red-600">⚠ {violations.length} бұзушылық тіркелді — мұғалімге хабарланады</p>
              </div>
            )}
            {cameraActive && (!metrics?.faceEnrolled || !metrics?.faceVerified) && (
              <div className="mb-4 p-3 rounded-xl text-left flex items-center gap-2" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
                <span className="material-symbols-outlined text-sm text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>face_retouching_off</span>
                <p className="text-xs font-black text-orange-700">
                  {!metrics?.faceEnrolled
                    ? 'Face ID тіркелмеген — камераға тікелей қараңыз'
                    : 'Face ID расталмады — камераға тікелей қараңыз'}
                </p>
              </div>
            )}
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-[#BFE3E1] text-[#2F7F86] font-black text-sm hover:bg-[#E6F4F3] transition-all">
                Жалғастыру
              </button>
              <button onClick={handleFinish}
                disabled={submitting || (cameraActive && (!metrics?.faceEnrolled || !metrics?.faceVerified))}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}>
                {submitting ? 'Жіберілуде...'
                  : cameraActive && !metrics?.faceEnrolled ? '🔒 Face ID тіркелмеген'
                  : cameraActive && !metrics?.faceVerified ? '🔒 Face ID расталмады'
                  : 'Тапсыру'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
