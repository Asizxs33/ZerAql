import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password, full_name, role, school, teacher_code } = req.body
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Барлық өрістерді толтырыңыз' })
  }

  let classId = null;

  try {
    if (role === 'teacher') {
      if (teacher_code !== 'ZERAQL-2026') {
        return res.status(400).json({ error: 'Мұғалімнің тіркелу коды қате!' })
      }
    } else {
      if (teacher_code) { // This acts as class code from frontend
        const clsRes = await pool.query('SELECT id FROM classes WHERE code = $1', [teacher_code])
        if (!clsRes.rows[0]) return res.status(400).json({ error: 'Сынып коды табылмады!' })
        classId = clsRes.rows[0].id
      }
    }

    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role, school, class_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, full_name, role, school, class_id',
      [email, hash, full_name, role, school || null, classId]
    )
    const user = rows[0]
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ user, token })
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Бұл email тіркелген' })
    res.status(500).json({ error: e.message })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email және пароль қажет' })
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = rows[0]
    if (!user) return res.status(400).json({ error: 'Пайдаланушы табылмады' })
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(400).json({ error: 'Қате пароль' })
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const { password_hash, ...safeUser } = user
    res.json({ user: safeUser, token })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
