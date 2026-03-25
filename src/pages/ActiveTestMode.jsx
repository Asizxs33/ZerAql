import { useState, useEffect, useRef } from 'react'
import { useGlobalProctoring } from '../context/ProctoringContext'
import { useStudentMonitoring } from '../hooks/useMonitoringSocket'

const answers = [
  { letter: 'A', text: 'x₁ = -3, x₂ = 0.5' },
  { letter: 'B', text: 'x₁ = 3, x₂ = -0.5' },
  { letter: 'C', text: 'x₁ = -1.5, x₂ = 1' },
  { letter: 'D', text: 'x₁ = 0.5, x₂ = 3' },
]

const VIOLATION_COLORS = {
  tab_switch: '#ef4444',
  face_missing: '#f59e0b',
  multiple_faces: '#ef4444',
  copy_paste: '#f59e0b',
  devtools_key: '#ef4444',
  devtools_open: '#ef4444',
  low_attention: '#f59e0b',
  phone_detected: '#ef4444',
  face_mismatch: '#ef4444',
  sleepy: '#f59e0b',
  extra_person: '#ef4444',
  default: '#66B2B2',
}

export default function ActiveTestMode() {
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(28 * 60 + 45)
  const [showViolations, setShowViolations] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const alertTimeout = useRef(null)
  const currentQ = 7
  const total = 20

  const { sendMetrics, sendViolation } = useStudentMonitoring({
    studentId: 'demo-student',
    studentName: 'Оқушы',
    classId: 'demo-class',
  })

  // Use the global proctoring context (shared camera session)
  const {
    videoRef,
    canvasRef,
    modelsLoaded,
    cameraActive,
    metrics,
    violations,
    loadingStatus,
    enrollFace,
  } = useGlobalProctoring() || {}

  // Show latest violation as toast
  const latestViolation = violations?.[0]
  const latestViolationId = latestViolation?.timestamp
  useEffect(() => {
    if (!latestViolation) return
    if (alertTimeout.current) clearTimeout(alertTimeout.current)
    setAlertMsg(latestViolation.message)
    alertTimeout.current = setTimeout(() => setAlertMsg(null), 3500)
    sendViolation(latestViolation)
  }, [latestViolationId])

  // Enroll face when camera + models ready (camera already started by global context)
  useEffect(() => {
    if (cameraActive && modelsLoaded && enrollFace) {
      setTimeout(() => enrollFace(), 2000)
    }
  }, [cameraActive, modelsLoaded])

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const emotionIcon = {
    happy: 'sentiment_very_satisfied',
    sad: 'sentiment_dissatisfied',
    angry: 'sentiment_very_dissatisfied',
    fearful: 'sentiment_stressed',
    surprised: 'sentiment_excited',
    neutral: 'sentiment_neutral',
    disgusted: 'sick',
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: '#f0fafa' }}>
      {/* Top bar */}
      <header className="h-14 flex items-center justify-between px-6 z-50 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #0F4C5C, #1a6474)', borderBottom: '1px solid rgba(102,178,178,0.15)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="font-['Space_Grotesk'] font-black text-[10px] tracking-wider uppercase text-red-300">ТЖД</span>
          </div>
          <span className="font-['Space_Grotesk'] font-bold text-xs tracking-wider uppercase text-white/70">
            Алгебра: Квадрат теңдеу
          </span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-1.5 rounded-full"
          style={{ background: timeLeft < 300 ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <span className="material-symbols-outlined text-red-400 text-lg">timer</span>
          <span className="font-['Space_Grotesk'] font-black text-xl text-red-400">{formatTime(timeLeft)}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(102,178,178,0.12)', border: '1px solid rgba(102,178,178,0.25)' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: modelsLoaded ? '#22c55e' : '#f59e0b', fontVariationSettings: "'FILL' 1" }}>
              {modelsLoaded ? 'verified_user' : 'pending'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#BFE3E1]/80">
              {modelsLoaded ? 'AI Белсенді' : loadingStatus}
            </span>
          </div>
          {violations.length > 0 && (
            <button onClick={() => setShowViolations(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
              <span className="material-symbols-outlined text-red-400 text-sm">warning</span>
              <span className="text-red-300 text-[10px] font-black">{violations.length}</span>
            </button>
          )}
        </div>
      </header>

      {/* Warning banner */}
      <div className="flex items-center justify-center gap-3 py-2 px-4 relative flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}>
        <span className="material-symbols-outlined text-white text-sm">warning</span>
        <p className="text-xs font-bold uppercase tracking-tight text-white">
          Бетті ауыстырмаңыз. Барлық əрекеттер тіркеліп отыр.
        </p>
      </div>

      {/* Alert toast */}
      {alertMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl"
          style={{ background: '#ef4444', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
          <span className="material-symbols-outlined text-white text-sm">security</span>
          <span className="text-white font-black text-sm">{alertMsg}</span>
        </div>
      )}

      {/* Violations panel */}
      {showViolations && violations.length > 0 && (
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
                  Сұрақ {currentQ} / {total}
                </span>
                <span className="text-[#66B2B2] text-xs font-bold">35% Орындалды</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: '#BFE3E1' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: '35%', background: 'linear-gradient(90deg, #2F7F86, #0F4C5C)' }} />
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-3xl p-10 relative overflow-hidden"
              style={{ background: '#fff', boxShadow: '0 8px 40px rgba(15,76,92,0.08)', border: '1px solid #BFE3E1' }}>
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full"
                style={{ border: '24px solid #E6F4F3' }} />

              <div className="relative z-10">
                <span className="font-['Space_Grotesk'] text-6xl font-black block mb-2"
                  style={{ color: 'rgba(15,76,92,0.06)' }}>07</span>
                <h2 className="font-['Space_Grotesk'] text-2xl font-black text-[#0F4C5C] mb-8 leading-tight">
                  Теңдеуді шешіңіз:{' '}
                  <span className="px-3 py-1 rounded-xl font-black"
                    style={{ background: 'rgba(191,227,225,0.4)', color: '#0F4C5C' }}>2x² + 5x - 3 = 0</span>
                </h2>

                <div className="space-y-3 mb-10">
                  {answers.map((a) => (
                    <button key={a.letter} onClick={() => setSelected(a.letter)}
                      className="flex items-center w-full p-4 rounded-2xl text-[#0F4C5C] font-bold text-left group transition-all hover:-translate-y-0.5"
                      style={selected === a.letter ? {
                        border: '2px solid #2F7F86',
                        background: 'linear-gradient(135deg, rgba(47,127,134,0.08), rgba(15,76,92,0.04))',
                        boxShadow: '0 4px 16px rgba(47,127,134,0.12)',
                      } : {
                        border: '2px solid #BFE3E1',
                        background: '#f8fdfc',
                      }}>
                      <span className="w-9 h-9 flex items-center justify-center rounded-xl mr-4 font-black text-sm transition-all flex-shrink-0"
                        style={selected === a.letter ? {
                          background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)',
                          color: '#fff',
                        } : {
                          background: '#E6F4F3',
                          color: '#66B2B2',
                        }}>
                        {a.letter}
                      </span>
                      <span>{a.text}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-6 border-t border-[#BFE3E1]">
                  <button className="px-6 py-3 rounded-2xl border-2 border-[#BFE3E1] text-[#2F7F86] font-bold text-sm hover:bg-[#E6F4F3] transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Алдыңғы
                  </button>
                  <button className="px-8 py-3 rounded-2xl font-bold text-sm text-white transition-all flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)', boxShadow: '0 4px 14px rgba(47,127,134,0.3)' }}>
                    Келесі
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right surveillance panel */}
        <aside className="w-[280px] flex flex-col gap-4 overflow-y-auto p-5 flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #0F4C5C 0%, #0a3a47 100%)', borderLeft: '1px solid rgba(102,178,178,0.1)' }}>
          {/* Live camera */}
          <div>
            <h3 className="font-['Space_Grotesk'] text-[9px] font-black text-[#BFE3E1]/50 tracking-[0.2em] uppercase mb-3">Live AI Monitor</h3>

            <div className="relative rounded-xl overflow-hidden aspect-video"
              style={{ background: '#000', border: '1px solid rgba(102,178,178,0.15)' }}>
              {/* Real video */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Canvas overlay for landmarks */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ transform: 'scaleX(-1)', opacity: 0.4 }}
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#66B2B2] text-4xl">videocam_off</span>
                </div>
              )}

              {/* REC badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cameraActive ? 'bg-red-400 animate-ping' : 'bg-gray-500'}`} />
                <span className="text-[8px] font-black text-white uppercase tracking-tighter">
                  {cameraActive ? 'REC 720P' : 'КАМЕРА ЖОҚ'}
                </span>
              </div>

              {/* Face count badge */}
              {metrics.faceCount > 0 && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded"
                  style={{ background: metrics.faceCount > 1 ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.8)' }}>
                  <span className="text-[8px] font-black text-white">{metrics.faceCount} БЕТ</span>
                </div>
              )}

              {/* Phone warning */}
              {metrics.phoneDetected && (
                <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded"
                  style={{ background: 'rgba(239,68,68,0.9)' }}>
                  <span className="text-[9px] font-black text-white">⚠ ТЕЛЕФОН АНЫҚТАЛДЫ</span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Emotion */}
            <div className="p-3 rounded-xl col-span-2"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1">Эмоция</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm text-[#66B2B2]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {emotionIcon[metrics.emotion] || 'sentiment_neutral'}
                </span>
                <div className="text-right">
                  <p className="text-xs font-['Space_Grotesk'] font-black text-[#BFE3E1]">{metrics.emotionKz}</p>
                  <p className="text-[9px] text-[#BFE3E1]/50">{metrics.emotionScore}%</p>
                </div>
              </div>
            </div>

            {/* Attention */}
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Зейін</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm text-[#66B2B2]" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                <span className="text-xs font-['Space_Grotesk'] font-black"
                  style={{ color: metrics.attention >= 70 ? '#22c55e' : metrics.attention >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {metrics.attention}%
                </span>
              </div>
            </div>

            {/* Pulse */}
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Пульс</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                <span className="text-xs font-['Space_Grotesk'] font-black text-white">
                  {metrics.pulse > 0 ? `${metrics.pulse} bpm` : '—'}
                </span>
              </div>
            </div>

            {/* Face verification */}
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Тұлға</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm" style={{ color: metrics.faceVerified ? '#22c55e' : '#f59e0b', fontVariationSettings: "'FILL' 1" }}>
                  {metrics.faceVerified ? 'person_check' : 'person_search'}
                </span>
                <span className="text-xs font-['Space_Grotesk'] font-black"
                  style={{ color: metrics.faceVerified ? '#22c55e' : '#f59e0b' }}>
                  {metrics.faceVerified ? 'OK' : 'Тексеру'}
                </span>
              </div>
            </div>

            {/* Blink rate */}
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[8px] text-[#BFE3E1]/40 font-black uppercase tracking-wider mb-1.5">Жыпылықтау</p>
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-sm text-[#BFE3E1]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {metrics.blinkRate > 25 ? 'warning' : 'eye_tracking'}
                </span>
                <span className="text-xs font-['Space_Grotesk'] font-black"
                  style={{ color: metrics.blinkRate > 25 ? '#f59e0b' : '#BFE3E1' }}>
                  {metrics.blinkRate}/мин
                </span>
              </div>
            </div>
          </div>

          {/* Attention bar */}
          <div className="px-1">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-[#BFE3E1]/40 font-black uppercase tracking-wider">Зейін деңгейі</span>
              <span className="text-[9px] font-black"
                style={{ color: metrics.attention >= 70 ? '#22c55e' : metrics.attention >= 40 ? '#f59e0b' : '#ef4444' }}>
                {metrics.attention >= 70 ? 'Жақсы' : metrics.attention >= 40 ? 'Орташа' : 'Төмен'}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${metrics.attention}%`,
                  background: metrics.attention >= 70 ? '#22c55e' : metrics.attention >= 40 ? '#f59e0b' : '#ef4444',
                }} />
            </div>
          </div>

          {/* Question map */}
          <div>
            <h3 className="font-['Space_Grotesk'] text-[9px] font-black text-[#BFE3E1]/40 tracking-[0.2em] uppercase mb-3">Сұрақтар картасы</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
                const done = n < currentQ
                const current = n === currentQ
                return (
                  <div key={n}
                    className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition-all"
                    style={
                      current ? {
                        border: '2px solid #66B2B2',
                        color: '#66B2B2',
                        boxShadow: '0 0 8px rgba(102,178,178,0.3)',
                      } : done ? {
                        background: 'rgba(47,127,134,0.25)',
                        border: '1px solid rgba(102,178,178,0.3)',
                        color: '#BFE3E1',
                      } : {
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.2)',
                      }
                    }>
                    {String(n).padStart(2, '0')}
                  </div>
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
          <div className="fixed inset-0 pointer-events-none animate-pulse"
            style={{ border: '16px solid rgba(239,68,68,0.15)' }} />

          <div className="relative w-full max-w-md rounded-3xl p-8 text-center"
            style={{ background: '#fff', border: '2px solid #fca5a5', boxShadow: '0 24px 80px rgba(239,68,68,0.12)' }}>
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-red-400" />

            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: '#fef2f2', border: '2px solid #fca5a5' }}>
              <span className="material-symbols-outlined text-red-400 text-4xl">warning</span>
            </div>

            <h2 className="font-['Space_Grotesk'] text-2xl font-black text-[#0F4C5C] mb-2">
              Тестті аяқтаймысыз?
            </h2>
            <p className="text-[#66B2B2] text-sm mb-4">
              {currentQ} / {total} сұраққа жауап берілді.
            </p>

            {violations.length > 0 && (
              <div className="mb-6 p-3 rounded-xl text-left"
                style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="text-xs font-black text-red-600 mb-1">⚠ {violations.length} бұзушылық тіркелді</p>
                <p className="text-[10px] text-red-500">Мұғалімге хабарланады</p>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-[#BFE3E1] text-[#2F7F86] font-black text-sm hover:bg-[#E6F4F3] transition-all">
                Жалғастыру
              </button>
              <button className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)' }}>
                Аяқтау
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
