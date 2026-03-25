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
  `)
  console.log('Database schema initialized')
}
