import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { lesson_id, attention, emotion, pulse } = req.body
  try {
    const { rows } = await pool.query(
      'INSERT INTO session_monitoring (student_id, lesson_id, attention, emotion, pulse) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, lesson_id || null, attention ?? null, emotion ?? null, pulse ?? null]
    )
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/', requireAuth, async (req, res) => {
  const { lesson_id } = req.query
  try {
    const params = []
    let where = 'WHERE 1=1'
    if (lesson_id) { params.push(lesson_id); where += ` AND sm.lesson_id = $${params.length}` }
    if (req.user.role === 'student') { params.push(req.user.id); where += ` AND sm.student_id = $${params.length}` }

    const { rows } = await pool.query(`
      SELECT sm.*, u.full_name AS student_name
      FROM session_monitoring sm
      JOIN users u ON u.id = sm.student_id
      ${where}
      ORDER BY sm.created_at DESC
      LIMIT 200
    `, params)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Latest monitoring per student (for teacher live view)
router.get('/live', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (sm.student_id)
        sm.student_id, sm.attention, sm.emotion, sm.pulse, sm.created_at,
        u.full_name AS student_name
      FROM session_monitoring sm
      JOIN users u ON u.id = sm.student_id
      ORDER BY sm.student_id, sm.created_at DESC
    `)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
