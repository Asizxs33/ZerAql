import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    let rows
    if (req.user.role === 'teacher') {
      ;({ rows } = await pool.query(
        'SELECT * FROM lessons WHERE teacher_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      ))
    } else {
      ;({ rows } = await pool.query(`
        SELECT l.*, u.full_name AS teacher_name
        FROM lessons l
        JOIN users u ON u.id = l.teacher_id
        WHERE l.status = 'active'
        ORDER BY l.created_at DESC
      `))
    }
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.full_name AS teacher_name FROM lessons l JOIN users u ON u.id = l.teacher_id WHERE l.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Табылмады' })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const { title, subject, class_name, difficulty, duration, max_score, status, questions, lesson_type } = req.body
  if (!title) return res.status(400).json({ error: 'Тақырып қажет' })
  try {
    const { rows } = await pool.query(
      'INSERT INTO lessons (title, subject, class_name, teacher_id, difficulty, duration, max_score, status, questions, lesson_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [title, subject || null, class_name || null, req.user.id, difficulty ?? 50, duration ?? 45, max_score ?? 100, status ?? 'draft', JSON.stringify(questions || []), lesson_type || 'quiz']
    )
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  const { title, subject, class_name, difficulty, duration, max_score, status, questions, lesson_type } = req.body
  try {
    const { rows } = await pool.query(
      'UPDATE lessons SET title=$1, subject=$2, class_name=$3, difficulty=$4, duration=$5, max_score=$6, status=$7, questions=$8, lesson_type=$9 WHERE id=$10 AND teacher_id=$11 RETURNING *',
      [title, subject, class_name, difficulty, duration, max_score, status, JSON.stringify(questions || []), lesson_type || 'quiz', req.params.id, req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Табылмады' })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM lessons WHERE id=$1 AND teacher_id=$2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
