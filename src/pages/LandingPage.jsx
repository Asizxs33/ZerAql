import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const features = [
  { icon: 'trending_up', title: 'Прогресс болжау', desc: 'AI алгоритмі оқушының келесі 4 аптадағы үлгерімін 92% дәлдікпен болжайды.', accent: '#2F7F86' },
  { icon: 'psychology', title: 'Әлсіз тақырып анықтау', desc: 'Жүйе қай тақырыпта қиындық барын автоматты анықтап, жеке бағдарлама жасайды.', accent: '#0F4C5C' },
  { icon: 'auto_graph', title: 'Динамикалық бағалау', desc: 'Тест нәтижелері мен зейін деректері негізінде баға болашағын есептейді.', accent: '#f59e0b' },
  { icon: 'notifications_active', title: 'Ерте ескерту', desc: 'Оқушы артта қала бастаған сәтте мұғалімге дереу хабарлама жіберіледі.', accent: '#ef4444' },
]

const steps = [
  { num: '01', title: 'Деректер жиналады', desc: 'Зейін, эмоция, тест нәтижелері' },
  { num: '02', title: 'AI талдайды', desc: 'Үлгерім заңдылықтарын іздейді' },
  { num: '03', title: 'Болжам жасалады', desc: '4 аптаға дейінгі прогноз' },
  { num: '04', title: 'Мұғалім әрекет етеді', desc: 'Жеке оқу жоспары жасалады' },
  { num: '05', title: 'Нәтиже өседі', desc: 'Орташа үлгерім 34% артады' },
]

const cyclingWords = ['үлгерімі', 'зейіні', 'болашағы', 'прогресі', 'бағасы']

