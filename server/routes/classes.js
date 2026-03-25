import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Оқушының өз сыныбын алу
router.get('/my', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Тек оқушылар үшін' })
  try {
    const { rows: userRows } = await pool.query('SELECT class_id FROM users WHERE id = $1', [req.user.id])
    const classId = userRows[0]?.class_id
    if (!classId) return res.status(404).json({ error: 'Сынып тағайындалмаған' })

    const { rows: classRows } = await pool.query(`
      SELECT c.*, u.full_name as teacher_name, u.email as teacher_email 
      FROM classes c 
      JOIN users u ON c.teacher_id = u.id 
      WHERE c.id = $1
    `, [classId])
    
    if (!classRows[0]) return res.status(404).json({ error: 'Сынып табылмады' })
    const classInfo = classRows[0]

    const { rows: students } = await pool.query(`
      SELECT id, full_name, email, school 
      FROM users 
      WHERE class_id = $1 AND role = 'student'
      ORDER BY full_name
    `, [classId])

    res.json({ classInfo, students })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// Барлық сыныптарды алу (мұғалім үшін)
router.get('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Тек мұғалімдер үшін' })
  try {
    const { rows } = await pool.query(
      'SELECT *, (SELECT COUNT(*) FROM users WHERE class_id = classes.id) as student_count FROM classes WHERE teacher_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Жаңа сынып қосу
router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Тек мұғалімдер үшін' })
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Сынып атауын жазыңыз' })

  // Генерациялау 6 таңбалы код
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  
  try {
    const { rows } = await pool.query(
      'INSERT INTO classes (name, code, teacher_id) VALUES ($1,$2,$3) RETURNING *',
      [name, code, req.user.id]
    )
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Оқушыларды сынып бойынша алу
router.get('/:id/students', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.school,
              sm.attention, sm.emotion, sm.pulse, sm.created_at as last_active
       FROM users u
       LEFT JOIN LATERAL (
         SELECT attention, emotion, pulse, created_at
         FROM session_monitoring
         WHERE student_id = u.id
         ORDER BY created_at DESC LIMIT 1
       ) sm ON true
       WHERE u.class_id = $1 AND u.role = 'student'
       ORDER BY u.full_name`,
      [req.params.id]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
