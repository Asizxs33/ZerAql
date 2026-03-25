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

dotenv.config()

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/lessons', lessonRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/monitoring', monitoringRoutes)
app.use('/api/classes', classesRoutes)
app.use('/api/ai', aiRoutes)

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// ── WebSocket (Socket.io) ──────────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
})

// Store connected teachers and their rooms
const teacherRooms = new Map() // teacherId → socket.id
const studentSessions = new Map() // studentId → latest metrics

io.on('connection', (socket) => {
  console.log('WS connect:', socket.id)

  // Teacher joins to monitor a class
  socket.on('teacher:join', ({ teacherId, classId }) => {
    const room = `class:${classId}`
    socket.join(room)
    teacherRooms.set(teacherId, { socketId: socket.id, room })
    socket.emit('teacher:joined', { room, students: Array.from(studentSessions.values()) })
    console.log(`Teacher ${teacherId} monitoring ${room}`)
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
  socket.on('student:violation', ({ studentId, studentName, classId, violation }) => {
    const room = `class:${classId}`
    socket.to(room).emit('student:violation', {
      studentId,
      studentName,
      violation,
      timestamp: new Date().toISOString(),
    })
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
