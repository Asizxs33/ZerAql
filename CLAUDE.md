# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend (Vite dev server, port 5173)
npm run dev

# Backend (Express + Socket.io, port 3001)
npm run server

# Both must run simultaneously for the app to work

# Build frontend for production
npm run build

# Lint
npm run lint
```

Both servers must run simultaneously. The frontend proxies API calls to `localhost:3001` via the `BASE` constant in `src/api/index.js`.

> **Note:** `src/api/index.js` has two versions of `BASE` — one pointing to `localhost:3001` (dev) and one to the production Render URL. Check which is active before testing.

## Architecture

### Full-stack structure
- `src/` — React frontend (Vite + Tailwind CSS v4)
- `server/` — Express backend (ESM, `"type": "module"`)
- `public/models/` — face-api.js v0.22.2 model files served statically (13 files, ~11MB)
- `.env` — `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY` (never commit)

### Backend (`server/`)
- `server/index.js` — Express app + Socket.io setup, registers all routes, calls `initDB()`
- `server/db.js` — PostgreSQL pool (`pg`) + `initDB()` which creates all tables via `CREATE TABLE IF NOT EXISTS`
- `server/middleware/auth.js` — exports `requireAuth` (JWT verification middleware)
- `server/routes/` — `auth`, `users`, `lessons`, `grades`, `monitoring`, `classes`, `ai`
- AI routes call OpenAI GPT-4o-mini server-side only; API key never reaches frontend

### Database schema (auto-created on startup)
- `users` — `id, email, password_hash, full_name, role ('student'|'teacher'), school, teacher_code, class_id`
- `classes` — `id, name, code (unique), teacher_id`
- `lessons` — `id, title, subject, class_name, teacher_id, difficulty, duration, max_score, status ('draft'|'active'|'done')`
- `grades` — `id, student_id, lesson_id, subject, score (1–5), grade_date`
- `session_monitoring` — `id, student_id, lesson_id, attention, emotion, pulse, created_at`
- `lesson_enrollments` — `id, student_id, lesson_id, completed, score`

### Frontend (`src/`)
- `src/api/index.js` — single `api` object with all HTTP calls via `req()` helper (attaches JWT from localStorage)
- `src/context/AuthContext.jsx` — global auth state, JWT stored as `zeraql_token`
- `src/context/ProctoringContext.jsx` — wraps authenticated routes; starts camera only for `role === 'student'` on `/student`, `/test`, `/leaderboard`
- `src/hooks/useProctoring.js` — core ML hook: face-api.js detection loop (emotion, attention via head pose + EAR, rPPG pulse, face verification). Uses **callback ref pattern** (`useCallback(node => setVideoEl(node))`) to avoid mount-order race condition. Uses **stable refs** for detect loop callbacks to prevent RAF loop restarts on state update.
- `src/hooks/useMonitoringSocket.js` — `useStudentMonitoring` (emit) / `useTeacherMonitoring` (receive) via Socket.io
- `src/components/FloatingCamera.jsx` — draggable camera widget. Uses RAF + direct `el.style.left/top` during drag (not React state) to avoid lag; syncs to React state on mouseup only.

### ML / Proctoring
- face-api.js models loaded from `/models` (local, not CDN) — `ssd_mobilenetv1`, `face_landmark_68`, `face_expression`, `face_recognition`, `age_gender`, `tiny_face_detector`
- **No COCO-SSD** — removed due to TF.js double-registration conflict with face-api.js (`Platform browser already set`)
- Detection runs in `requestAnimationFrame` loop; violations rate-limited with `frameCountRef % 30/60/90/120`
- Browser anti-cheat: `visibilitychange` + F12/DevTools blocking only (copy/paste NOT blocked)

### WebSocket rooms
Students and teachers join `class:${classId}` rooms. Events: `teacher:join`, `student:join`, `student:metrics`, `student:alert`, `student:violation`.

### Role-based routing
- Teacher routes: `/teacher`, `/students`, `/classes`, `/journal`, `/create-lesson`, `/teacher-analytics`, `/student-analytics/:studentId`
- Student routes: `/student`, `/lessons`, `/my-class`, `/tasks`, `/analytics`, `/notifications`, `/test`, `/leaderboard`
- Camera/proctoring: students only, on monitored routes

### UI conventions
- Color palette: `#0F4C5C` (dark), `#2F7F86` (primary), `#66B2B2` (muted), `#BFE3E1` (border/light)
- CSS classes: `card`, `card-glow`, `btn-primary`, `input-field`, `nav-link`, `page-bg` defined in `src/index.css`
- Font: `Space Grotesk` for headings, Material Symbols Outlined for icons
- All UI text is in Kazakh (`kk`); some labels mix Russian
