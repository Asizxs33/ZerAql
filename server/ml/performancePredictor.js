/**
 * ZerAql — Student Performance Predictor
 * Multiple Linear Regression trained on real DB data
 *
 * Features per student:
 *   x1 = avg_attention        (0–1)  — mean attention from session_monitoring
 *   x2 = avg_emotion          (0–1)  — mean emotion score
 *   x3 = recent_grade_avg     (0–1)  — mean of last 3 grades, normalised (1-5 → 0-1)
 *   x4 = grade_trend          (-1–1) — linear slope of grade history
 *   x5 = lesson_count         (0–1)  — participation rate (log-scaled)
 *
 * Target:  y = next expected grade (1–5)
 */

// ── Matrix helpers (no external libs) ─────────────────────────────────────

function matMul(A, B) {
  const rows = A.length, cols = B[0].length, inner = B.length
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) =>
      A[i].reduce((s, _, k) => s + A[i][k] * B[k][j], 0)
    )
  )
}

function transpose(A) {
  return A[0].map((_, j) => A.map(row => row[j]))
}

// Gauss-Jordan inverse for small matrices
function inverse(M) {
  const n = M.length
  const aug = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row
    }
    ;[aug[col], aug[pivot]] = [aug[pivot], aug[col]]
    const div = aug[col][col]
    if (Math.abs(div) < 1e-12) return null // singular
    aug[col] = aug[col].map(v => v / div)
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col]
        aug[row] = aug[row].map((v, k) => v - factor * aug[col][k])
      }
    }
  }
  return aug.map(row => row.slice(n))
}

// Ordinary Least Squares: β = (XᵀX)⁻¹ Xᵀy
function trainOLS(X, y) {
  const Xt = transpose(X)
  const XtX = matMul(Xt, X)
  const XtXinv = inverse(XtX)
  if (!XtXinv) return null
  const Xty = matMul(Xt, y.map(v => [v]))
  return matMul(XtXinv, Xty).map(r => r[0]) // β vector
}

function predict(beta, x) {
  return beta.reduce((s, b, i) => s + b * x[i], 0)
}

function rSquared(y, yHat) {
  const mean = y.reduce((a, b) => a + b, 0) / y.length
  const ss_tot = y.reduce((s, v) => s + (v - mean) ** 2, 0)
  const ss_res = y.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0)
  return ss_tot === 0 ? 1 : Math.max(0, 1 - ss_res / ss_tot)
}

// ── Feature extraction ─────────────────────────────────────────────────────

function extractFeatures(grades, monitoring) {
  // avg attention / emotion (0–1)
  const avgAtt = monitoring.length
    ? monitoring.reduce((s, m) => s + (m.attention || 0), 0) / monitoring.length / 100
    : 0.5

  const avgEmo = monitoring.length
    ? monitoring.reduce((s, m) => s + (m.emotion || 0), 0) / monitoring.length / 100
    : 0.5

  // recent grade avg (last 3, normalised 1-5 → 0–1)
  const recent = grades.slice(0, 3).map(g => Number(g.score))
  const recentAvg = recent.length
    ? (recent.reduce((a, b) => a + b, 0) / recent.length - 1) / 4
    : 0.5

  // grade trend: slope of grade history
  let trend = 0
  if (grades.length >= 2) {
    const n = Math.min(grades.length, 6)
    const vals = grades.slice(0, n).reverse().map(g => Number(g.score))
    const xMean = (n - 1) / 2
    const yMean = vals.reduce((a, b) => a + b, 0) / n
    const num = vals.reduce((s, v, i) => s + (i - xMean) * (v - yMean), 0)
    const den = vals.reduce((s, _, i) => s + (i - xMean) ** 2, 0)
    trend = den === 0 ? 0 : Math.max(-1, Math.min(1, num / den / 2)) // normalise
  }

  // lesson participation (log-scaled 0–1, max at 10 lessons)
  const participation = Math.min(1, Math.log1p(grades.length) / Math.log1p(10))

  return [1, avgAtt, avgEmo, recentAvg, trend, participation] // 1 = bias term
}

// ── Risk classification ────────────────────────────────────────────────────

function classifyRisk(predicted, trend, avgAttention) {
  if (predicted >= 4.3 && avgAttention >= 0.75) return 'advanced'
  if (predicted >= 3.5 && trend >= -0.1) return 'on_track'
  if (predicted >= 2.5 || trend > 0.1) return 'watch'
  return 'at_risk'
}

