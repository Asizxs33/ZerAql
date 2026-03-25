import { useRef, useState, useEffect, useCallback } from 'react'

const EMOTION_ICON = {
  happy: 'sentiment_very_satisfied',
  sad: 'sentiment_dissatisfied',
  angry: 'sentiment_very_dissatisfied',
  fearful: 'sentiment_stressed',
  surprised: 'sentiment_excited',
  neutral: 'sentiment_neutral',
  disgusted: 'sick',
}

export default function FloatingCamera({
  videoRef,
  canvasRef,
  metrics = {},
  modelsLoaded = false,
  cameraActive = false,
  violations = [],
  loadingStatus = '',
}) {
  const [pos, setPos] = useState({ x: null, y: null })
  const [minimized, setMinimized] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)

  const widgetRef = useRef(null)
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)
  const rafRef = useRef(null)
  const pendingPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setPos({ x: window.innerWidth - 300, y: window.innerHeight - 260 })
  }, [])

  const startDrag = useCallback((clientX, clientY) => {
    const rect = widgetRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top }
    dragging.current = true
    hasMoved.current = false
  }, [])

  const moveDrag = useCallback((clientX, clientY) => {
    if (!dragging.current) return
    hasMoved.current = true
    const el = widgetRef.current
    if (!el) return
    const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, clientX - dragOffset.current.x))
    const y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, clientY - dragOffset.current.y))
    pendingPos.current = { x, y }
    // Direct DOM move — zero React re-renders during drag
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (widgetRef.current) {
          widgetRef.current.style.left = pendingPos.current.x + 'px'
          widgetRef.current.style.top  = pendingPos.current.y + 'px'
        }
        rafRef.current = null
      })
    }
  }, [])

  const endDrag = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    // Sync React state only once on release
    if (hasMoved.current) setPos(pendingPos.current)
  }, [])

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }, [startDrag])

  useEffect(() => {
    const onMove = (e) => moveDrag(e.clientX, e.clientY)
    const onUp = () => endDrag()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [moveDrag, endDrag])

  // ── Touch events ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0]
    startDrag(t.clientX, t.clientY)
  }, [startDrag])

  useEffect(() => {
    const onMove = (e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) }
    const onEnd = () => endDrag()
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [moveDrag, endDrag])

  // ── Click vs drag: only toggle minimized if user didn't drag ─────────────
  const handleMinimizedClick = useCallback(() => {
    if (!hasMoved.current) setMinimized(false)
  }, [])

  if (pos.x === null) return null

  const attention = metrics.attention ?? 0
  const attColor = attention >= 70 ? '#22c55e' : attention >= 40 ? '#f59e0b' : '#ef4444'
  const latestViolation = violations[0]

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        userSelect: 'none',
        willChange: 'left, top',
        filter: 'drop-shadow(0 8px 32px rgba(15,76,92,0.28))',
      }}
    >
      {/* ── MINIMIZED: draggable circle ────────────────────────────────── */}
      {minimized ? (
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onMouseUp={handleMinimizedClick}
          onTouchEnd={handleMinimizedClick}
          style={{
            width: 56, height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0F4C5C, #2F7F86)',
            border: '2px solid rgba(102,178,178,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: dragging.current ? 'grabbing' : 'grab',
            position: 'relative',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: '#fff', fontSize: 26, fontVariationSettings: "'FILL' 1", pointerEvents: 'none' }}
          >
            videocam
          </span>
          {violations.length > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: '#fff',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: 10, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
              pointerEvents: 'none',
            }}>
              {violations.length > 9 ? '9+' : violations.length}
            </div>
          )}
          {/* Attention ring */}
          <svg style={{ position: 'absolute', inset: -3, width: 62, height: 62, pointerEvents: 'none' }}>
            <circle cx="31" cy="31" r="28"
              fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle cx="31" cy="31" r="28"
              fill="none" stroke={attColor} strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 28 * attention / 100} ${2 * Math.PI * 28}`}
              strokeLinecap="round"
              transform="rotate(-90 31 31)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
        </div>
      ) : (
        /* ── FULL WIDGET ──────────────────────────────────────────────── */
        <div style={{
          width: 280,
          borderRadius: 20,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0a2e38 0%, #0F4C5C 100%)',
          border: '1px solid rgba(102,178,178,0.2)',
        }}>
          {/* Header — drag handle */}
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.25)',
              cursor: dragging.current ? 'grabbing' : 'grab',
              borderBottom: '1px solid rgba(102,178,178,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
              <span className="material-symbols-outlined" style={{ color: 'rgba(191,227,225,0.4)', fontSize: 14 }}>
                drag_indicator
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: cameraActive ? '#ef4444' : '#555',
                  boxShadow: cameraActive ? '0 0 6px #ef4444' : 'none',
                }} />
                <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(191,227,225,0.7)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  {cameraActive ? 'Live Monitor' : (loadingStatus || 'Камера')}
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {/* Toggle metrics */}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setShowMetrics(v => !v)}
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(191,227,225,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {showMetrics ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {/* Minimize */}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setMinimized(true)}
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(191,227,225,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove</span>
              </button>
            </div>
          </div>

          {/* Camera feed */}
          <div style={{ position: 'relative', aspectRatio: '4/3', background: '#000' }}>
            <video
              ref={videoRef}
              autoPlay muted playsInline
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: cameraActive ? 'block' : 'none',
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                transform: 'scaleX(-1)', opacity: 0.7, pointerEvents: 'none',
                display: cameraActive ? 'block' : 'none',
              }}
            />

            {!cameraActive && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ color: '#2F7F86', fontSize: 38, fontVariationSettings: "'FILL' 1" }}>
                  {modelsLoaded ? 'videocam_off' : 'pending'}
                </span>
                <span style={{ fontSize: 10, color: 'rgba(191,227,225,0.5)', fontWeight: 700, textAlign: 'center', padding: '0 16px' }}>
                  {loadingStatus || 'Камера күтілуде...'}
                </span>
              </div>
            )}

            {cameraActive && (
              <>
                {/* Corner brackets */}
                {[
                  { top: 8, left: 8, borderTop: '2px solid rgba(102,178,178,0.7)', borderLeft: '2px solid rgba(102,178,178,0.7)', borderRadius: '4px 0 0 0' },
                  { top: 8, right: 8, borderTop: '2px solid rgba(102,178,178,0.7)', borderRight: '2px solid rgba(102,178,178,0.7)', borderRadius: '0 4px 0 0' },
                  { bottom: 8, left: 8, borderBottom: '2px solid rgba(102,178,178,0.7)', borderLeft: '2px solid rgba(102,178,178,0.7)', borderRadius: '0 0 0 4px' },
                  { bottom: 8, right: 8, borderBottom: '2px solid rgba(102,178,178,0.7)', borderRight: '2px solid rgba(102,178,178,0.7)', borderRadius: '0 0 4px 0' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: 16, height: 16, pointerEvents: 'none', ...s }} />
                ))}

                {/* Attention bottom bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, pointerEvents: 'none',
                  background: `linear-gradient(90deg, ${attColor} ${attention}%, rgba(255,255,255,0.08) ${attention}%)`,
                  transition: 'all 0.5s',
                }} />

                {/* Face count */}
                {(metrics.faceCount ?? 0) > 0 && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: (metrics.faceCount ?? 0) > 1 ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.8)',
                    borderRadius: 6, padding: '2px 6px',
                    fontSize: 9, fontWeight: 900, color: '#fff',
                    pointerEvents: 'none',
                  }}>
                    {metrics.faceCount} бет
                  </div>
                )}
              </>
            )}
          </div>

          {/* Metrics */}
          {showMetrics && (
            <div style={{ padding: '8px 10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {[
                  { label: 'Зейін', value: cameraActive ? `${attention}%` : '—', icon: 'visibility', color: cameraActive ? attColor : '#66B2B2' },
                  { label: 'Эмоция', value: cameraActive ? (metrics.emotionKz || 'Бейтарап') : '—', icon: EMOTION_ICON[metrics.emotion] || 'sentiment_neutral', color: '#f59e0b', small: true },
                  { label: 'Пульс', value: cameraActive && (metrics.pulse ?? 0) > 0 ? `${metrics.pulse} bpm` : '—', icon: 'favorite', color: '#ef4444' },
                  { label: 'Тұлға', value: cameraActive ? (metrics.faceVerified ? 'Расталды ✓' : metrics.faceCount > 0 ? 'Тіркелуде...' : '—') : '—', icon: metrics.faceVerified ? 'person_check' : 'face_unlock', color: metrics.faceVerified ? '#22c55e' : '#66B2B2', small: true },
                ].map((m) => (
                  <div key={m.label} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '6px 8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 8, color: 'rgba(191,227,225,0.4)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: m.small ? 9 : 11, fontWeight: 900, color: m.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {m.value}
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: m.color, fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                      {m.icon}
                    </span>
                  </div>
                ))}
              </div>

              {cameraActive && (
                <div style={{ marginTop: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: 'rgba(191,227,225,0.4)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Зейін деңгейі
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 900, color: attColor }}>
                      {attention >= 70 ? 'Жақсы' : attention >= 40 ? 'Орташа' : 'Төмен'}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${attention}%`,
                      background: `linear-gradient(90deg, ${attColor}, ${attColor}99)`,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              )}

              {latestViolation && (
                <div style={{
                  marginTop: 7, background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8, padding: '5px 8px',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444', fontSize: 12, flexShrink: 0 }}>warning</span>
                  <span style={{ fontSize: 9, color: 'rgba(239,68,68,0.9)', fontWeight: 700, lineHeight: 1.3 }}>
                    {latestViolation.message}
                  </span>
                </div>
              )}

              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: modelsLoaded ? '#22c55e' : '#f59e0b' }} />
                <span style={{ fontSize: 8, color: 'rgba(191,227,225,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {modelsLoaded ? 'SSD MobileNet · ML Белсенді' : loadingStatus}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
