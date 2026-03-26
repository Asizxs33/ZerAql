import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server as SocketIO } from 'socket.io'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import lessonRoutes from './routes/lessons.js'
import gradeRoutes from './routes/grades.js'
import monitoringRoutes from './routes/monitoring.js'
import classesRoutes from './routes/classes.js'
import aiRoutes from './routes/ai.js'
import journalRoutes from './routes/journal.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/monitoring', monitoringRoutes)
app.use('/api/classes', classesRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/journal', journalRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// ── WebSocket (Socket.io) ──────────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: { 
    origin: (origin, callback) => callback(null, true), 
    methods: ['GET', 'POST'], 
    credentials: true 
  },
})

// Store connected teachers and their rooms
const teacherRooms = new Map() // teacherId → socket.id
const studentSessions = new Map() // studentId → latest metrics

io.on('connection', (socket) => {
  console.log('WS connect:', socket.id)

  // Teacher joins to monitor a class
  socket.on('teacher:join', ({ teacherId, classId }) => {
    // Always join personal teacher room (guaranteed delivery)
    socket.join(`teacher:${teacherId}`)
    if (classId) {
      socket.join(`class:${classId}`)
    }
    teacherRooms.set(teacherId, { socketId: socket.id, room: `teacher:${teacherId}` })
    socket.emit('teacher:joined', { room: `teacher:${teacherId}`, students: Array.from(studentSessions.values()) })
    console.log(`Teacher ${teacherId} joined teacher:${teacherId}${classId ? ` + class:${classId}` : ''}`)
  })

  // Student sends monitoring metrics
  socket.on('student:metrics', ({ studentId, studentName, classId, metrics }) => {
    const room = `class:${classId}`
    const data = {
      studentId,
      studentName,
      classId,
      metrics,
      timestamp: new Date().toISOString(),
    }
    studentSessions.set(studentId, data)

    // Forward to all teachers in that class
    socket.to(room).emit('student:metrics', data)

    // Auto-alert if attention < 40%
    if (metrics.attention < 40) {
      socket.to(room).emit('student:alert', {
        studentId,
        studentName,
        type: 'low_attention',
        message: `${studentName}: зейін төмен (${metrics.attention}%)`,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // Student reports a violation
  socket.on('student:violation', ({ studentId, studentName, classId, teacherId, violation }) => {
    const payload = { studentId, studentName, violation, timestamp: new Date().toISOString() }
    // Send to teacher's personal room (always works regardless of class assignment)
    if (teacherId) socket.to(`teacher:${teacherId}`).emit('student:violation', payload)
    // Also send to class room as fallback
    if (classId) socket.to(`class:${classId}`).emit('student:violation', payload)
    console.log(`Violation from ${studentName} → teacher:${teacherId}, class:${classId}`)
  })

  // Student joins a lesson session
  socket.on('student:join', ({ studentId, studentName, classId }) => {
    const room = `class:${classId}`
    socket.join(room)
    socket.to(room).emit('student:online', { studentId, studentName })
    console.log(`Student ${studentName} joined ${room}`)
  })

  socket.on('disconnect', () => {
    console.log('WS disconnect:', socket.id)
    studentSessions.forEach((data, id) => {
      if (data.socketId === socket.id) studentSessions.delete(id)
    })
  })
})

// Attach io to app so routes can use it
app.set('io', io)

const PORT = process.env.PORT || 3001

initDB()
  .then(() => httpServer.listen(PORT, () => console.log(`ZerAql API + WS → http://localhost:${PORT}`)))
  .catch(e => { console.error('DB init failed:', e.message); process.exit(1) })