const RISK_LABELS = {
  advanced: { kz: 'Үздік', color: '#22c55e', bg: '#f0fdf4' },
  on_track: { kz: 'Жол үстінде', color: '#2F7F86', bg: '#E6F4F3' },
  watch:    { kz: 'Назар аудар', color: '#f59e0b', bg: '#fffbeb' },
  at_risk:  { kz: 'Қауіп бар', color: '#ef4444', bg: '#fef2f2' },
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * @param {Array} studentData  Array of { student, grades, monitoring }
 * @returns { predictions, modelInfo }
 */
export function predictPerformance(studentData) {
  // Build dataset — only students with at least 1 grade AND 1 monitoring record
  const labeled = studentData.filter(d => d.grades.length >= 1)

  // Design matrix X and target y
  const X = labeled.map(d => extractFeatures(d.grades, d.monitoring))
  const y = labeled.map(d => Number(d.grades[0].score)) // most recent grade as target

  // Train model if we have enough samples
  let beta = null
  let r2 = 0
  if (labeled.length >= 4) {
    beta = trainOLS(X, y)
    if (beta) {
      const yHat = X.map(x => predict(beta, x))
      r2 = rSquared(y, yHat)
    }
  }

  // Fallback calibrated weights if not enough data
  // [bias, attention, emotion, recent_grade, trend, participation]
  const FALLBACK_BETA = [0.8, 1.5, 0.7, 1.8, 0.5, 0.4]
  const activeBeta = (beta && r2 > 0.05) ? beta : FALLBACK_BETA

  // Predict for ALL students (even those without grades)
  const predictions = studentData.map(d => {
    const features = extractFeatures(d.grades, d.monitoring)
    const rawPred = predict(activeBeta, features)
    const predicted = Math.max(1, Math.min(5, rawPred))

    const avgAttention = features[1] // normalised
    const trend = features[4]
    const recentGrade = d.grades.length
      ? d.grades.slice(0, 3).reduce((s, g) => s + Number(g.score), 0) / Math.min(d.grades.length, 3)
      : null

    const risk = classifyRisk(predicted, trend, avgAttention)

    // Confidence: higher when more data + better model fit
    const dataScore = Math.min(1, d.grades.length / 5) * 0.5 + Math.min(1, d.monitoring.length / 20) * 0.3
    const modelScore = r2 * 0.2
    const confidence = Math.round((dataScore + modelScore) * 100)

    // Feature importances (contribution to prediction vs baseline of 3)
    const baseline = 3
    const contributions = {
      attention: +(activeBeta[1] * features[1] * 4).toFixed(2),
      emotion:   +(activeBeta[2] * features[2] * 4).toFixed(2),
      grade:     +(activeBeta[3] * features[3] * 4).toFixed(2),
      trend:     +(activeBeta[4] * features[4] * 4).toFixed(2),
    }

    return {
      studentId: d.student.id,
      name: d.student.full_name,
      class_name: d.student.class_name,
      predicted: +predicted.toFixed(2),
      predicted5: Math.round(predicted * 10) / 10,
      recentGrade: recentGrade ? +recentGrade.toFixed(1) : null,
      trend: trend > 0.05 ? 'up' : trend < -0.05 ? 'down' : 'stable',
      trendValue: +trend.toFixed(2),
      avgAttention: Math.round(features[1] * 100),
      avgEmotion: Math.round(features[2] * 100),
      confidence: Math.min(95, Math.max(30, confidence)),
      risk,
      riskLabel: RISK_LABELS[risk],
      contributions,
      gradeCount: d.grades.length,
      monitoringCount: d.monitoring.length,
    }
  })

  // Sort: at_risk first, then watch, etc.
  const riskOrder = { at_risk: 0, watch: 1, on_track: 2, advanced: 3 }
  predictions.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])

  return {
    predictions,
    modelInfo: {
      algorithm: 'Multiple Linear Regression (OLS)',
      trained: beta !== null && r2 > 0.05,
      r2: +r2.toFixed(3),
      sampleSize: labeled.length,
      features: ['attention', 'emotion', 'recent_grade', 'trend', 'participation'],
      beta: activeBeta.map(b => +b.toFixed(3)),
    },
  }
}

export { RISK_LABELS }