export default function LandingPage() {
  const [wordIndex, setWordIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setWordIndex(i => (i + 1) % cyclingWords.length)
        setVisible(true)
      }, 400)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #f0fafa 0%, #e8f7f6 100%)' }}>

      {/* HEADER */}
      <header className="topbar sticky top-0 z-50 flex justify-between items-center px-10 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #66B2B2, #2F7F86)' }}>
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
          </div>
          <span className="font-['Space_Grotesk'] font-black text-xl tracking-widest uppercase text-[#0F4C5C]">ZerAql</span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Платформа', href: '#platform' },
            { label: 'Мүмкіндіктер', href: '#features' },
            { label: 'Қалай жұмыс істейді', href: '#steps' },
            { label: 'Байланыс', href: '#cta' },
          ].map(item => (
            <a key={item.label} href={item.href}
              className="group relative px-4 py-2 rounded-xl text-sm font-bold text-[#0F4C5C] transition-all hover:text-[#2F7F86]"
              onClick={e => {
                e.preventDefault()
                document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' })
              }}>
              <span className="absolute inset-0 rounded-xl bg-[#E6F4F3] opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">{item.label}</span>
              <span className="absolute bottom-1.5 left-4 right-4 h-0.5 rounded-full bg-[#2F7F86] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="px-5 py-2.5 rounded-full text-sm font-bold text-[#2F7F86] border-2 border-[#BFE3E1] hover:border-[#66B2B2] hover:bg-white transition-all">
            Кіру
          </Link>
          <Link to="/login" className="btn-primary text-sm px-6 py-2.5">
            Тегін бастау
          </Link>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-[90vh] flex items-center px-10 md:px-20 overflow-hidden">
          <div className="hero-blob w-[600px] h-[600px] right-[-100px] top-[-100px] opacity-40"
            style={{ background: 'radial-gradient(circle, #BFE3E1 0%, transparent 70%)' }} />
          <div className="hero-blob w-[400px] h-[400px] left-[-50px] bottom-0 opacity-25"
            style={{ background: 'radial-gradient(circle, #66B2B2 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#0F4C5C 1px, transparent 1px), linear-gradient(90deg, #0F4C5C 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

          <div className="grid md:grid-cols-2 gap-16 items-center w-full max-w-7xl mx-auto relative z-10">
            {/* Left */}
            <div className="space-y-8">

              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(47,127,134,0.1)', border: '1px solid rgba(47,127,134,0.2)', color: '#2F7F86' }}>
                <span className="w-2 h-2 rounded-full bg-[#2F7F86] animate-pulse" />
                AI · Болжамды аналитика · EdTech
              </div>

              {/* Headline */}
              <div className="font-['Space_Grotesk'] leading-[1.05]">

                {/* Line 1 — static */}
                <div className="text-[58px] md:text-[76px] font-black text-[#0F4C5C] tracking-tight">
                  Оқушының
                </div>

                {/* Line 2 — cycling animated word */}
                <div className="h-[78px] md:h-[96px] flex items-center overflow-hidden">
                  <span
                    className="text-[58px] md:text-[76px] font-black tracking-tight block transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #2F7F86, #66B2B2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'translateY(0)' : 'translateY(20px)',
                    }}>
                    {cyclingWords[wordIndex]}
                  </span>
                </div>

                {/* Line 3 — static, visible */}
                <div className="text-[58px] md:text-[76px] font-black text-[#0F4C5C] tracking-tight">
                  — өз қолыңда
                </div>

              </div>

              {/* Description */}
              <p className="text-base text-[#0F4C5C]/60 max-w-md leading-relaxed">
                ZerAql — оқушының үлгерімін <span className="font-bold text-[#0F4C5C]">4 аптаға алдын ала</span> болжайтын,
                әлсіз тақырыптарды анықтайтын және мұғалімге <span className="font-bold text-[#2F7F86]">нақты ұсыныс</span> беретін платформа.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-4">
                <Link to="/login" className="btn-primary flex items-center gap-2 text-sm">
                  Тегін бастау
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <a href="#cta"
                  onClick={e => { e.preventDefault(); document.querySelector('#cta')?.scrollIntoView({ behavior: 'smooth' }) }}
                  className="btn-outline flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-lg">mail</span>
                  Байланыс
                </a>
              </div>

              {/* Mini stats */}
              <div className="flex gap-8 pt-4 border-t border-[#BFE3E1]">
                {[
                  { v: '92%', l: 'Болжам дәлдігі' },
                  { v: '34%', l: 'Үлгерім өсімі' },
                  { v: '48', l: 'Серіктес мектеп' },
                ].map(s => (
                  <div key={s.l}>
                    <div className="text-2xl font-['Space_Grotesk'] font-black gradient-text">{s.v}</div>
                    <div className="text-[11px] text-[#66B2B2] uppercase tracking-wider mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Progress mockup */}
            <div className="relative">
              <div className="absolute inset-[-20px] rounded-3xl opacity-30"
                style={{ background: 'radial-gradient(circle at 50% 50%, #66B2B2, transparent 70%)', filter: 'blur(40px)' }} />

              <div className="card relative overflow-hidden" style={{ boxShadow: '0 24px 80px rgba(15,76,92,0.15)' }}>
                {/* Titlebar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#BFE3E1]"
                  style={{ background: 'linear-gradient(90deg, #f8fdfc, #fff)' }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#66B2B2]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Прогресс болжауы · AI v3.1
                  </div>
                  <div className="w-16" />
                </div>

                {/* Student progress preview */}
                <div className="p-5 space-y-4" style={{ background: '#f8fdfc' }}>
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #66B2B2, #2F7F86)' }}>
                        <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-[#0F4C5C]">Асанов Нұржан</div>
                        <div className="text-[9px] text-[#66B2B2] uppercase tracking-wider">9А · Математика</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 rounded-full text-[10px] font-black"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                      Жоғары дамуда
                    </div>
                  </div>

                  {/* Forecast chart bars */}
                  <div className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-wider text-[#66B2B2]">4 аптаға болжам</div>
                    <div className="flex items-end gap-1.5 h-20">
                      {[
                        { label: 'Қаз', val: 72, real: true },
                        { label: '1-апта', val: 76, real: false },
                        { label: '2-апта', val: 81, real: false },
                        { label: '3-апта', val: 85, real: false },
                        { label: '4-апта', val: 89, real: false },
                      ].map((b) => (
                        <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[8px] font-bold" style={{ color: b.real ? '#0F4C5C' : '#2F7F86' }}>{b.val}%</span>
                          <div className="w-full rounded-t-lg"
                            style={{
                              height: `${(b.val / 100) * 64}px`,
                              background: b.real
                                ? 'linear-gradient(180deg, #0F4C5C, #2F7F86)'
                                : 'linear-gradient(180deg, #66B2B2, #BFE3E1)',
                              opacity: b.real ? 1 : 0.7,
                              border: b.real ? 'none' : '1.5px dashed #66B2B2',
                            }} />
                          <span className="text-[7px] text-[#66B2B2]">{b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weak topics */}
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-black uppercase tracking-wider text-[#66B2B2]">Назар аудару керек</div>
                    {[
                      { topic: 'Квадрат теңдеулер', risk: 68, color: '#f59e0b' },
                      { topic: 'Тригонометрия', risk: 45, color: '#ef4444' },
                    ].map(t => (
                      <div key={t.topic} className="flex items-center gap-2">
                        <span className="text-[10px] text-[#0F4C5C] font-bold flex-1">{t.topic}</span>
                        <div className="w-24 h-1.5 rounded-full overflow-hidden bg-[#E6F4F3]">
                          <div className="h-full rounded-full" style={{ width: `${t.risk}%`, backgroundColor: t.color }} />
                        </div>
                        <span className="text-[9px] font-black" style={{ color: t.color }}>{t.risk}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom metrics */}
                <div className="px-5 py-3.5 grid grid-cols-4 gap-3 border-t border-[#BFE3E1]" style={{ background: '#fff' }}>
                  {[
                    { label: 'Болжам', value: '+17%', color: '#2F7F86', icon: 'trending_up' },
                    { label: 'Дәлдік', value: '92%', color: '#0F4C5C', icon: 'verified' },
                    { label: 'Зейін', value: '84%', color: '#66B2B2', icon: 'ads_click' },
                    { label: 'Тәуекел', value: 'Төмен', color: '#16a34a', icon: 'shield' },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <span className="material-symbols-outlined text-lg block mx-auto" style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                      <div className="text-xs font-black" style={{ color: m.color }}>{m.value}</div>
                      <div className="text-[9px] text-[#66B2B2] uppercase tracking-wider">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAND ── */}
        <section id="platform" className="py-14 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 100%)' }} />
          <div className="relative z-10 max-w-6xl mx-auto px-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { v: '92%', l: 'Болжам дәлдігі', icon: 'target' },
              { v: '34%', l: 'Үлгерім өсімі', icon: 'trending_up' },
              { v: '48', l: 'Серіктес мектеп', icon: 'apartment' },
              { v: '1,200+', l: 'Белсенді оқушы', icon: 'school' },
            ].map(s => (
              <div key={s.l} className="space-y-2">
                <span className="material-symbols-outlined text-[#66B2B2] text-2xl block">{s.icon}</span>
                <div className="text-4xl font-['Space_Grotesk'] font-black text-white">{s.v}</div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(191,227,225,0.6)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="py-24 px-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#66B2B2] mb-3">Мүмкіндіктер</p>
            <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-black text-[#0F4C5C]">
              Болашақты болжау технологиясы
            </h2>
            <p className="text-[#66B2B2] mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Тек бақылап қана қоймай — алдын ала біліп, уақытында әрекет етіңіз
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title}
                className="group relative p-8 rounded-2xl bg-white border border-[#BFE3E1] overflow-hidden hover:-translate-y-2 transition-all duration-300"
                style={{ boxShadow: '0 4px 20px rgba(15,76,92,0.06)' }}>
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${f.accent}, transparent)` }} />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                    style={{ background: `${f.accent}15`, border: `1.5px solid ${f.accent}25` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: f.accent, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <h3 className="font-['Space_Grotesk'] text-lg font-black mb-2 text-[#0F4C5C]">{f.title}</h3>
                  <p className="text-sm text-[#66B2B2] leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="steps" className="py-24 relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #f0fafa 0%, #e8f7f6 100%)' }} />
          <div className="relative z-10 max-w-6xl mx-auto px-10">
            <div className="mb-20 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#66B2B2] mb-3">Процесс</p>
              <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-black text-[#0F4C5C]">
                Болжам қалай жасалады?
              </h2>
              <p className="text-[#66B2B2] mt-4 max-w-lg mx-auto text-sm">
                5 қадам — және оқушының болашақ үлгерімі экранда
              </p>
            </div>

            <div className="relative flex flex-col md:flex-row justify-between gap-8">
              <div className="hidden md:block absolute top-10 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, #BFE3E1 20%, #BFE3E1 80%, transparent)' }} />

              {steps.map((s) => (
                <div key={s.num} className="relative z-10 flex flex-col items-center text-center group flex-1">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{ background: '#fff', border: '2px solid #BFE3E1', boxShadow: '0 4px 16px rgba(15,76,92,0.06)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#66B2B2'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#BFE3E1'}>
                    <span className="text-2xl font-['Space_Grotesk'] font-black gradient-text">{s.num}</span>
                  </div>
                  <h4 className="font-black text-sm mb-1.5 text-[#0F4C5C]">{s.title}</h4>
                  <p className="text-xs text-[#66B2B2] max-w-[130px] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="cta" className="py-24 px-10">
          <div className="max-w-4xl mx-auto text-center relative overflow-hidden rounded-3xl p-14"
            style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 50%, #2F7F86 100%)', boxShadow: '0 32px 80px rgba(15,76,92,0.3)' }}>
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #66B2B2, transparent)' }} />
            <div className="absolute bottom-[-30px] left-[-30px] w-36 h-36 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #BFE3E1, transparent)' }} />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#BFE3E1' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Тіркелу тегін — несиелік карта қажет емес
              </div>
              <h2 className="font-['Space_Grotesk'] text-4xl md:text-5xl font-black text-white mb-4">
                Оқушыларыңыздың болашағын бүгін болжаңыз
              </h2>
              <p className="text-[#BFE3E1]/70 text-base mb-10 max-w-lg mx-auto">
                48 мектеп қосылды. Орташа үлгерім 34%-ға өсті. Сіздің кезегіңіз.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/login" className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider text-[#0F4C5C] transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #BFE3E1, #fff)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  Тегін тіркелу
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link to="/login" className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider text-white border-2 transition-all hover:bg-white/10"
                  style={{ borderColor: 'rgba(191,227,225,0.4)' }}>
                  Демо нұсқасын көру
                  <span className="material-symbols-outlined">play_circle</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#BFE3E1] bg-white py-12">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #66B2B2, #2F7F86)' }}>
                <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
              </div>
              <span className="font-['Space_Grotesk'] font-black text-lg tracking-widest uppercase text-[#0F4C5C]">ZerAql</span>
            </div>
            <p className="text-xs text-[#66B2B2] max-w-xs leading-relaxed">
              Оқушының прогресін болжайтын AI платформасы.<br />Білім берудің болашағын бүгін жасап жатырмыз.
            </p>
          </div>

          <div className="flex gap-16">
            {[
              { title: 'Платформа', items: ['Мүмкіндіктер', 'Қалай жұмыс істейді', 'Баға', 'Жаңалықтар'] },
              { title: 'Байланыс', items: ['Privacy Policy', 'Terms of Service', 'AI Ethics'] },
            ].map(col => (
              <div key={col.title}>
                <h5 className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-widest text-[#2F7F86] mb-4">{col.title}</h5>
                <ul className="space-y-2.5">
                  {col.items.map(item => (
                    <li key={item}><a href="#" className="text-xs text-[#66B2B2] hover:text-[#0F4C5C] transition-colors">{item}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-10 mt-10 pt-6 border-t border-[#BFE3E1] flex justify-between items-center">
          <span className="text-xs text-[#66B2B2]">© 2025 ZerAql EdTech. Прогрессті болжаймыз.</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-bold text-[#2F7F86] uppercase tracking-widest">AI жүйесі жұмыс істеуде</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
