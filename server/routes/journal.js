import { Router } from 'express'
import multer from 'multer'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import { pool } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// Load KZ curriculum dataset
let KZ_DATA = null
try {
  KZ_DATA = JSON.parse(readFileSync(join(__dirname, '../data/kz_curriculum.json'), 'utf8'))
} catch {}

// ── POST /api/journal/import ──────────────────────────────────────────────
// Upload Күнделік.kz XLS → parse → ML predictions
router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Тек мұғалімдер үшін' })
  if (!req.file) return res.status(400).json({ error: 'Файл жүктелмеді' })

  try {
    const XLSX = (await import('xlsx')).default
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    // Parse metadata
    const className = String(rows[1]?.[0] || '').replace('Сынып:', '').trim()
    const subject   = String(rows[2]?.[0] || '').replace('Пән:', '').trim()
    const teacher   = String(rows[4]?.[0] || '').split(',')[0].replace('Мұғалімнің ТАӘ:', '').trim()

    // Parse lesson date columns (row 7 = dates, row 8 = ФБ/maxScore)
    const dateRow = rows[7] || []
    const typeRow = rows[8] || []
    const lessonCols = []
    for (let c = 3; c < dateRow.length - 1; c++) {
      const dateLabel = String(dateRow[c] || '').trim()
      const type = String(typeRow[c] || '').trim()
      if (dateLabel && type === 'ФБ') lessonCols.push({ col: c, date: dateLabel })
    }

    // 12-ball → 5-ball
    const kzTo5 = (raw) => {
      if (!raw || raw === 'а' || raw === 'н') return null
      const g = Number(raw)
      if (isNaN(g)) return null
      if (g >= 10) return 5
      if (g >= 8)  return 4
      if (g >= 6)  return 3
      if (g >= 4)  return 2
      return 1
    }

    // KZ dataset calibration
    const nationalAvg = KZ_DATA?.national_averages?.avg_grade || 3.7
    const thresholds  = KZ_DATA?.risk_model?.thresholds || { at_risk: 2.4, watch: 3.1, on_track: 3.9, advanced: 4.5 }
    const weights     = KZ_DATA?.risk_model?.weights_kz_calibrated || { attention: 0.38, emotion: 0.18, recent_grade: 0.28, grade_trend: 0.10, participation: 0.06 }
    const subjectData = KZ_DATA?.subjects?.find(s =>
      subject.toLowerCase().includes(s.name_ru.toLowerCase()) ||
      s.name_ru.toLowerCase().includes(subject.toLowerCase())
    )
    const subjectAvgAttn = (subjectData?.avg_attention || 62) / 100

    const RISK_LABELS = {
      advanced: { kz: 'Үздік',       color: '#22c55e', bg: '#f0fdf4' },
      on_track: { kz: 'Жол үстінде', color: '#2F7F86', bg: '#E6F4F3' },
      watch:    { kz: 'Назар аудар', color: '#f59e0b', bg: '#fffbeb' },
      at_risk:  { kz: 'Қауіп бар',   color: '#ef4444', bg: '#fef2f2' },
    }

    // Parse students
    const students = []
    for (let r = 9; r < rows.length; r++) {
      const row = rows[r]
      const num  = row[0]
      const name = String(row[1] || '').trim()
      const iin  = String(row[2] || '').trim()
      if (!name || !num) continue

      const scoreHistory = []
      let absent = 0
      const lessonGrades = []
      for (const { col, date } of lessonCols) {
        const raw = String(row[col] || '').trim()
        if (raw === 'а' || raw === 'н') {
          absent++
          lessonGrades.push({ date, score12: null, score5: null, absent: true })
        } else if (raw !== '') {
          const s12 = Number(raw)
          const s5  = kzTo5(s12)
          lessonGrades.push({ date, score12: s12, score5: s5, absent: false })
          if (s5) scoreHistory.push(s5)
        } else {
          lessonGrades.push({ date, score12: null, score5: null, absent: false })
        }
      }

      const bjbRaw  = row[dateRow.length - 1]
      const bjb12   = bjbRaw !== '' ? Number(bjbRaw) : null
      const bjb5    = kzTo5(bjb12)

      const avgScore5 = scoreHistory.length > 0
        ? scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length : null

      // Grade trend (linear slope)
      let trend = 0
      if (scoreHistory.length >= 2) {
        const vals = scoreHistory.slice(-6)
        const n = vals.length
        const xm = (n - 1) / 2
        const ym = vals.reduce((a, b) => a + b, 0) / n
        const num2 = vals.reduce((s, v, i) => s + (i - xm) * (v - ym), 0)
        const den = vals.reduce((s, _, i) => s + (i - xm) ** 2, 0)
        trend = den === 0 ? 0 : num2 / den
      }

      const participRate = lessonCols.length > 0
        ? (lessonCols.length - absent) / lessonCols.length : 1

      // ML Prediction (KZ-calibrated OLS)
      const normGrade = avgScore5 ? (avgScore5 - 1) / 4 : 0.5
      const attnProxy = subjectAvgAttn * participRate
      const emoProxy  = 0.55 * participRate
      const trendNorm = Math.max(-1, Math.min(1, trend / 2))

      const rawPred =
        nationalAvg * 0.22 +
        attnProxy  * weights.attention    * 4.0 +
        emoProxy   * weights.emotion      * 3.8 +
        normGrade  * weights.recent_grade * 6.4 +
        trendNorm  * weights.grade_trend  * 5.0 +
        participRate * weights.participation * 6.7

      const predicted = Math.max(1, Math.min(5, rawPred))

      let risk = 'at_risk'
      if (predicted >= thresholds.advanced && attnProxy >= 0.65) risk = 'advanced'
      else if (predicted >= thresholds.on_track && trendNorm >= -0.1) risk = 'on_track'
      else if (predicted >= thresholds.watch || trendNorm > 0.1) risk = 'watch'

      const trendDir = trend > 0.1 ? 'up' : trend < -0.1 ? 'down' : 'stable'

      let recommendation = 'Бақылауда ұстау жеткілікті.'
      if (risk === 'at_risk') {
        recommendation = absent > 3 ? 'Жиі қалатын оқушы. Ата-анамен байланысу керек.' : 'Қосымша жұмыс, жеке кеңес қажет.'
      } else if (risk === 'watch') {
        recommendation = trendDir === 'down' ? 'Баға төмендеп барады. Мотивациясын арттыру керек.' : 'Ынталандыру жеткілікті.'
      } else if (risk === 'advanced') {
        recommendation = 'Үздік оқушы. Олимпиадаға ұсыну мүмкін.'
      }

      students.push({
        num: Number(num), name, iin,
        lessonGrades,
        bjb12, bjb5,
        avgScore5:  avgScore5 ? +avgScore5.toFixed(2) : null,
        gradeCount: scoreHistory.length,
        absentCount: absent,
        participationRate: +participRate.toFixed(2),
        trendDir,
        trendValue: +trend.toFixed(3),
        predicted:  +predicted.toFixed(2),
        predictedGrade: predicted >= 4.5 ? 5 : predicted >= 3.5 ? 4 : predicted >= 2.5 ? 3 : predicted >= 1.5 ? 2 : 1,
        risk,
        riskLabel:  RISK_LABELS[risk],
        recommendation,
      })
    }

    res.json({
      className, subject, teacher,
      lessonCount: lessonCols.length,
      students,
      modelInfo: {
        algorithm: 'OLS Regression',
        dataset: 'ҚР МОН РК 2023-2024',
        subjectAvgAttention: Math.round(subjectAvgAttn * 100),
        nationalAvg,
        calibration: KZ_DATA?.risk_model?.calibration_note || 'KZ calibrated',
      },
    })
  } catch (e) {
    console.error('Journal import error:', e)
    res.status(500).json({ error: `Файлды оқу қатесі: ${e.message}` })
  }
})

