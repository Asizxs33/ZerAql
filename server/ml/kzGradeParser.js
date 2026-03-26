/**
 * Күнделік.kz XLS Parser
 * Parses the standard Kazakhstani electronic journal export format
 * Grade scale: 1–12 (KZ) → converted to 1–5 (ZerAql)
 */

// 12-ball → 5-ball conversion (МОН РК standard)
export function kzTo5(grade) {
  if (!grade || grade === 'а' || grade === 'н') return null // absent
  const g = Number(grade)
  if (isNaN(g)) return null
  if (g >= 10) return 5
  if (g >= 8)  return 4
  if (g >= 6)  return 3
  if (g >= 4)  return 2
  return 1
}

/**
 * Parse Күнделік.kz XLS buffer
 * Returns { className, subject, teacher, dates, students }
 */
export function parseKundeligXLS(workbook) {
  const XLSX = (await import('xlsx')).default
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  // Parse header metadata
  const className = String(rows[1]?.[0] || '').replace('Сынып:', '').trim()
  const subject   = String(rows[2]?.[0] || '').replace('Пән:', '').trim()
  const teacher   = String(rows[4]?.[0] || '').replace('Мұғалімнің ТАӘ:', '').trim()

  // Find data rows (student rows start after row 8)
  // Row 6: month headers, Row 7: date+group, Row 8: type+maxScore
  const dateRow   = rows[7] || []
  const typeRow   = rows[8] || []

  // Build lesson columns (skip cols 0,1,2 = №, name, ID; skip last = БЖБ)
  const lessonCols = []
  for (let c = 3; c < dateRow.length - 1; c++) {
    const dateLabel = String(dateRow[c] || '').trim()
    const type = String(typeRow[c] || '').trim()
    const maxScore = Number(typeRow[c]) || 12
    if (dateLabel && type === 'ФБ') {
      lessonCols.push({ col: c, date: dateLabel, maxScore })
    }
  }

  // Parse student rows
  const students = []
  for (let r = 9; r < rows.length; r++) {
    const row = rows[r]
    const num  = row[0]
    const name = String(row[1] || '').trim()
    const iin  = String(row[2] || '').trim()
    if (!name || !num) continue

    const grades = []
    let absent = 0
    for (const { col, date } of lessonCols) {
      const raw = String(row[col] || '').trim()
      if (raw === 'а' || raw === 'н') {
        absent++
        grades.push({ date, raw: null, score5: null, absent: true })
      } else if (raw !== '') {
        const score12 = Number(raw)
        grades.push({ date, raw: score12, score5: kzTo5(score12), absent: false })
      }
    }

    // БЖБ (last column)
    const bjbRaw = row[dateRow.length - 1]
    const bjbScore = bjbRaw !== '' ? Number(bjbRaw) : null

    const scored = grades.filter(g => g.score5 !== null)
    const avgScore5 = scored.length > 0
      ? scored.reduce((s, g) => s + g.score5, 0) / scored.length
      : null

    // Grade trend (slope of last 5 grades)
    let trend = 0
    if (scored.length >= 2) {
      const vals = scored.slice(-5).map(g => g.score5)
      const n = vals.length
      const xm = (n - 1) / 2
      const ym = vals.reduce((a, b) => a + b, 0) / n
      const num2 = vals.reduce((s, v, i) => s + (i - xm) * (v - ym), 0)
      const den = vals.reduce((s, _, i) => s + (i - xm) ** 2, 0)
      trend = den === 0 ? 0 : num2 / den
    }

    const participationRate = lessonCols.length > 0
      ? (lessonCols.length - absent) / lessonCols.length
      : 1

    students.push({
      num: Number(num),
      name,
      iin,
      grades,
      bjbScore,
      bjbScore5: kzTo5(bjbScore),
      avgScore5: avgScore5 ? +avgScore5.toFixed(2) : null,
      avgScore12: scored.length > 0
        ? +(scored.reduce((s, g) => s + g.raw, 0) / scored.length).toFixed(1)
        : null,
      gradeCount: scored.length,
      absentCount: absent,
      participationRate: +participationRate.toFixed(2),
      trend: +trend.toFixed(3),
      trendDir: trend > 0.1 ? 'up' : trend < -0.1 ? 'down' : 'stable',
    })
  }

  return { className, subject, teacher, lessonCount: lessonCols.length, students }
}

