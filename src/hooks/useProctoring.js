import { useRef, useState, useEffect, useCallback } from 'react'
import * as faceapi from 'face-api.js'

const MODELS_URL = '/models'

const EMOTION_KZ = {
  neutral: 'Бейтарап',
  happy: 'Қуанышты',
  sad: 'Мұңды',
  angry: 'Ашулы',
  fearful: 'Қорқынышты',
  disgusted: 'Жиреніш',
  surprised: 'Таңқалған',
}

// ── Geometry helpers ──────────────────────────────────────────────────────

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function computeEAR(eye) {
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2.0 * dist(eye[0], eye[3]))
}

function estimateAttention(landmarks) {
  const pts = landmarks.positions
  const nose = pts[30]
  const chin = pts[8]
  const lEye = pts[36]
  const rEye = pts[45]
  const lMouth = pts[48]
  const rMouth = pts[54]

  const faceW = dist(lEye, rEye)
  if (faceW < 1) return 50

  const hAsym = Math.abs(dist(lEye, lMouth) - dist(rEye, rMouth)) / faceW
  const eyesMid = { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 }
  const totalH = dist(eyesMid, chin)
  const noseRatio = totalH > 0 ? dist(eyesMid, nose) / totalH : 0.5
  const vDev = Math.abs(noseRatio - 0.45) * 2

  return Math.round(Math.max(0, Math.min(100, (1 - hAsym * 1.5 - vDev * 0.8) * 100)))
}

// ── rPPG ─────────────────────────────────────────────────────────────────

function sampleGreen(canvas, box) {
  try {
    const ctx = canvas.getContext('2d')
    const sx = Math.max(0, Math.round(box.x + box.width * 0.3))
    const sy = Math.max(0, Math.round(box.y + box.height * 0.15))
    const sw = Math.max(1, Math.round(box.width * 0.4))
    const sh = Math.max(1, Math.round(box.height * 0.35))
    const d = ctx.getImageData(sx, sy, sw, sh).data
    let g = 0
    for (let i = 0; i < d.length; i += 4) g += d[i + 1]
    return { g: g / (d.length / 4), t: Date.now() }
  } catch { return null }
}

