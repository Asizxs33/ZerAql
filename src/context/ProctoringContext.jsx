import { createContext, useContext, useEffect, useRef } from 'react'
import { useProctoring } from '../hooks/useProctoring'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)

const STUDENT_ROUTES = ['/student', '/test', '/leaderboard', '/lessons', '/tasks', '/analytics', '/notifications', '/my-class', '/settings', '/profile']

export function ProctoringProvider({ children }) {
  const location = useLocation()
  const { user } = useAuth()

  const isStudent = user?.role === 'student'
  const isMonitored = isStudent && STUDENT_ROUTES.some(r => location.pathname.startsWith(r))
  const wasMonitored = useRef(false)

  const proctoring = useProctoring({ enabled: isMonitored })

  useEffect(() => {
    if (isMonitored && !wasMonitored.current) {
      proctoring.startCamera().catch(e => console.warn('Camera start failed:', e.message))
      wasMonitored.current = true
    } else if (!isMonitored && wasMonitored.current) {
      proctoring.stopCamera()
      wasMonitored.current = false
    }
  }, [isMonitored])

  return <Ctx.Provider value={proctoring}>{children}</Ctx.Provider>
}

export const useGlobalProctoring = () => useContext(Ctx)
