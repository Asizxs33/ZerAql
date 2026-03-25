import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProctoringProvider, useGlobalProctoring } from './context/ProctoringContext'
import FloatingCamera from './components/FloatingCamera'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import ActiveTestMode from './pages/ActiveTestMode'
import Leaderboard from './pages/Leaderboard'
import ElectronicJournal from './pages/ElectronicJournal'
import CreateLesson from './pages/CreateLesson'
import PostLessonAnalytics from './pages/PostLessonAnalytics'
import StudentAnalyticsTeacherView from './pages/StudentAnalyticsTeacherView'
import Classes from './pages/Classes'
import MyClass from './pages/MyClass'
import Tasks from './pages/Tasks'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import Profile from './pages/Profile'

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0fafa' }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin mx-auto" />
        <p className="text-[#66B2B2] font-bold text-sm">Жүктелуде...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'student' ? '/student' : '/teacher'} replace />
  }
  return children
}

// Global floating camera — shown on authenticated pages except full-screen test
function GlobalFloatingCamera() {
  const location = useLocation()
  const proctoring = useGlobalProctoring()

  // Hide only on pages that embed camera natively or don't need it
  const hidden = ['/', '/login', '/test', '/student'].includes(location.pathname)
  if (hidden || !proctoring) return null

  return (
    <FloatingCamera
      videoRef={proctoring.videoRef}
      canvasRef={proctoring.canvasRef}
      metrics={proctoring.metrics}
      modelsLoaded={proctoring.modelsLoaded}
      cameraActive={proctoring.cameraActive}
      violations={proctoring.violations}
      loadingStatus={proctoring.loadingStatus}
    />
  )
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/lessons" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/my-class" element={<ProtectedRoute role="student"><MyClass /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute role="student"><Tasks /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute role="student"><Analytics /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute role="student"><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/test" element={<ProtectedRoute><ActiveTestMode /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/classes" element={<ProtectedRoute role="teacher"><Classes /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute role="teacher"><ElectronicJournal /></ProtectedRoute>} />
        <Route path="/create-lesson" element={<ProtectedRoute role="teacher"><CreateLesson /></ProtectedRoute>} />
        <Route path="/teacher-analytics" element={<ProtectedRoute role="teacher"><PostLessonAnalytics /></ProtectedRoute>} />
        <Route path="/student-analytics/:studentId" element={<ProtectedRoute role="teacher"><StudentAnalyticsTeacherView /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating draggable camera widget — all authenticated pages */}
      <GlobalFloatingCamera />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProctoringProvider>
          <AppRoutes />
        </ProctoringProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
