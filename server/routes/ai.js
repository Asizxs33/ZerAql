import express from 'express'
import OpenAI from 'openai'
import { requireAuth } from '../middleware/auth.js'
const authMiddleware = requireAuth

const router = express.Router()

// Initialize OpenAI — key is ONLY on the server, never sent to frontend
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    return null
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// POST /api/ai/recommendations
// Generates post-lesson AI recommendations based on monitoring data
router.post('/recommendations', authMiddleware, async (req, res) => {
  const {
    lessonTitle,
    subject,
    className,
    durationMinutes,
    studentCount,
    avgAttention,
    avgEmotion,
    avgPulse,
    completionRate,
    attentionTimeline, // array of attention % per time segment
    studentResults,    // array of { name, attention, emotion, score, violations }
  } = req.body

  const openai = getOpenAI()

  if (!openai) {
    // Return smart rule-based recommendations if no API key
    return res.json({ recommendations: generateRuleBasedRecs({
      avgAttention, avgEmotion, avgPulse, completionRate,
      attentionTimeline, studentResults,
    })})
  }

  // Build prompt with anonymized data
  const lowAttentionStudents = (studentResults || []).filter(s => s.attention < 50).length
  const highPerformers = (studentResults || []).filter(s => s.score >= 85).length
  const dropPoints = findAttentionDrops(attentionTimeline || [])

  const prompt = `Сен ZerAql EdTech платформасының AI-мұғалім кеңесшісісің. Сабақтан кейінгі мониторинг деректері бойынша мұғалімге қысқа, нақты, іс жүзінде пайдалы ұсынымдар бер.

САБАҚ ДЕРЕКТЕРІ:
- Пән: ${subject || 'Математика'}, Тақырып: ${lessonTitle || '—'}
- Сынып: ${className || '—'}, Оқушылар: ${studentCount || 0}, Ұзақтық: ${durationMinutes || 45} мин
- Орташа зейін: ${avgAttention || 0}%
- Орташа эмоция белсенділігі: ${avgEmotion || 0}%
- Орташа пульс: ${avgPulse || 72} bpm
- Орындалу: ${completionRate || 0}%
- Зейін төмен (<50%) оқушылар: ${lowAttentionStudents} адам
- Үздік нәтиже (85%+) оқушылар: ${highPerformers} адам
${dropPoints.length > 0 ? `- Зейін күрт төмендеген уақыт: ${dropPoints.join(', ')} минута` : ''}

НҰСҚАУ:
- Қазақ тілінде жауап бер
- Дәл 4 ұсыным бер, JSON массив ретінде
- Әр ұсыным: { "icon": "material_icon_name", "text": "нақты ұсыным", "type": "info|warning|success" }
- Мұғалімге нақты не істеу керектігін айт (жалпы сөз емес)
- warning — 2 оқушыдан көп зейін төмен болса; success — жақсы нәтиже үшін; info — жалпы кеңес

Тек JSON массив қайтар, басқа мәтін жоқ.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0].message.content
    let parsed
    try {
      const obj = JSON.parse(raw)
      // Handle both {recommendations:[...]} and direct array
      parsed = Array.isArray(obj) ? obj : (obj.recommendations || obj.data || [])
    } catch {
      parsed = generateRuleBasedRecs({ avgAttention, avgEmotion, completionRate, attentionTimeline, studentResults })
    }

    res.json({ recommendations: parsed, model: 'gpt-4o-mini' })
  } catch (err) {
    console.error('OpenAI error:', err.message)
    // Graceful fallback — rule-based if API fails
    res.json({
      recommendations: generateRuleBasedRecs({ avgAttention, avgEmotion, completionRate, attentionTimeline, studentResults }),
      model: 'rule-based',
    })
  }
})

// POST /api/ai/lesson-questions
// Generates test questions for a lesson
router.post('/lesson-questions', authMiddleware, async (req, res) => {
  const { subject, topic, difficulty = 'medium', count = 5 } = req.body

  const openai = getOpenAI()
  if (!openai) {
    return res.status(503).json({ error: 'AI қызметі қолжетімсіз. API ключін .env файлына қосыңыз.' })
  }

  const prompt = `Сен білім беру платформасының сұрақ генераторысың.

Пән: ${subject}
Тақырып: ${topic}
Қиындық: ${difficulty === 'easy' ? 'оңай' : difficulty === 'hard' ? 'қиын' : 'орташа'}
Сұрақ саны: ${count}

${count} тест сұрағы жаса. Әр сұрақта 4 жауап нұсқасы болсын, бір дұрыс жауап болсын.
Қазақ тілінде жаз.

JSON форматта қайтар:
{
  "questions": [
    {
      "question": "сұрақ мәтіні",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "неге дұрыс екені"
    }
  ]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const parsed = JSON.parse(completion.choices[0].message.content)
    res.json(parsed)
  } catch (err) {
    console.error('OpenAI lesson-questions error:', err.message)
    res.status(500).json({ error: 'Сұрақ жасау қатесі' })
  }
})

