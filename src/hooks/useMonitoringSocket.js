import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const WS_URL = 'https://zeraql.onrender.com'

// ── Student hook ──────────────────────────────────────────────────────────
export function useStudentMonitoring({ studentId, studentName, classId, enabled = true }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || !studentId || !classId) return

    const socket = io(WS_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('student:join', { studentId, studentName, classId })
    })

    socket.on('disconnect', () => setConnected(false))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, studentId, studentName, classId])

  const sendMetrics = useCallback((metrics) => {
    socketRef.current?.emit('student:metrics', {
      studentId,
      studentName,
      classId,
      metrics,
    })
  }, [studentId, studentName, classId])

  const sendViolation = useCallback((violation) => {
    socketRef.current?.emit('student:violation', {
      studentId,
      studentName,
      classId,
      violation,
    })
  }, [studentId, studentName, classId])

  return { connected, sendMetrics, sendViolation }
}

// ── Teacher hook ──────────────────────────────────────────────────────────
export function useTeacherMonitoring({ teacherId, classId, enabled = true }) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [students, setStudents] = useState({}) // studentId → data
  const [alerts, setAlerts] = useState([])
  const [violations, setViolations] = useState([])

  useEffect(() => {
    if (!enabled || !teacherId || !classId) return

    const socket = io(WS_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('teacher:join', { teacherId, classId })
    })

    socket.on('disconnect', () => setConnected(false))

    // Receive metrics from students
    socket.on('student:metrics', (data) => {
      setStudents(prev => ({
        ...prev,
        [data.studentId]: {
          ...data,
          lastSeen: Date.now(),
        },
      }))
    })

    // Receive alerts
    socket.on('student:alert', (alert) => {
      setAlerts(prev => [{ ...alert, id: Date.now() }, ...prev.slice(0, 49)])
    })

    // Receive violations
    socket.on('student:violation', (v) => {
      setViolations(prev => [{ ...v, id: Date.now() }, ...prev.slice(0, 99)])
    })

    // Student came online
    socket.on('student:online', ({ studentName }) => {
      setAlerts(prev => [{
        type: 'online',
        message: `${studentName} қосылды`,
        timestamp: new Date().toISOString(),
        id: Date.now(),
      }, ...prev.slice(0, 49)])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, teacherId, classId])

  return { connected, students, alerts, violations }
}
