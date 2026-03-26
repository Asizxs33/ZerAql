import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
      school VARCHAR(255),
      teacher_code VARCHAR(10),
      class_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(10) UNIQUE NOT NULL,
      teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(100),
      class_name VARCHAR(50),
      teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      difficulty INTEGER DEFAULT 50,
      duration INTEGER DEFAULT 45,
      max_score INTEGER DEFAULT 100,
      status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'done')),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS grades (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
      subject VARCHAR(100),
      score NUMERIC(3,1),
      grade_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS lesson_enrollments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
      completed BOOLEAN DEFAULT FALSE,
      score NUMERIC(5,2),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS session_monitoring (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
      attention INTEGER,
      emotion INTEGER,
      pulse INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]';
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(20) DEFAULT 'quiz';
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content TEXT;
  `)

  // Seed sample questions for any active lessons that have no questions yet
  let emptyLessons = []
  try {
    ;({ rows: emptyLessons } = await pool.query(
      `SELECT id, title, subject FROM lessons WHERE status = 'active' AND (questions IS NULL OR questions = '[]'::jsonb)`
    ))
  } catch {}

  const sampleQuestions = {
    'Математика': [
      { text: '2x + 5 = 13. x = ?', type: 'single', options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'], answer: 1 },
      { text: 'Үшбұрыштың бұрыштары қосындысы неге тең?', type: 'single', options: ['90°', '180°', '270°', '360°'], answer: 1 },
      { text: '√144 = ?', type: 'single', options: ['10', '11', '12', '13'], answer: 2 },
      { text: 'Егер a = 3, b = 4 болса, a² + b² = ?', type: 'single', options: ['25', '14', '7', '49'], answer: 0 },
      { text: 'Теңдеуді шешіңіз: 3x - 7 = 8', type: 'single', options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'], answer: 2 },
    ],
    'Физика': [
      { text: 'Жарықтың вакуумдагы жылдамдығы қандай?', type: 'single', options: ['300 000 км/с', '150 000 км/с', '3 000 км/с', '30 000 км/с'], answer: 0 },
      { text: 'Ньютонның бірінші заңы нені сипаттайды?', type: 'single', options: ['Инерция', 'Күш', 'Жұмыс', 'Энергия'], answer: 0 },
      { text: 'Дене массасы 5 кг, үдеу 2 м/с². Күш неге тең?', type: 'single', options: ['5 Н', '7 Н', '10 Н', '2.5 Н'], answer: 2 },
      { text: 'Электр кедергісінің өлшем бірлігі?', type: 'single', options: ['Ампер', 'Вольт', 'Ом', 'Ватт'], answer: 2 },
      { text: 'Потенциалдық энергия формуласы?', type: 'single', options: ['E = mv²/2', 'E = mgh', 'E = Fs', 'E = Pt'], answer: 1 },
    ],
    'Химия': [
      { text: 'Судың химиялық формуласы?', type: 'single', options: ['H₂O', 'CO₂', 'NaCl', 'O₂'], answer: 0 },
      { text: 'Натрий элементінің символы?', type: 'single', options: ['N', 'Na', 'Ni', 'Nb'], answer: 1 },
      { text: 'Периодтық жүйені кім ашты?', type: 'single', options: ['Эйнштейн', 'Ньютон', 'Менделеев', 'Дарвин'], answer: 2 },
      { text: 'Тотығу реакциясында не болады?', type: 'single', options: ['Электрон жоғалады', 'Электрон қосылады', 'Протон жоғалады', 'Нейтрон қосылады'], answer: 0 },
      { text: 'H₂SO₄ — бұл қандай қышқыл?', type: 'single', options: ['Тұз', 'Азот', 'Күкірт', 'Фосфор'], answer: 2 },
    ],
    'Биология': [
      { text: 'Фотосинтез қай органоидта жүреді?', type: 'single', options: ['Митохондрия', 'Хлоропласт', 'Рибосома', 'Ядро'], answer: 1 },
      { text: 'ДНҚ-ның негізгі қызметі?', type: 'single', options: ['Энергия өндіру', 'Тұқым қуалаушылық ақпаратты сақтау', 'Белок синтезі', 'Тыныс алу'], answer: 1 },
      { text: 'Адам ағзасында неше хромосома бар?', type: 'single', options: ['44', '46', '48', '42'], answer: 1 },
      { text: 'Митоз — бұл не?', type: 'single', options: ['Жыныстық бөліну', 'Жай бөліну', 'Тыныс алу', 'Қоректену'], answer: 1 },
      { text: 'Қан түрлері: 4-ші топ — қандай?', type: 'single', options: ['O', 'A', 'B', 'AB'], answer: 3 },
    ],
    'История': [
      { text: 'Қазақстан тәуелсіздікті қай жылы алды?', type: 'single', options: ['1989', '1990', '1991', '1992'], answer: 2 },
      { text: 'Ұлы Жібек жолы қандай мақсатта пайдаланылды?', type: 'single', options: ['Соғыс', 'Сауда', 'Туризм', 'Дін'], answer: 1 },
      { text: 'Бірінші дүниежүзілік соғыс қай жылы басталды?', type: 'single', options: ['1912', '1913', '1914', '1915'], answer: 2 },
      { text: 'Қазақстанның астанасы?', type: 'single', options: ['Алматы', 'Шымкент', 'Астана', 'Қарағанды'], answer: 2 },
      { text: 'Абай Құнанбайұлы — кім?', type: 'single', options: ['Батыр', 'Ақын-философ', 'Хан', 'Ғалым'], answer: 1 },
    ],
    'default': [
      { text: 'Критикалық ойлау дегеніміз не?', type: 'single', options: ['Барлығына күмәнмен қарау', 'Дәлелдерге сүйене отырып ойлау', 'Жылдам шешім қабылдау', 'Басқаның пікірін қабылдау'], answer: 1 },
      { text: 'Оқу барысында ең тиімді әдіс?', type: 'single', options: ['Тек оқу', 'Тек жазу', 'Оқу, жазу және практика', 'Тек тыңдау'], answer: 2 },
      { text: 'Проблемалық оқыту дегеніміз не?', type: 'single', options: ['Есептер шығару', 'Мәселені өз бетімен шешу', 'Жаттау', 'Бақылау'], answer: 1 },
      { text: 'Командалық жұмыста не маңызды?', type: 'single', options: ['Жеке жетістік', 'Байланыс және сенім', 'Бәсеке', 'Жылдамдық'], answer: 1 },
      { text: 'Рефлексия дегеніміз не?', type: 'single', options: ['Жаттау', 'Өз іс-әрекетін талдау', 'Сын айту', 'Мақсат қою'], answer: 1 },
    ],
  }

  for (const lesson of emptyLessons) {
    const subj = lesson.subject || ''
    const qs = sampleQuestions[subj] || sampleQuestions['default']
    await pool.query(
      `UPDATE lessons SET questions = $1, lesson_type = 'quiz' WHERE id = $2`,
      [JSON.stringify(qs), lesson.id]
    )
  }

  if (emptyLessons.length > 0) {
    console.log(`Seeded questions for ${emptyLessons.length} lessons`)
  }

  // Seed one sample lesson per type if teacher exists and types are missing
  try {
  const { rows: teachers } = await pool.query(`SELECT id FROM users WHERE role = 'teacher' LIMIT 1`)
  if (teachers.length > 0) {
    const teacherId = teachers[0].id
    const typesToSeed = [
      {
        lesson_type: 'video',
        title: 'Ньютонның қозғалыс заңдары — видео сабақ',
        subject: 'Физика',
        content: 'https://www.youtube.com/embed/kKKM8Y-u7ds',
        questions: [],
        duration: 20,
        difficulty: 40,
      },
      {
        lesson_type: 'reading',
        title: 'Фотосинтез процесі — оқу материалы',
        subject: 'Биология',
        content: `## Фотосинтез дегеніміз не?\n\nФотосинтез — жасыл өсімдіктердің күн энергиясын пайдаланып, көмірқышқыл газы (CO₂) мен суды (H₂O) органикалық заттарға — глюкозаға айналдыру процесі.\n\n**Реакция формуласы:**\n\`6CO₂ + 6H₂O + жарық → C₆H₁₂O₆ + 6O₂\`\n\n## Қай жерде жүреді?\n\nФотосинтез хлоропластта жүреді. Хлоропластта хлорофилл пигменті бар — ол жасыл түс береді және күн жарығын сіңіреді.\n\n## Кезеңдері\n\n1. **Жарықтық кезең** — хлорофилл жарықты сіңіреді, су молекулалары ыдырайды, АТФ түзіледі.\n2. **Қараңғылық кезең (Кальвин циклы)** — CO₂ глюкозаға айналады.\n\n## Маңызы\n- Атмосферада оттегін (O₂) өндіреді\n- Барлық тізбектің негізгі қоректік байлығы\n- Климатты реттейді`,
        questions: [],
        duration: 15,
        difficulty: 35,
      },
      {
        lesson_type: 'task',
        title: 'Геометриялық есептер — үй тапсырмасы',
        subject: 'Математика',
        content: `## Тапсырма\n\nТөмендегі есептерді шығарып, жауаптарыңызды толық жазыңыз:\n\n**1-есеп.** Тіктөртбұрыштың ені 6 см, ұзындығы 9 см. Аудан мен периметрді табыңыз.\n\n**2-есеп.** Дұрыс үшбұрыштың қабырғасы 8 см болса, оның биіктігін табыңыз.\n\n**3-есеп.** Шеңбердің радиусы 5 см. Ауданын және ұзындығын есептеңіз (π ≈ 3.14).\n\n**4-есеп.** Трапецияның негіздері 4 см және 8 см, биіктігі 5 см. Ауданын табыңыз.\n\n> Барлық есептер үшін формуланы, есептеу барысын және жауапты жазу міндетті.`,
        questions: [],
        duration: 30,
        difficulty: 55,
      },
    ]

    for (const seed of typesToSeed) {
      const { rows: exists } = await pool.query(
        `SELECT id FROM lessons WHERE lesson_type = $1 AND teacher_id = $2 LIMIT 1`,
        [seed.lesson_type, teacherId]
      )
      if (exists.length === 0) {
        await pool.query(
          `INSERT INTO lessons (title, subject, teacher_id, lesson_type, content, questions, duration, difficulty, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
          [seed.title, seed.subject, teacherId, seed.lesson_type, seed.content,
           JSON.stringify(seed.questions), seed.duration, seed.difficulty]
        )
        console.log(`Seeded ${seed.lesson_type} lesson: ${seed.title}`)
      }
    }
  }
  } catch (e) {
    console.warn('Seed warning (non-fatal):', e.message)
  }

  console.log('Database schema initialized')
}