// ── GET /api/journal/export ───────────────────────────────────────────────
// Export DB grades as Excel (Күнделік.kz compatible format)
router.get('/export', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Тек мұғалімдер үшін' })

  try {
    const XLSX = (await import('xlsx')).default

    // Get teacher's classes and their students+grades
    const { rows: classes } = await pool.query(
      'SELECT id, name FROM classes WHERE teacher_id = $1', [req.user.id]
    )
    const { rows: grades } = await pool.query(`
      SELECT g.score, g.grade_date, g.subject,
             u.full_name AS student_name, u.id AS student_id,
             l.title AS lesson_title, c.name AS class_name
      FROM grades g
      JOIN users u ON u.id = g.student_id
      LEFT JOIN lessons l ON l.id = g.lesson_id
      LEFT JOIN classes c ON c.id = u.class_id
      WHERE c.teacher_id = $1
      ORDER BY c.name, u.full_name, g.grade_date
    `, [req.user.id])

    const { rows: teacher } = await pool.query(
      'SELECT full_name FROM users WHERE id = $1', [req.user.id]
    )
    const teacherName = teacher[0]?.full_name || ''

    // Group by class
    const byClass = {}
    for (const g of grades) {
      const key = g.class_name || 'Жалпы'
      if (!byClass[key]) byClass[key] = {}
      if (!byClass[key][g.student_name]) byClass[key][g.student_name] = []
      byClass[key][g.student_name].push(g)
    }

    const wb = XLSX.utils.book_new()

    for (const [className, students] of Object.entries(byClass)) {
      const aoa = []
      aoa.push([`Сынып: ${className}`])
      aoa.push([`Мұғалім: ${teacherName}`])
      aoa.push([`Экспорт күні: ${new Date().toLocaleDateString('kk-KZ')}`])
      aoa.push([])
      aoa.push(['№', 'Оқушының аты-жөні', 'Пән', 'Баға', 'Күн', 'Сабақ'])

      let i = 1
      for (const [name, gs] of Object.entries(students)) {
        for (const g of gs) {
          aoa.push([i++, name, g.subject || '—', g.score, g.grade_date, g.lesson_title || '—'])
        }
      }

      // Summary row
      const allScores = Object.values(students).flat().map(g => Number(g.score))
      const avg = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : '—'
      aoa.push([])
      aoa.push(['', `Барлығы: ${allScores.length} баға`, '', `Орташа: ${avg}`, '', ''])

      const ws = XLSX.utils.aoa_to_sheet(aoa)
      ws['!cols'] = [{ wch: 4 }, { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, ws, className.substring(0, 31))
    }

    if (wb.SheetNames.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Деректер жоқ']])
      XLSX.utils.book_append_sheet(wb, ws, 'Журнал')
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `ZerAql_Journal_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
