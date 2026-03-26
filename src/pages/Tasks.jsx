import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/index.js'

const TYPE_META = {
  quiz:    { icon: 'quiz',        label: 'Тест',            color: '#d97706', bg: '#fef3c7', border: '#f59e0b' },
  video:   { icon: 'videocam',    label: 'Видео сабақ',     color: '#7c3aed', bg: '#ede9fe', border: '#a78bfa' },
  reading: { icon: 'menu_book',   label: 'Оқу материалы',   color: '#0369a1', bg: '#e0f2fe', border: '#38bdf8' },
  task:    { icon: 'assignment',  label: 'Тапсырма',        color: '#065f46', bg: '#d1fae5', border: '#34d399' },
}

export default function Tasks() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const [lessons, setLessons] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getLessons().catch(() => []),
      api.getGrades().catch(() => [])
    ])
    .then(([lessonsData, gradesData]) => {
      setLessons(lessonsData || [])
      setGrades(gradesData || [])
    })
    .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  // Filter pending tasks: lessons that are active AND don't have a grade for this student
  const activeIds = new Set(grades.map(g => g.lesson_id))
  const pendingTasks = lessons.filter(l => l.status === 'active' && !activeIds.has(l.id))
  const completedTasks = grades

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role="student" userName={user?.full_name || 'Оқушы'} userClass={user?.school || ''} onLogout={handleLogout} />
      <TopBar breadcrumb="Тапсырмалар" subtitle="Белсенді және аяқталған сабақтар" hasSidebar />

      <main className="ml-64 p-8 space-y-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-[#BFE3E1] border-t-[#2F7F86] animate-spin" />
            <p className="text-sm text-[#66B2B2] font-bold">Тапсырмалар жүктелуде...</p>
          </div>
        ) : (
          <>
            {/* Banner */}
            <div className="relative rounded-3xl overflow-hidden px-8 py-7 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 60%, #2F7F86 100%)', boxShadow: '0 8px 32px rgba(15,76,92,0.2)' }}>
              <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10"
                style={{ background: 'radial-gradient(circle at right, #BFE3E1, transparent)' }} />
              <div className="relative z-10">
                <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">Сіздің үлгеріміңіз</p>
                <h2 className="font-['Space_Grotesk'] text-3xl font-black text-white">Барлық тапсырмалар</h2>
              </div>
              <div className="relative z-10 flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-['Space_Grotesk'] font-black text-[#f59e0b]">{pendingTasks.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]">Орындалмаған</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-['Space_Grotesk'] font-black text-[#22c55e]">{completedTasks.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]">Аяқталған</div>
                </div>
              </div>
            </div>

            {/* Pending Tasks Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#0F4C5C]">Жаңа тапсырмалар</h3>
                {pendingTasks.length > 0 && <span className="badge-active bg-[#f59e0b]/20 text-[#d97706] border-[#f59e0b]/30">{pendingTasks.length} тапсырма</span>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pendingTasks.map(task => {
                  const meta = TYPE_META[task.lesson_type] || TYPE_META.quiz
                  return (
                  <div key={`pending-${task.id}`} className="card-glow p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-transform bg-white"
                    style={{ border: `1.5px solid ${meta.border}33` }}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: meta.bg, color: meta.color }}>
                          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
                          style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                      </div>
                      <h4 className="font-bold text-lg text-[#0F4C5C] mb-1 leading-tight">{task.title}</h4>
                      <p className="text-sm text-[#66B2B2] mb-4">{task.subject || task.class_name}</p>

                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-xs text-[#66B2B2]">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          <span>Мұғалім: <b>{task.teacher_name}</b></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#66B2B2]">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>Уақыты: <b>{task.duration} мин</b></span>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => navigate(`/test?lessonId=${task.id}`)}
                      className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
                      style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.border})` }}>
                      {task.lesson_type === 'video' ? 'Видеоны қарау'
                        : task.lesson_type === 'reading' ? 'Оқуды бастау'
                        : task.lesson_type === 'task' ? 'Тапсырманы орындау'
                        : 'Тестті бастау'}
                    </button>
                  </div>
                  )
                })}
                
                {pendingTasks.length === 0 && (
                  <div className="col-span-full card-glow py-10 rounded-3xl text-center border-dashed border-2 border-[#BFE3E1]">
                    <div className="w-16 h-16 rounded-full bg-[#E6F4F3] mx-auto flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-2xl text-[#2F7F86]">task_alt</span>
                    </div>
                    <h4 className="font-bold text-lg text-[#0F4C5C] mb-1">Барлық тапсырмалар орындалды!</h4>
                    <p className="text-sm text-[#66B2B2]">Жан біткеннің демалатын уақыты келді, жарайсың!</p>
                  </div>
                )}
              </div>
            </section>

            {/* Completed Tasks Section */}
            <section className="pt-4">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="font-['Space_Grotesk'] text-xl font-bold text-[#0F4C5C]">Аяқталған тапсырмалар</h3>
                <span className="badge-success">{completedTasks.length}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {completedTasks.map(task => (
                  <div key={`completed-${task.id}`} className="card-glow p-6 rounded-2xl flex flex-col justify-between border border-[#22c55e]/30 bg-white opacity-80 hover:opacity-100 transition-opacity">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#dcfce7] text-[#16a34a]">
                          <span className="material-symbols-outlined text-xl">verified</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#16a34a] bg-[#dcfce7] px-2 py-1 rounded-full uppercase tracking-wider">
                          {new Date(task.grade_date).toLocaleDateString('kk-KZ')}
                        </span>
                      </div>
                      <h4 className="font-bold text-lg text-[#0F4C5C] mb-1 leading-tight">{task.lesson_title || 'Сабақ атауы көрсетілмеген'}</h4>
                      <p className="text-sm text-[#66B2B2] mb-4">{task.subject}</p>
                      
                    </div>
                    
                    <div className="pt-4 mt-2 border-t border-[#BFE3E1]/30 flex justify-between items-end">
                      <span className="text-xs text-[#66B2B2] uppercase font-bold tracking-wider">Нәтиже</span>
                      <div className="text-right">
                        <span className="text-2xl font-['Space_Grotesk'] font-black text-[#0F4C5C]">{Number(task.score)}</span>
                        <span className="text-xs font-bold text-[#66B2B2]"> / 100</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {completedTasks.length === 0 && (
                  <div className="col-span-full py-10 text-center text-[#66B2B2] text-sm">
                    Әзірге аяқталған тапсырмалар жоқ.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
