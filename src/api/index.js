const BASE = '/api'

async function req(path, opts = {}) {
  const token = localStorage.getItem('zeraql_token')
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Қате орын алды')
  return data
}

export const api = {
  // Auth
  login: (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => req('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getMe: () => req('/users/me'),
  updateMe: (data) => req('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  joinClass: (code) => req('/users/me/join-class', { method: 'POST', body: JSON.stringify({ code }) }),
  getMyAnalytics: () => req('/users/me/analytics'),
  getStudents: () => req('/users/students'),
  getLeaderboard: () => req('/users/leaderboard'),

  // Classes
  getClasses: () => req('/classes'),
  getMyClass: () => req('/classes/my'),
  createClass: (data) => req('/classes', { method: 'POST', body: JSON.stringify(data) }),
  getClassStudents: (id) => req(`/classes/${id}/students`),

  // Lessons
  getLessons: () => req('/lessons'),
  createLesson: (data) => req('/lessons', { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (id, data) => req(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLesson: (id) => req(`/lessons/${id}`, { method: 'DELETE' }),

  // Grades
  getGrades: (studentId) => req(`/grades${studentId ? `?student_id=${studentId}` : ''}`),
  addGrade: (data) => req('/grades', { method: 'POST', body: JSON.stringify(data) }),
  deleteGrade: (id) => req(`/grades/${id}`, { method: 'DELETE' }),

  // Monitoring
  saveMonitoring: (data) => req('/monitoring', { method: 'POST', body: JSON.stringify(data) }),
  getMonitoring: (lessonId) => req(`/monitoring${lessonId ? `?lesson_id=${lessonId}` : ''}`),
  getLiveMonitoring: () => req('/monitoring/live'),

  // AI (GPT-4o-mini through server — API key is NEVER exposed to frontend)
  getAIRecommendations: (data) => req('/ai/recommendations', { method: 'POST', body: JSON.stringify(data) }),
  generateLessonQuestions: (data) => req('/ai/lesson-questions', { method: 'POST', body: JSON.stringify(data) }),
  getStudentFeedback: (data) => req('/ai/student-feedback', { method: 'POST', body: JSON.stringify(data) }),

  // Student analytics (teacher view)
  getStudentAnalytics: (studentId) => req(`/users/students/${studentId}/analytics`),
}
