import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const { student_id } = req.query
      if (student_id) {
        const { rows } = await pool.query(`
          SELECT g.*, u.full_name AS student_name, l.title AS lesson_title
          FROM grades g
          JOIN users u ON u.id = g.student_id
          LEFT JOIN lessons l ON l.id = g.lesson_id
          WHERE g.student_id = $1
          ORDER BY g.grade_date DESC, g.created_at DESC
        `, [student_id])
        return res.json(rows)
      }
      // Return all grades for teacher's students (students in teacher's classes)
      const { rows } = await pool.query(`
        SELECT g.*, u.full_name AS student_name, l.title AS lesson_title
        FROM grades g
        JOIN users u ON u.id = g.student_id
        LEFT JOIN classes c ON c.id = u.class_id
        LEFT JOIN lessons l ON l.id = g.lesson_id
        WHERE c.teacher_id = $1 OR l.teacher_id = $1
        ORDER BY g.grade_date DESC, g.created_at DESC
      `, [req.user.id])
      res.json(rows)
    } else {
      const { rows } = await pool.query(`
        SELECT g.*, l.title AS lesson_title, l.subject
        FROM grades g
        LEFT JOIN lessons l ON l.id = g.lesson_id
        WHERE g.student_id = $1
        ORDER BY g.grade_date DESC
      `, [req.user.id])
      res.json(rows)
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const { student_id, lesson_id, subject, score, grade_date } = req.body
  // Students can submit their own grade (self-assessment after test)
  const effectiveStudentId = req.user.role === 'student' ? req.user.id : student_id
  if (!effectiveStudentId || score === undefined) return res.status(400).json({ error: 'student_id және score қажет' })
  try {
    const { rows } = await pool.query(
      'INSERT INTO grades (student_id, lesson_id, subject, score, grade_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [effectiveStudentId, lesson_id || null, subject || null, score, grade_date || new Date().toISOString().split('T')[0]]
    )
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM grades WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