// POST /api/ai/student-feedback
// Personalized feedback for a student based on their session data
router.post('/student-feedback', authMiddleware, async (req, res) => {
  const { studentName, attention, emotion, pulse, score, violations } = req.body

  const openai = getOpenAI()
  if (!openai) {
    return res.json({ feedback: generateStudentFeedback({ attention, emotion, score }) })
  }

  const prompt = `Сен ZerAql платформасының оқушыға жеке кері байланыс беретін AI-сысін.

ОҚУШЫ ДЕРЕКТЕРІ (${studentName}):
- Зейін деңгейі: ${attention}%
- Эмоция белсенділігі: ${emotion}%
- Пульс: ${pulse} bpm
- Тест нәтижесі: ${score}/100
- Бұзушылық саны: ${violations || 0}

Оқушыға арналған қысқа (2-3 сөйлем), ынталандырушы, нақты кері байланыс жаз.
Қазақ тілінде. Аты-жөні атама — тек "Сен" деп бастама.
JSON: { "feedback": "мәтін", "emoji": "emoji" }`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })
    res.json(JSON.parse(completion.choices[0].message.content))
  } catch (err) {
    res.json({ feedback: generateStudentFeedback({ attention, emotion, score }), emoji: '📚' })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────

function findAttentionDrops(timeline) {
  const drops = []
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i - 1] - timeline[i] >= 15) {
      drops.push(i * 4) // 4-min segments
    }
  }
  return drops
}

function generateRuleBasedRecs({ avgAttention, avgEmotion, completionRate, attentionTimeline, studentResults }) {
  const recs = []
  const lowCount = (studentResults || []).filter(s => s.attention < 50).length

  if ((avgAttention || 0) < 60) {
    recs.push({ icon: 'trending_up', text: 'Зейін деңгейі орташадан төмен. Келесі сабаққа интерактивті тапсырмалар немесе топтық жұмыс енгізіңіз.', type: 'warning' })
  } else {
    recs.push({ icon: 'thumb_up', text: `Зейін деңгейі жақсы (${avgAttention}%). Сабақ форматы тиімді жұмыс істеуде.`, type: 'success' })
  }

  if (lowCount > 2) {
    recs.push({ icon: 'group', text: `${lowCount} оқушының зейін деңгейі 50%-дан төмен болды. Олармен жеке сөйлесу немесе қосымша тапсырма беру ұсынылады.`, type: 'warning' })
  }

  const drops = findAttentionDrops(attentionTimeline || [])
  if (drops.length > 0) {
    recs.push({ icon: 'schedule', text: `${drops[0]}-минутада зейін күрт төмендеген. Сол уақытта қысқа үзіліс немесе белсендіру тапсырмасы пайдалы болар еді.`, type: 'info' })
  } else {
    recs.push({ icon: 'schedule', text: 'Зейін динамикасы тұрақты болды. Сабақ ырғағы оңтайлы.', type: 'info' })
  }

  if ((completionRate || 0) < 80) {
    recs.push({ icon: 'assignment', text: `Орындалу ${completionRate}%. Тапсырма көлемін немесе уақытты қайта қараңыз.`, type: 'warning' })
  } else {
    recs.push({ icon: 'star', text: 'Жоғары нәтижелі оқушыларға күрделірек қосымша тапсырма дайындаңыз.', type: 'success' })
  }

  return recs.slice(0, 4)
}

function generateStudentFeedback({ attention, emotion, score }) {
  if (score >= 85 && attention >= 80) {
    return { feedback: 'Сенің нәтижең өте жақсы! Зейінің де, тест нәтижең де жоғары деңгейде. Осы қарқынды ұстай бер.', emoji: '🌟' }
  }
  if (attention < 50) {
    return { feedback: 'Бүгін зейін аздау болды. Келесі сабаққа телефонды алшақ қой, тыныш орта таңда — нәтиже бірден өседі.', emoji: '💪' }
  }
  return { feedback: `Тест нәтижең ${score}/100. Материалдың кейбір бөліктерін қайталап шық — онда баллың жоғарылайды!`, emoji: '📖' }
}

export default router
