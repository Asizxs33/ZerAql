import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.school, u.teacher_code, u.class_id, u.created_at,
              c.name AS class_name, c.code AS class_code
       FROM users u LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.id = $1`,
      [req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update own profile
router.put('/me', requireAuth, async (req, res) => {
  const { full_name, school } = req.body
  try {
    const { rows } = await pool.query(
      'UPDATE users SET full_name = COALESCE($1, full_name), school = COALESCE($2, school) WHERE id = $3 RETURNING id, email, full_name, role, school',
      [full_name || null, school || null, req.user.id]
    )
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Join class by code (student only)
router.post('/me/join-class', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Тек оқушылар үшін' })
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Сынып коды қажет' })
  try {
    const { rows } = await pool.query('SELECT id, name FROM classes WHERE code = $1', [code.toUpperCase()])
    if (!rows[0]) return res.status(404).json({ error: 'Бұл кодпен сынып табылмады' })
    await pool.query('UPDATE users SET class_id = $1 WHERE id = $2', [rows[0].id, req.user.id])
    res.json({ message: `"${rows[0].name}" сыныбына сәтті қосылдыңыз!`, class_name: rows[0].name })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Student's own analytics dashboard
router.get('/me/analytics', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Тек оқушылар үшін' })
  const id = req.user.id
  try {
    // Grades with lesson info
    const { rows: grades } = await pool.query(`
      SELECT g.*, l.title AS lesson_title, l.subject
      FROM grades g LEFT JOIN lessons l ON l.id = g.lesson_id
      WHERE g.student_id = $1 ORDER BY g.grade_date DESC
    `, [id])

    // Monitoring stats (last 200 records)
    const { rows: monitoring } = await pool.query(`
      SELECT attention, emotion, pulse, created_at FROM session_monitoring
      WHERE student_id = $1 ORDER BY created_at DESC LIMIT 200
    `, [id])

    // Weekly breakdown (last 7 days)
    const { rows: weeklyData } = await pool.query(`
      SELECT TO_CHAR(created_at, 'Dy') AS day,
             TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
             ROUND(AVG(attention))::int AS attention,
             ROUND(AVG(emotion))::int AS emotion,
             ROUND(AVG(pulse))::int AS pulse
      FROM session_monitoring
      WHERE student_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Dy'), TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY MIN(created_at)
    `, [id])

    // Ranking
    const { rows: ranking } = await pool.query(`
      SELECT student_id, ROUND(AVG(score) * 20)::int AS points
      FROM grades GROUP BY student_id ORDER BY points DESC
    `)
    const rank = ranking.findIndex(r => r.student_id === Number(id)) + 1

    const avgGrade = grades.length > 0
      ? (grades.reduce((s, g) => s + Number(g.score || 0), 0) / grades.length).toFixed(1) : 0
    const avgAttention = monitoring.length > 0
      ? Math.round(monitoring.reduce((s, m) => s + (m.attention || 0), 0) / monitoring.length) : 0
    const avgPulse = monitoring.length > 0
      ? Math.round(monitoring.reduce((s, m) => s + (m.pulse || 0), 0) / monitoring.filter(m => m.pulse > 0).length || 0) : 0

    res.json({
      stats: { avgGrade: Number(avgGrade), avgAttention, avgPulse, totalGrades: grades.length, rank: rank || '—', totalStudents: ranking.length },
      grades,
      monitoring,
      weeklyData,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/students', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.school, COALESCE(c.name, 'Сыныпсыз') as class_name
       FROM users u
       LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.role = 'student'
       ORDER BY u.full_name`
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Per-student analytics (for teacher view)
router.get('/students/:id/analytics', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Тек мұғалімдер үшін' })
  const studentId = req.params.id
  try {
    // 1. Student profile
    const { rows: [student] } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.school, COALESCE(c.name, 'Сыныпсыз') as class_name
       FROM users u LEFT JOIN classes c ON c.id = u.class_id
       WHERE u.id = $1 AND u.role = 'student'`, [studentId]
    )
    if (!student) return res.status(404).json({ error: 'Оқушы табылмады' })

    // 2. All grades for this student
    const { rows: grades } = await pool.query(
      `SELECT g.*, l.title AS lesson_title, l.subject
       FROM grades g LEFT JOIN lessons l ON l.id = g.lesson_id
       WHERE g.student_id = $1 ORDER BY g.grade_date DESC`, [studentId]
    )

    // 3. All monitoring data
    const { rows: monitoring } = await pool.query(
      `SELECT sm.*, l.title AS lesson_title
       FROM session_monitoring sm
       LEFT JOIN lessons l ON l.id = sm.lesson_id
       WHERE sm.student_id = $1 ORDER BY sm.created_at DESC
       LIMIT 500`, [studentId]
    )

    // 4. Recent lessons this student participated in (via grades or monitoring)
    const { rows: recentLessons } = await pool.query(
      `SELECT DISTINCT ON (l.id) l.id, l.title, l.subject, l.class_name, l.duration,
              l.created_at, g.score AS grade_score,
              COALESCE(mon.avg_attention, 0) AS avg_attention
       FROM lessons l
       LEFT JOIN grades g ON g.lesson_id = l.id AND g.student_id = $1
       LEFT JOIN LATERAL (
         SELECT ROUND(AVG(attention))::int AS avg_attention
         FROM session_monitoring WHERE student_id = $1 AND lesson_id = l.id
       ) mon ON true
       WHERE g.student_id = $1 OR EXISTS (
         SELECT 1 FROM session_monitoring WHERE student_id = $1 AND lesson_id = l.id
       )
       ORDER BY l.id, l.created_at DESC
       LIMIT 10`, [studentId]
    )

    // 5. Compute aggregated stats
    const avgGrade = grades.length > 0
      ? (grades.reduce((s, g) => s + Number(g.score || 0), 0) / grades.length).toFixed(1)
      : 0
    const avgAttention = monitoring.length > 0
      ? Math.round(monitoring.reduce((s, m) => s + (m.attention || 0), 0) / monitoring.length)
      : 0
    const avgEmotion = monitoring.length > 0
      ? Math.round(monitoring.reduce((s, m) => s + (m.emotion || 0), 0) / monitoring.length)
      : 0

    // 6. Weekly breakdown (last 7 days monitoring grouped by day)
    const { rows: weeklyData } = await pool.query(
      `SELECT TO_CHAR(created_at, 'Dy') AS day,
              TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
              ROUND(AVG(attention))::int AS attention,
              ROUND(AVG(emotion))::int AS emotion
       FROM session_monitoring
       WHERE student_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY TO_CHAR(created_at, 'Dy'), TO_CHAR(created_at, 'YYYY-MM-DD')
       ORDER BY MIN(created_at)`, [studentId]
    )

    // 7. Total tasks completed (lessons with grades)
    const totalTasks = grades.length
    const { rows: [{ count: totalLessons }] } = await pool.query('SELECT COUNT(*)::int AS count FROM lessons')

    // 8. Ranking among students
    const { rows: ranking } = await pool.query(
      `SELECT student_id, ROUND(AVG(score) * 20)::int AS points
       FROM grades GROUP BY student_id ORDER BY points DESC`
    )
    const rank = ranking.findIndex(r => r.student_id === Number(studentId)) + 1

    res.json({
      student,
      stats: {
        avgGrade: Number(avgGrade),
        avgAttention,
        avgEmotion,
        totalTasks,
        totalLessons,
        rank: rank || '—',
      },
      weeklyData,
      recentLessons,
      grades,
      monitoring,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        u.id, u.full_name, u.school,
        COALESCE(ROUND(AVG(g.score) * 20), 0)::int AS points,
        COUNT(g.id)::int AS total_grades
      FROM users u
      LEFT JOIN grades g ON g.student_id = u.id
      WHERE u.role = 'student'
      GROUP BY u.id, u.full_name, u.school
      ORDER BY points DESC, total_grades DESC
      LIMIT 50
    `)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