function estimatePulse(buf) {
  if (buf.length < 60) return 0
  const vals = buf.map(d => d.g)
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const centered = vals.map(v => v - mean)
  let crossings = 0
  for (let i = 1; i < centered.length; i++) {
    if (centered[i - 1] < 0 && centered[i] >= 0) crossings++
  }
  const dur = (buf[buf.length - 1].t - buf[0].t) / 1000
  if (dur < 1) return 0
  return Math.min(130, Math.max(50, Math.round((crossings / dur) * 60)))
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useProctoring({ enabled = true, onViolation, onMetricsUpdate } = {}) {
  // ─ Video element via callback ref (solves mount-order race condition) ─
  const [videoEl, setVideoEl] = useState(null)
  const videoRef = useCallback(node => setVideoEl(node), [])

  // Canvas uses a normal ref (no stream attachment needed)
  const canvasRef = useRef(null)
  const hiddenCanvas = useRef(null)

  const streamRef = useRef(null)
  const animRef = useRef(null)

  // Stable refs for values used inside the detect loop (avoids stale closures
  // and prevents detect callback from being recreated on every metrics update)
  const onViolationRef = useRef(onViolation)
  const onMetricsUpdateRef = useRef(onMetricsUpdate)
  useEffect(() => { onViolationRef.current = onViolation }, [onViolation])
  useEffect(() => { onMetricsUpdateRef.current = onMetricsUpdate }, [onMetricsUpdate])

  const rppgBuf = useRef([])
  const RPPG_SIZE = 180
  const lastPulseRef = useRef(0)

  const eyeClosedFrames = useRef(0)
  const lastBlinkTime = useRef(0)
  const blinkWindow = useRef([])

  const faceDescRef = useRef(null)
  const frameCountRef = useRef(0)
  const verifiedFramesRef = useRef(0)  // consecutive verified frames counter

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('Жүктелуде...')
  const [metrics, setMetrics] = useState({
    emotion: 'neutral', emotionKz: 'Бейтарап', emotionScore: 0,
    attention: 0, pulse: 0, blinkRate: 0,
    faceVerified: false, faceEnrolled: false, faceCount: 0,
    phoneDetected: false, faceCovered: false,
    estimatedAge: null,
  })
  const [violations, setViolations] = useState([])

  const addViolation = useCallback((v) => {
    const entry = { ...v, timestamp: new Date().toLocaleTimeString('kk-KZ') }
    setViolations(prev => [entry, ...prev.slice(0, 49)])
    onViolationRef.current?.(entry)
  }, [])

  // ── Load models ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      const tryLoad = async (name, loader) => {
        setLoadingStatus(`${name} жүктелуде...`)
        await loader()
      }

      try {
        // Try SSD MobileNet first (more accurate)
        await tryLoad('SSD MobileNet v1', () => faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL))
        if (cancelled) return
        await tryLoad('68 Landmark', () => faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL))
        if (cancelled) return
        await tryLoad('Эмоция (7 класс)', () => faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL))
        if (cancelled) return
        await tryLoad('Жас/Жыныс', () => faceapi.nets.ageGenderNet.loadFromUri(MODELS_URL))
        if (cancelled) return
        await tryLoad('Тұлға дескриптор', () => faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL))
        if (cancelled) return
        setModelsLoaded(true)
        setLoadingStatus('ML Дайын')
      } catch (e1) {
        console.warn('SSD failed, trying TinyFaceDetector:', e1.message)
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL)
          if (cancelled) return
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL)
          if (cancelled) return
          await faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL)
          if (cancelled) return
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL)
          if (!cancelled) {
            setModelsLoaded(true)
            setLoadingStatus('ML Дайын (lite)')
          }
        } catch (e2) {
          console.error('All models failed:', e2.message)
          if (!cancelled) setLoadingStatus('Модель қатесі')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [enabled])

  // COCO-SSD removed — it conflicts with face-api.js bundled TF.js (double backend registration).
  // Multiple-person detection is handled by face-api.js detectAllFaces (faceCount > 1 check below).

  // ── Camera start/stop ────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (streamRef.current) return streamRef.current // already running
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })
    streamRef.current = stream
    // Will be attached to video element via the effect below
    setCameraActive(true)
    if (!hiddenCanvas.current) hiddenCanvas.current = document.createElement('canvas')
    return stream
  }, [])

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  // ── KEY FIX: Attach stream to video element whenever either changes ───────
  useEffect(() => {
    if (!videoEl || !streamRef.current) return
    if (videoEl.srcObject === streamRef.current) return
    videoEl.srcObject = streamRef.current
    videoEl.play().catch(e => console.warn('video.play():', e))
  }, [videoEl, cameraActive])

  // ── Enroll face for verification ─────────────────────────────────────────
  const enrollFace = useCallback(async () => {
    if (!videoEl || !modelsLoaded) return false
    try {
      const det = await faceapi
        .detectSingleFace(videoEl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks().withFaceDescriptor()
      if (det) { faceDescRef.current = det.descriptor; return true }
    } catch { }
    return false
  }, [videoEl, modelsLoaded])

  // ── Detection loop ────────────────────────────────────────────────────────
  // NOTE: no state dependencies here — everything via refs to prevent restarts
  const detect = useCallback(async () => {
    const video = videoEl
    if (!video || video.readyState < 2) {
      animRef.current = requestAnimationFrame(detect)
      return
    }

    frameCountRef.current++

    const w = video.videoWidth
    const h = video.videoHeight
    if (w === 0 || h === 0) {
      animRef.current = requestAnimationFrame(detect)
      return
    }

    // Draw to hidden canvas for rPPG only
    const hc = hiddenCanvas.current
    if (hc) {
      hc.width = w; hc.height = h
      hc.getContext('2d').drawImage(video, 0, 0)
    }

    // Clear visible canvas — video is shown by <video> tag, canvas is overlay only
    const vc = canvasRef.current
    if (vc) {
      if (vc.width !== w) vc.width = w
      if (vc.height !== h) vc.height = h
      vc.getContext('2d').clearRect(0, 0, w, h)
    }

    try {
      // Choose detector based on what loaded
      const detectorOpts = faceapi.nets.ssdMobilenetv1.isLoaded
        ? new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5, maxResults: 4 })
        : new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })

      let query = faceapi.detectAllFaces(video, detectorOpts).withFaceLandmarks().withFaceExpressions()

      // Add optional models if loaded
      if (faceapi.nets.ageGenderNet.isLoaded) query = query.withAgeAndGender()
      if (faceapi.nets.faceRecognitionNet.isLoaded) query = query.withFaceDescriptors()

      const dets = await query
      const faceCount = dets.length

      if (faceCount === 0) {
        setMetrics(prev => ({ ...prev, faceCovered: true, attention: 0, faceCount: 0 }))
        if (frameCountRef.current % 30 === 0) {
          addViolation({ type: 'face_missing', message: 'Бет анықталмады' })
        }
        animRef.current = requestAnimationFrame(detect)
        return
      }

      if (faceCount > 1) {
        addViolation({ type: 'multiple_faces', message: `${faceCount} бет анықталды — бөтен адам тыйым салынған` })
      }

      const det = dets[0]
      const { expressions, landmarks, descriptor, age, gender } = det
      const box = det.detection.box

      // ── Emotion ────────────────────────────────────────────────────────
      const topEmotion = Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)
      const emotionScore = Math.round(topEmotion[1] * 100)

      // ── Attention (head pose) ───────────────────────────────────────────
      const attention = estimateAttention(landmarks)
      if (attention < 40 && frameCountRef.current % 60 === 0) {
        addViolation({ type: 'low_attention', message: `Зейін төмен: ${attention}%` })
      }

      // ── Eye blink ───────────────────────────────────────────────────────
      const lEye = landmarks.getLeftEye()
      const rEye = landmarks.getRightEye()
      const ear = (computeEAR(lEye) + computeEAR(rEye)) / 2

      if (ear < 0.22) {
        eyeClosedFrames.current++
        if (eyeClosedFrames.current >= 3 && Date.now() - lastBlinkTime.current > 250) {
          lastBlinkTime.current = Date.now()
          blinkWindow.current.push(Date.now())
        }
      } else {
        eyeClosedFrames.current = 0
      }
      blinkWindow.current = blinkWindow.current.filter(t => Date.now() - t < 60000)
      const blinkRate = blinkWindow.current.length

      // ── rPPG pulse ──────────────────────────────────────────────────────
      if (hc) {
        const sample = sampleGreen(hc, box)
        if (sample) {
          rppgBuf.current.push(sample)
          if (rppgBuf.current.length > RPPG_SIZE) rppgBuf.current.shift()
          const est = estimatePulse(rppgBuf.current)
          if (est > 0) lastPulseRef.current = est
        }
      }

      // ── Face verification ───────────────────────────────────────────────
      // Auto-enroll: first clear detection (score > 0.88) after frame 15
      let faceVerified = false
      if (descriptor) {
        if (!faceDescRef.current) {
          const score = det.detection.score
          if (score > 0.88 && frameCountRef.current > 15) {
            faceDescRef.current = descriptor
          }
          verifiedFramesRef.current = 0
          faceVerified = false
        } else {
          const dist = faceapi.euclideanDistance(faceDescRef.current, descriptor)
          const match = dist < 0.45  // tighter threshold (was 0.52)
          if (match) {
            verifiedFramesRef.current = Math.min(verifiedFramesRef.current + 1, 10)
          } else {
            verifiedFramesRef.current = 0  // reset on any mismatch
            if (frameCountRef.current % 60 === 0) {
              addViolation({ type: 'face_mismatch', message: 'Тұлға сәйкес емес — басқа адам болуы мүмкін' })
            }
          }
          // Only truly verified after 5 consecutive matching frames
          faceVerified = verifiedFramesRef.current >= 5
        }
      } else {
        // No face detected — reset consecutive counter
        verifiedFramesRef.current = 0
      }

      // ── Age check ───────────────────────────────────────────────────────
      const estimatedAge = age ? Math.round(age) : null
      if (estimatedAge && estimatedAge > 35 && frameCountRef.current % 120 === 0) {
        addViolation({ type: 'age_mismatch', message: `Жас сәйкес емес (~${estimatedAge})` })
      }

      const newMetrics = {
        emotion: topEmotion[0],
        emotionKz: EMOTION_KZ[topEmotion[0]] || topEmotion[0],
        emotionScore,
        attention,
        pulse: lastPulseRef.current || 0,
        blinkRate,
        faceVerified,
        faceEnrolled: !!faceDescRef.current,
        faceCount,
        phoneDetected: false,
        faceCovered: false,
        estimatedAge,
        gender: gender || null,
      }

      setMetrics(newMetrics)
      onMetricsUpdateRef.current?.(newMetrics)

      // Draw overlays to visible canvas
      if (vc) {
        const resized = faceapi.resizeResults(dets, { width: w, height: h })
        faceapi.draw.drawDetections(vc, resized)
        faceapi.draw.drawFaceLandmarks(vc, resized)
      }

      // Multiple-person detection is already handled above via faceCount > 1

    } catch (e) {
      console.warn('detect error:', e.message)
    }

    animRef.current = requestAnimationFrame(detect)
  }, [videoEl, addViolation]) // Only videoEl and addViolation — no state deps!

  // ── Start/stop loop when camera and models are ready ─────────────────────
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !videoEl) return
    if (animRef.current) cancelAnimationFrame(animRef.current)
    // Small delay to ensure video is playing
    const t = setTimeout(() => { detect() }, 500)
    return () => {
      clearTimeout(t)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [cameraActive, modelsLoaded, videoEl, detect])

  // ── Browser anti-cheat ───────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return

    const onVisibility = () => {
      if (document.hidden) addViolation({ type: 'tab_switch', message: 'Бетті ауыстырды' })
    }
    const onKeyDown = (e) => {
      const devtools = e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()))
      if (devtools) { e.preventDefault(); addViolation({ type: 'devtools_key', message: 'DevTools тосқауылданды' }) }
    }
    const onContextMenu = (_e) => {} // context menu allowed
    const onResize = () => {
      if (window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 200)
        addViolation({ type: 'devtools_open', message: 'DevTools ашылуы мүмкін' })
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [enabled, addViolation])

  return {
    videoRef,   // callback ref — attach to <video ref={videoRef}>
    canvasRef,  // normal ref  — attach to <canvas ref={canvasRef}>
    modelsLoaded,
    cameraActive,
    metrics,
    violations,
    loadingStatus,
    enrollFace,
    startCamera,
    stopCamera,
  }
}
