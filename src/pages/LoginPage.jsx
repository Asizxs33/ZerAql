import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [role, setRole] = useState('student')
  const [tab, setTab] = useState('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '', surname: '', school: '', teacher_code: '' })
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        const user = await login(form.email, form.password)
        navigate(user.role === 'student' ? '/student' : '/teacher')
      } else {
        const user = await register({
          email: form.email,
          password: form.password,
          full_name: `${form.full_name} ${form.surname}`.trim(),
          role,
          school: form.school,
          teacher_code: form.teacher_code,
        })
        navigate(user.role === 'student' ? '/student' : '/teacher')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left dark panel */}
      <section className="hidden md:flex md:w-[42%] flex-col items-center justify-center p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F4C5C 0%, #0a3a47 50%, #1a6474 100%)' }}>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#BFE3E1 1px, transparent 1px), linear-gradient(90deg, #BFE3E1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Blobs */}
        <div className="absolute w-80 h-80 rounded-full opacity-15 top-[-60px] right-[-60px]"
          style={{ background: 'radial-gradient(circle, #66B2B2, transparent)', filter: 'blur(60px)' }} />
        <div className="absolute w-60 h-60 rounded-full opacity-10 bottom-[-40px] left-[-40px]"
          style={{ background: 'radial-gradient(circle, #BFE3E1, transparent)', filter: 'blur(50px)' }} />

        {/* Logo + animated visual */}
        <div className="relative z-10 w-full max-w-xs text-center space-y-8">

          {/* Animated rings */}
          <div className="relative w-72 h-72 mx-auto">
            <div className="absolute inset-0 rounded-full animate-[spin_20s_linear_infinite]"
              style={{ border: '2px dashed rgba(191,227,225,0.55)' }} />
            <div className="absolute inset-6 rounded-full animate-[spin_15s_linear_infinite_reverse]"
              style={{ border: '1.5px dashed rgba(191,227,225,0.35)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/icon2.jpg" alt="ZerAql"
                className="w-40 h-40 rounded-full object-cover"
                style={{ boxShadow: '0 0 40px rgba(102,178,178,0.5)', border: '3px solid rgba(255,255,255,0.2)' }} />
            </div>
            {/* Dots */}
            {[0, 72, 144, 216, 288].map((deg, i) => (
              <div key={i} className="absolute w-3 h-3 rounded-full"
                style={{
                  background: i % 2 === 0 ? '#66B2B2' : '#BFE3E1',
                  top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 130}px - 6px)`,
                  left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 130}px - 6px)`,
                  opacity: 0.6,
                }} />
            ))}
          </div>

          {/* Brand name */}
          <div className="text-center">
            <span className="font-['Orbitron'] font-black"
              style={{
                fontSize: '3rem',
                color: '#ffffff',
                letterSpacing: '0.25em',
                textShadow: '0 0 24px rgba(255,255,255,0.35), 0 2px 8px rgba(0,0,0,0.3)',
              }}>
              ZerAql
            </span>
          </div>

          <div className="space-y-3">
            <p className="font-['Space_Grotesk'] font-bold text-xl text-[#BFE3E1] leading-snug">
              Оқушының үлгерімі — өз қолыңда
            </p>
            <div className="w-10 h-0.5 mx-auto rounded" style={{ background: 'rgba(102,178,178,0.4)' }} />
            <p className="text-sm text-[#BFE3E1]/50">
              AI · Болжамды аналитика · ZerAql
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {[
              { label: 'AI Эмоция', icon: 'mood' },
              { label: 'Зейін', icon: 'ads_click' },
              { label: 'Пульс', icon: 'favorite' },
              { label: 'Анти-чит', icon: 'shield_person' },
            ].map(tag => (
              <span key={tag.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#BFE3E1', border: '1px solid rgba(191,227,225,0.25)' }}>
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Right form panel */}
      <section className="w-full md:w-[58%] flex flex-col items-center justify-center p-8 md:p-14 overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, #f0fafa 0%, #e8f7f6 100%)' }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <span className="font-['Space_Grotesk'] font-black text-3xl tracking-widest text-[#0F4C5C] uppercase">ZerAql</span>
          </div>

          <div className="mb-8">
            <h1 className="font-['Space_Grotesk'] text-3xl font-black text-[#0F4C5C]">Жүйеге кіру</h1>
            <p className="text-[#66B2B2] text-sm mt-1">Профиліңізге кіріңіз немесе тіркеліңіз</p>
          </div>

          {/* Role toggle */}
          <div className="flex p-1.5 rounded-2xl mb-8 gap-2"
            style={{ background: '#fff', border: '1.5px solid #BFE3E1', boxShadow: '0 2px 8px rgba(15,76,92,0.06)' }}>
            {[
              { id: 'student', label: 'Оқушымын', icon: 'school' },
              { id: 'teacher', label: 'Мұғаліммін', icon: 'co_present' },
            ].map(r => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all"
                style={role === r.id ? {
                  background: 'linear-gradient(135deg, #2F7F86, #0F4C5C)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(47,127,134,0.3)',
                } : { color: '#66B2B2' }}>
                <span className="material-symbols-outlined text-sm" style={role === r.id ? { fontVariationSettings: "'FILL' 1" } : {}}>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>

          {/* Tab */}
          <div className="flex border-b border-[#BFE3E1] mb-7">
            {[{ id: 'login', label: 'Кіру' }, { id: 'register', label: 'Тіркелу' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-8 py-3.5 text-sm font-bold transition-all"
                style={tab === t.id ? { borderBottom: '2.5px solid #2F7F86', color: '#0F4C5C', marginBottom: '-1px' } : { color: '#66B2B2' }}>
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-bold text-red-600 flex items-center gap-2"
              style={{ background: '#fef2f2', border: '1.5px solid #fca5a5' }}>
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {tab === 'login' ? (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Email</label>
                  <div className="relative">
                    <input className="input-field pr-12" type="email" placeholder="example@mail.kz"
                      value={form.email} onChange={set('email')} required />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#66B2B2] text-xl">mail</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Құпия сөз</label>
                  <div className="relative">
                    <input className="input-field pr-12" type="password" placeholder="••••••••"
                      value={form.password} onChange={set('password')} required />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#66B2B2] text-xl">lock</span>
                  </div>
                </div>
                <div className="text-right">
                  <a href="#" className="text-xs font-bold text-[#2F7F86] hover:text-[#0F4C5C] transition-colors">Құпия сөзді ұмыттым?</a>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Аты</label>
                    <div className="relative">
                      <input className="input-field pr-10" type="text" placeholder="Ахмет"
                        value={form.full_name} onChange={set('full_name')} required />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-lg">person</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Жөні</label>
                    <div className="relative">
                      <input className="input-field pr-10" type="text" placeholder="Байтұрсынұлы"
                        value={form.surname} onChange={set('surname')} required />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#66B2B2] text-lg">badge</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Email</label>
                  <div className="relative">
                    <input className="input-field pr-12" type="email" placeholder="example@mail.kz"
                      value={form.email} onChange={set('email')} required />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#66B2B2] text-xl">mail</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Мектеп</label>
                  <div className="relative">
                    <input className="input-field pr-12" type="text" placeholder="Мектеп атауы"
                      value={form.school} onChange={set('school')} />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#66B2B2] text-xl">search</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">Құпия сөз</label>
                  <div className="relative">
                    <input className="input-field pr-12" type="password" placeholder="••••••••"
                      value={form.password} onChange={set('password')} required />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#66B2B2] text-xl">lock</span>
                  </div>
                </div>

                {/* Registration code */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#66B2B2] mb-2 ml-1">
                    {role === 'teacher' ? 'Тіркелу құпия коды' : 'Сынып коды'}
                  </label>
                  <input className="input-field" type="text" placeholder={role === 'teacher' ? 'ZERAQL-2026' : '9A-X37'}
                    value={form.teacher_code} onChange={set('teacher_code')} maxLength={20} required={role === 'teacher'} />
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-60">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {tab === 'login' ? 'Жүйеге кіру' : 'Тіркелу'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#BFE3E1]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="px-4 font-bold text-[#66B2B2]" style={{ background: 'linear-gradient(180deg, #f0fafa, #e8f7f6)' }}>немесе</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{ label: 'Google', icon: 'language' }, { label: 'Apple', icon: 'phone_iphone' }].map(s => (
                <button key={s.label} type="button"
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-[#0F4C5C] transition-all hover:-translate-y-0.5"
                  style={{ background: '#fff', border: '1.5px solid #BFE3E1', boxShadow: '0 2px 6px rgba(15,76,92,0.04)' }}>
                  <span className="material-symbols-outlined text-[#2F7F86]">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </form>

          <p className="text-center text-xs text-[#66B2B2] mt-8">
            © 2024 ZerAql EdTech ·{' '}
            <a href="#" className="hover:text-[#0F4C5C] transition-colors">Privacy</a> ·{' '}
            <a href="#" className="hover:text-[#0F4C5C] transition-colors">Terms</a>
          </p>
        </div>
      </section>
    </div>
  )
}