/**
 * Run ML prediction on parsed Күнделік data (no DB needed)
 * Uses KZ curriculum dataset for calibration
 */
export function predictFromKundelig(parsed, kzData) {
  const nationalAvg = kzData?.national_averages?.avg_grade || 3.7
  const thresholds  = kzData?.risk_model?.thresholds || { at_risk: 2.4, watch: 3.1, on_track: 3.9, advanced: 4.5 }
  const weights     = kzData?.risk_model?.weights_kz_calibrated || {
    attention: 0.38, emotion: 0.18, recent_grade: 0.28, grade_trend: 0.10, participation: 0.06
  }

  // Find subject avg from KZ dataset
  const subjectData = kzData?.subjects?.find(s =>
    s.name_ru.toLowerCase().includes(parsed.subject.toLowerCase()) ||
    s.name_kz.toLowerCase().includes(parsed.subject.toLowerCase()) ||
    parsed.subject.toLowerCase().includes(s.name_ru.toLowerCase())
  )
  const subjectAvgAttention = (subjectData?.avg_attention || 62) / 100

  return parsed.students.map(st => {
    const recentGrade = st.avgScore5 || nationalAvg
    const normalizedGrade = (recentGrade - 1) / 4  // 1-5 → 0-1

    // Without monitoring, use subject attention norm + participation as proxy
    const attentionProxy = subjectAvgAttention * st.participationRate
    const emotionProxy   = 0.55 * st.participationRate
    const trendNorm      = Math.max(-1, Math.min(1, st.trend / 2))
    const participNorm   = st.participationRate

    // OLS prediction with KZ weights
    const predicted =
      nationalAvg * 0.22 +
      attentionProxy  * weights.attention * 4.0 +
      emotionProxy    * weights.emotion   * 3.8 +
      normalizedGrade * weights.recent_grade * 6.4 +
      trendNorm       * weights.grade_trend  * 5.0 +
      participNorm    * weights.participation * 6.7

    const clampedPred = Math.max(1, Math.min(5, predicted))

    // Risk classification
    let risk = 'at_risk'
    if (clampedPred >= thresholds.advanced && attentionProxy >= 0.65) risk = 'advanced'
    else if (clampedPred >= thresholds.on_track && trendNorm >= -0.1) risk = 'on_track'
    else if (clampedPred >= thresholds.watch || trendNorm > 0.1) risk = 'watch'

    const RISK_LABELS = {
      advanced: { kz: 'Үздік',          color: '#22c55e', bg: '#f0fdf4' },
      on_track: { kz: 'Жол үстінде',    color: '#2F7F86', bg: '#E6F4F3' },
      watch:    { kz: 'Назар аудар',     color: '#f59e0b', bg: '#fffbeb' },
      at_risk:  { kz: 'Қауіп бар',       color: '#ef4444', bg: '#fef2f2' },
    }

    return {
      ...st,
      predicted:     +clampedPred.toFixed(2),
      predictedLabel: clampedPred >= 4.5 ? '5' : clampedPred >= 3.5 ? '4' : clampedPred >= 2.5 ? '3' : clampedPred >= 1.5 ? '2' : '1',
      risk,
      riskLabel:     RISK_LABELS[risk],
      recommendation: getRecommendation(risk, st.trendDir, st.absentCount),
    }
  })
}

function getRecommendation(risk, trend, absent) {
  if (risk === 'at_risk') {
    if (absent > 3) return 'Жиі қалатын оқушы. Ата-анамен байланысу керек.'
    return 'Қосымша жұмыс, жеке кеңес қажет.'
  }
  if (risk === 'watch') {
    if (trend === 'down') return 'Баға төмендеп барады. Мотивациясын арттыру керек.'
    return 'Бақылауда ұстау, ынталандыру жеткілікті.'
  }
  if (risk === 'on_track') return 'Жақсы қарқын. Үлгерімін сақтасын.'
  return 'Үздік оқушы. Олимпиадаға ұсыну мүмкін.'
}
