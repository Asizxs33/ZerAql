<div align="center">
  <img src="https://raw.githubusercontent.com/Asizxs33/ZerAql/main/public/favicon.svg" alt="ZerAql Logo" width="120" />
</div>

<h1 align="center">ZerAql (ЗерАқыл) — AI-Powered EdTech Platform</h1>

**ZerAql** — это масштабируемая образовательная платформа нового поколения, разработанная за 24 часа в рамках хакатона. Проект внедряет технологии **Компьютерного зрения (Edge AI)** и **Генеративного ИИ (LLM)** для автоматизации рутины учителей и глубокого поведенческого анализа учеников.

🌐 **Production (Live)**: [https://zeraql.vercel.app](https://zeraql.vercel.app)  
⚙️ **Backend API**: `https://zeraql.onrender.com/api`

---

## 🏛 Архитектура Системы (Microservices Concept)

Архитектура построена с учетом высокой нагрузки WebSockets и статической скорости раздачи Frontend.

```mermaid
graph TD
    Client(Browser: React + Vite)
    Vercel[Vercel Global Edge CDN]
    Render[Render Cloud Container]
    Neon[(Neon PostgreSQL DB)]
    OpenAI(OpenAI GPT-4o-mini API)
    EdgeAI((Client-Side WebGL ML Models))

    Client -- "Static Files (HTML/JS/CSS)" --> Vercel
    Client -- "REST API: Auth, Grades, AI Generation" --> Render
    Client -- "WebSockets: Live Proctoring Data" --> Render
    Client -- "Local Inference: Face-api.js" --> EdgeAI
    
    Render -- "SQL Reads/Writes" --> Neon
    Render -- "Prompts: Lesson/Quiz Gen" --> OpenAI
```

---

## 🧠 Интеграция Интеллектуальных Систем (AI)

Уникальная особенность ZerAql — гибридное использование ИИ.

### 1. Edge AI: Computer Vision & Live Proctoring (Локальный ИИ)
Вместо отправки тяжелого видеопотока на сервер, что вызывает задержки и нарушает приватность, мы перенесли ML на сторону клиента (браузера ученика):
* **Технология**: Прямое использование `face-api.js` (оболочка над TensorFlow.js).
* **Модели (`/public/models`)**: `SSD Mobilenet v1` (для Face Tracking) и `Face Landmark 68` (для распознавания эмоций).
* **Метрики (Attention & Emotion)**: Алгоритм оценивает положение головы и зрачков. Если ученик отвлекается от монитора на 5+ секунд, метрика `attention` падает, и сервер мгновенно получает WebRTC/WebSocket сигнал.
* **Производительность**: Frame-skipping алгоритм читает каждый 10-й кадр видео (каждые 300мс), снижая загрузку CPU с 90% до 15-20% при использовании WebGL.

### 2. Generative AI: Personalized Tutors & Content Generation (Облачный ИИ)
Для глубокого контекстуального анализа мы используем облачную LLM.
* **Технология**: OpenAI API (`gpt-4o-mini`).
* **Модуль `routes/ai.js`**: Включает в себя Промпт-инжиниринг (Prompt Engineering) на казахском языке согласно учебной программе РК (`kz_curriculum.json`).
* **Сценарии**: 
  1. Авто-создание тестов и викторин на лету.
  2. Генерация планов уроков.
  3. **Predictive Analytics (Предиктивная аналитика)**: ИИ анализирует связку "Оценки + Зрительное внимание ученика" из базы данных и выдает учителю прогноз о риске снижения академической успеваемости.

---

## ⚡ Real-Time Мониторинг (WebSocket Lifecycle)

Как работает живая панель учителя:
1. Учитель заходит на страницу урока: `socket.emit('teacher:join', { room: classId })`.
2. Ученики заходят на урок: `socket.emit('student:join')`.
3. Каждые `X` секунд ML-инференс ученика отправляет сжатый объект `{ studentId, attention, emotion, pulse }` через `socket.emit('student:metrics')`.
4. Бэкенд обновляет кэш состояния в оперативной памяти Node.js (`studentSessions` JS Map) и пересылает данные учителю.
5. Если WebSocket-соединение бота обрывается (интернет отключился), бэкенд фиксирует `disconnect` и мгновенно убирает ученика с дашборда учителя.

---

## 🚀 Стек Технологий

### Frontend
- **React 18** + **Vite** (Выбран за HMR и сверхбыструю сборку, в отличие от медленного Create-React-App).
- **Tailwind CSS** (Современные Glassmorphism-компоненты, градиенты).
- **React-Router-Dom v6** (С настроенным `vercel.json` для корректной маршрутизации SPA).
- **Socket.io-Client** (Используется исключительно `websocket` transport для обхода ограничений CORS long-polling).

### Backend
- **Node.js** + **Express** (Выбран за event-driven неблокирующую архитектуру, которая позволяет держать сотни активных WebSocket соединений без создания новых потоков (Threads), в отличие от классических Python/Django или Java).
- **PostgreSQL** (Neon Cloud Serverless DB).
- **JWT (JSON Web Tokens)** (Для безопасной Stateless-аутентификации).
- **Bcrypt** (Хэширование паролей).

---

## 📂 Структура Базы Данных (Schema)

| Таблица | Описание и связи |
| --- | --- |
| `users` | Учителя и студенты (Роли, хэши паролей, школа). |
| `classes` | Классы. Связан с `users` через случайный 6-значный `class_code`. Студенты джойнятся по коду. |
| `lessons` | Уроки, созданные учителями (Статус: Проект, Активный, Завершен). |
| `grades` | Оценки. `lesson_id` -> `student_id` -> Оценка. |
| `session_monitoring`| Логи прокторинга с метками времени (Каждые N минут метрики с ИИ кэшируются сюда для исторических отчетов). |

---

## 🛠 Технические Трудности и Решения на Хакатоне

1. **Проблема совместимости (Vite & fs)**: Модуль машинного зрения `face-api.js` (старый стандарт) пытался вызвать системный Node.js модуль `fs` (FileSystem). Современный сборщик Vite выдавал сбой.  
   **Решение**: Исключение `fs` модулей в кэше сборки, жесткий парсинг JSON-файлов для моделей через статический URL (`/models/`).
2. **Strict CORS Policy в Production**: При деплое Vercel заблокировал доступ к Render из-за строгих `Access-Control-Allow-Origin`. Стандартный `origin: true` не отрабатывал с `credentials: true`.  
   **Решение**: Написание динамического Callback-фильтра в `server/index.js` для динамического обхода CORS-политик браузеров.
3. **Хранение огромного массива логов**: База засоряется метриками от десятков тысяч видеокадров.  
   **Решение**: Метрики консолидируются в памяти на клиенте в средние арифметические и отправляются на сервер пачкой раз в несколько секунд (Batching). Сервер сохраняет их в БД только при завершении сессии урока.

---

## 🔌 API Endpoints (Restful + JWT)

- `POST /api/auth/register` - Регистрация с шифровванием пароля.
- `POST /api/auth/login` - Выдача JWT-токена.
- `POST /api/users/me/join-class` - Валидация 6-значного кода и добавление студента в `classes`.
- `GET /api/users/me/analytics` - Суровый SQL JOIN таблиц (grades + session_monitoring) для расчета среднего академического успеха.
- `POST /api/ai/analyze-student` - Отправка истории через OpenAI Prompt для предиктивного отчета по ученику.
- Весь API защищен Middleware барьером (Bearer Auth).

---

## 💻 Установка и развертывание (Local Run)

Если вы хотите запустить проект локально:

1. Склонируйте код.
```bash
git clone https://github.com/Asizxs33/ZerAql.git
cd ZerAql-React
```
2. Создайте базу в PostgresSQL и `.env` в корне проекта:
```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
JWT_SECRET=super_secret_key
PORT=3001
OPENAI_API_KEY=sk-proj-ваша-openai-api-кнопка
```
3. Для старта Backend (Terminal 1):
```bash
npm install
npm run server
```
4. Для старта Frontend (Terminal 2):
```bash
npm install
npm run dev
```

---
*Из Казахстана. Для лучшего образования. 🚀*
