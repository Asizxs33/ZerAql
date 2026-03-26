import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import 'leaflet/dist/leaflet.css'

// ── South Kazakhstan schools & universities dataset ────────────────────────
const SCHOOLS = [
  // Shymkent
  { id:1,  name: '№1 Мектеп-гимназия',          city: 'Шымкент',   lat: 42.3417, lng: 69.5901, type: 'school',     avg: 4.2, students: 1240, at_risk: 8,  district: 'Әл-Фараби' },
  { id:2,  name: 'Назарбаев Зияткерлік мектебі', city: 'Шымкент',   lat: 42.3180, lng: 69.5760, type: 'school',     avg: 4.7, students: 600,  at_risk: 3,  district: 'Әбу Дайы' },
  { id:3,  name: 'ОҚМУ (Оңтүстік Қаз. МУ)',     city: 'Шымкент',   lat: 42.3300, lng: 69.6100, type: 'university', avg: 3.9, students: 8400, at_risk: 18, district: 'Енбекші' },
  { id:4,  name: 'Шымкент Университеті',         city: 'Шымкент',   lat: 42.3500, lng: 69.5650, type: 'university', avg: 3.6, students: 5200, at_risk: 22, district: 'Аль-Фараби' },
  { id:5,  name: '№37 орта мектеп',              city: 'Шымкент',   lat: 42.3250, lng: 69.6300, type: 'school',     avg: 3.4, students: 980,  at_risk: 31, district: 'Каратау' },
  { id:6,  name: '№78 орта мектеп',              city: 'Шымкент',   lat: 42.3600, lng: 69.5500, type: 'school',     avg: 3.8, students: 1100, at_risk: 14, district: 'Абай' },
  { id:7,  name: 'Медициналық колледж',           city: 'Шымкент',   lat: 42.3100, lng: 69.5900, type: 'college',    avg: 4.0, students: 1800, at_risk: 11, district: 'Аль-Фараби' },

  // Turkestan
  { id:8,  name: 'Түркістан №3 мектебі',         city: 'Түркістан', lat: 43.2975, lng: 68.2717, type: 'school',     avg: 3.7, students: 860,  at_risk: 19, district: 'Орталық' },
  { id:9,  name: 'Қожа Ахмет Яссауи Университеті', city: 'Түркістан', lat: 43.3010, lng: 68.2850, type: 'university', avg: 4.1, students: 12000, at_risk: 12, district: 'Ясауи' },
  { id:10, name: 'Түркістан гимназиясы',          city: 'Түркістан', lat: 43.2900, lng: 68.2600, type: 'school',     avg: 4.3, students: 720,  at_risk: 7,  district: 'Орталық' },
  { id:11, name: 'Педагогикалық колледж',          city: 'Түркістан', lat: 43.3100, lng: 68.2950, type: 'college',    avg: 3.9, students: 950,  at_risk: 15, district: 'Ясауи' },

  // Kentau
  { id:12, name: 'Кентау №5 мектебі',            city: 'Кентау',    lat: 43.5166, lng: 68.5083, type: 'school',     avg: 3.3, students: 640,  at_risk: 34, district: 'Орталық' },
  { id:13, name: 'Кентау техникалық колледжі',    city: 'Кентау',    lat: 43.5250, lng: 68.5150, type: 'college',    avg: 3.5, students: 480,  at_risk: 28, district: 'Горняк' },

  // Arys
  { id:14, name: 'Арыс №2 орта мектебі',         city: 'Арыс',      lat: 42.4344, lng: 68.8097, type: 'school',     avg: 3.6, students: 550,  at_risk: 24, district: 'Орталық' },
  { id:15, name: 'Арыс гимназиясы №1',           city: 'Арыс',      lat: 42.4250, lng: 68.8200, type: 'school',     avg: 4.0, students: 490,  at_risk: 10, district: 'Жаңа' },

  // Saryagash
  { id:16, name: 'Сарыағаш №7 мектебі',          city: 'Сарыағаш',  lat: 41.4600, lng: 69.1700, type: 'school',     avg: 3.5, students: 720,  at_risk: 27, district: 'Орталық' },
  { id:17, name: 'Сарыағаш медициналық колледжі', city: 'Сарыағаш',  lat: 41.4700, lng: 69.1800, type: 'college',    avg: 3.8, students: 560,  at_risk: 17, district: 'Жаңа' },

  // Sozaq
  { id:18, name: 'Созақ №1 орта мектебі',        city: 'Созақ',     lat: 44.1500, lng: 68.0000, type: 'school',     avg: 3.2, students: 380,  at_risk: 38, district: 'Орталық' },

  // Lenger
  { id:19, name: 'Ленгер №4 мектебі',            city: 'Ленгер',    lat: 42.1800, lng: 69.8700, type: 'school',     avg: 3.6, students: 610,  at_risk: 22, district: 'Орталық' },
  { id:20, name: 'Ленгер техникумы',              city: 'Ленгер',    lat: 42.1700, lng: 69.8800, type: 'college',    avg: 3.4, students: 420,  at_risk: 30, district: 'Жаңа' },
]

const CITIES = ['Барлығы', 'Шымкент', 'Түркістан', 'Кентау', 'Арыс', 'Сарыағаш', 'Созақ', 'Ленгер']
const TYPES  = ['Барлығы', 'school', 'university', 'college']
const TYPE_LABELS = { school: 'Мектеп', university: 'Университет', college: 'Колледж' }

function gradeColor(avg) {
  if (avg >= 4.5) return '#22c55e'
  if (avg >= 4.0) return '#2F7F86'
  if (avg >= 3.5) return '#f59e0b'
  if (avg >= 3.0) return '#f97316'
  return '#ef4444'
}

function gradeLabel(avg) {
  if (avg >= 4.5) return 'Үздік'
  if (avg >= 4.0) return 'Жақсы'
  if (avg >= 3.5) return 'Орташа'
  if (avg >= 3.0) return 'Төмен'
  return 'Қауіп'
}

export default function ComparisonMap() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [cityFilter, setCityFilter] = useState('Барлығы')
  const [typeFilter, setTypeFilter] = useState('Барлығы')
  const [selected, setSelected] = useState(null)
  const [metric, setMetric] = useState('avg') // avg | at_risk | students

  const filtered = SCHOOLS.filter(s =>
    (cityFilter === 'Барлығы' || s.city === cityFilter) &&
    (typeFilter === 'Барлығы' || s.type === typeFilter)
  )

  const avgAll = (filtered.reduce((a, s) => a + s.avg, 0) / (filtered.length || 1)).toFixed(2)
  const totalStudents = filtered.reduce((a, s) => a + s.students, 0)
  const avgRisk = (filtered.reduce((a, s) => a + s.at_risk, 0) / (filtered.length || 1)).toFixed(1)
  const topSchool = [...filtered].sort((a, b) => b.avg - a.avg)[0]
  const worstSchool = [...filtered].sort((a, b) => a.avg - b.avg)[0]

  const markerRadius = (s) => {
    if (metric === 'students') return Math.max(8, Math.min(30, s.students / 200))
    if (metric === 'at_risk') return Math.max(8, Math.min(28, s.at_risk / 2))
    return 12
  }

  const markerColor = (s) => {
    if (metric === 'at_risk') {
      if (s.at_risk >= 30) return '#ef4444'
      if (s.at_risk >= 20) return '#f97316'
      if (s.at_risk >= 10) return '#f59e0b'
      return '#22c55e'
    }
    return gradeColor(s.avg)
  }

  return (
    <div className="page-bg min-h-screen">
      <Sidebar role={user?.role || 'teacher'} userName={user?.full_name} userClass={user?.school} onLogout={() => { logout(); navigate('/login') }} />
      <TopBar breadcrumb="Салыстырмалы карта" subtitle="Оңтүстік Қазақстан — мектептер мен университеттер" hasSidebar />

      <main className="ml-64 p-6 space-y-5">

        {/* Header banner */}
        <div className="relative rounded-3xl overflow-hidden px-8 py-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0F4C5C 0%, #1a6474 60%, #2F7F86 100%)', boxShadow: '0 8px 32px rgba(15,76,92,0.2)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #BFE3E1, transparent 60%)' }} />
          <div className="relative z-10">
            <p className="text-[#BFE3E1]/60 text-xs font-bold uppercase tracking-wider mb-1">ОҚО · 2023–2024</p>
            <h1 className="font-['Space_Grotesk'] text-3xl font-black text-white">Салыстырмалы карта</h1>
            <p className="text-[#BFE3E1]/80 text-sm mt-1">{filtered.length} оқу орны · {totalStudents.toLocaleString()} оқушы</p>
          </div>
          <div className="relative z-10 flex gap-6">
            {[
              { label: 'Орт. баға', value: avgAll, color: gradeColor(Number(avgAll)) },
              { label: 'Қауіп %', value: `${avgRisk}%`, color: '#f59e0b' },
              { label: 'Оқу орын', value: filtered.length, color: '#BFE3E1' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-['Space_Grotesk'] font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-[#BFE3E1]/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters + metric toggle */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-[#BFE3E1]">
            {CITIES.map(c => (
              <button key={c} onClick={() => setCityFilter(c)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={cityFilter === c
                  ? { background: '#0F4C5C', color: '#fff' }
                  : { color: '#66B2B2' }}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-[#BFE3E1]">
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={typeFilter === t
                  ? { background: '#2F7F86', color: '#fff' }
                  : { color: '#66B2B2' }}>
                {t === 'Барлығы' ? t : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-[#BFE3E1]">
            {[
              { id: 'avg',      label: 'Баға', icon: 'grade' },
              { id: 'at_risk',  label: 'Қауіп', icon: 'warning' },
              { id: 'students', label: 'Оқушы', icon: 'groups' },
            ].map(m => (
              <button key={m.id} onClick={() => setMetric(m.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={metric === m.id
                  ? { background: '#E6F4F3', color: '#0F4C5C' }
                  : { color: '#66B2B2' }}>
                <span className="material-symbols-outlined text-sm">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map + sidebar */}
        <div className="flex gap-5" style={{ height: '520px' }}>

          {/* Map */}
          <div className="flex-1 rounded-3xl overflow-hidden shadow-lg border border-[#BFE3E1]">
            <MapContainer
              center={[42.7, 68.9]}
              zoom={7}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CartoDB'
              />
              {filtered.map(s => (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lng]}
                  radius={markerRadius(s)}
                  pathOptions={{
                    fillColor: markerColor(s),
                    color: selected?.id === s.id ? '#0F4C5C' : '#fff',
                    weight: selected?.id === s.id ? 3 : 1.5,
                    fillOpacity: 0.85,
                  }}
                  eventHandlers={{ click: () => setSelected(s) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', padding: '2px 4px' }}>
                      <strong style={{ color: '#0F4C5C' }}>{s.name}</strong><br />
                      <span style={{ color: '#66B2B2', fontSize: '11px' }}>{s.city} · {TYPE_LABELS[s.type]}</span><br />
                      <span style={{ color: markerColor(s), fontWeight: 700 }}>★ {s.avg} — {gradeLabel(s.avg)}</span><br />
                      <span style={{ color: '#f59e0b', fontSize: '11px' }}>⚠ Қауіп: {s.at_risk}%</span>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Right panel */}
          <div className="w-72 flex flex-col gap-4 overflow-y-auto">

            {/* Selected school card */}
            {selected ? (
              <div className="card rounded-2xl p-5 space-y-4 border-2" style={{ borderColor: gradeColor(selected.avg) + '60' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: gradeColor(selected.avg) }}>
                      {TYPE_LABELS[selected.type]}
                    </span>
                    <h3 className="font-['Space_Grotesk'] font-black text-sm text-[#0F4C5C] leading-tight mt-0.5">{selected.name}</h3>
                    <p className="text-xs text-[#66B2B2]">{selected.city}, {selected.district}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#BFE3E1] hover:text-[#66B2B2]">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Орт. баға', value: selected.avg, color: gradeColor(selected.avg), icon: 'grade' },
                    { label: 'Деңгей', value: gradeLabel(selected.avg), color: gradeColor(selected.avg), icon: 'trending_up' },
                    { label: 'Оқушылар', value: selected.students.toLocaleString(), color: '#2F7F86', icon: 'groups' },
                    { label: 'Қауіп аймақ', value: `${selected.at_risk}%`, color: selected.at_risk >= 25 ? '#ef4444' : '#f59e0b', icon: 'warning' },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl p-3" style={{ background: m.color + '12' }}>
                      <span className="material-symbols-outlined text-sm" style={{ color: m.color, fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                      <div className="font-black text-sm mt-1" style={{ color: m.color }}>{m.value}</div>
                      <div className="text-[10px] text-[#66B2B2]">{m.label}</div>
                    </div>
                  ))}
                </div>
                {/* Risk bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-[#66B2B2] mb-1">
                    <span>Қауіп деңгейі</span><span>{selected.at_risk}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E6F4F3] overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${selected.at_risk}%`, background: selected.at_risk >= 25 ? '#ef4444' : selected.at_risk >= 15 ? '#f59e0b' : '#22c55e' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="card rounded-2xl p-5 text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#BFE3E1]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <p className="text-sm font-bold text-[#0F4C5C]">Оқу орнын таңдаңыз</p>
                <p className="text-xs text-[#66B2B2]">Картадағы маркерге басыңыз</p>
              </div>
            )}

            {/* Legend */}
            <div className="card rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-[#0F4C5C] uppercase tracking-wider">
                {metric === 'avg' ? 'Баға шкаласы' : metric === 'at_risk' ? 'Қауіп деңгейі' : 'Оқушы саны'}
              </p>
              {metric === 'avg' && [
                { color: '#22c55e', label: '4.5+ — Үздік' },
                { color: '#2F7F86', label: '4.0–4.4 — Жақсы' },
                { color: '#f59e0b', label: '3.5–3.9 — Орташа' },
                { color: '#f97316', label: '3.0–3.4 — Төмен' },
                { color: '#ef4444', label: '< 3.0 — Қауіп' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-[11px] text-[#66B2B2]">{l.label}</span>
                </div>
              ))}
              {metric === 'at_risk' && [
                { color: '#22c55e', label: '< 10% — Қауіп жоқ' },
                { color: '#f59e0b', label: '10–19% — Назар аудар' },
                { color: '#f97316', label: '20–29% — Жоғары қауіп' },
                { color: '#ef4444', label: '30%+ — Критикалық' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-[11px] text-[#66B2B2]">{l.label}</span>
                </div>
              ))}
              {metric === 'students' && (
                <p className="text-[11px] text-[#66B2B2]">Маркер өлшемі — оқушы санына пропорционал</p>
              )}
            </div>

            {/* Top/Bottom schools */}
            <div className="card rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-[#0F4C5C] uppercase tracking-wider">Рейтинг</p>
              {topSchool && (
                <div className="flex items-center gap-2 cursor-pointer hover:bg-[#f0fafa] rounded-xl p-1.5 transition-all" onClick={() => setSelected(topSchool)}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f0fdf4' }}>
                    <span className="material-symbols-outlined text-sm text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F4C5C] truncate">{topSchool.name}</p>
                    <p className="text-[10px] text-[#66B2B2]">{topSchool.city} · ★ {topSchool.avg}</p>
                  </div>
                </div>
              )}
              {worstSchool && worstSchool.id !== topSchool?.id && (
                <div className="flex items-center gap-2 cursor-pointer hover:bg-[#fff5f5] rounded-xl p-1.5 transition-all" onClick={() => setSelected(worstSchool)}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fef2f2' }}>
                    <span className="material-symbols-outlined text-sm text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F4C5C] truncate">{worstSchool.name}</p>
                    <p className="text-[10px] text-[#66B2B2]">{worstSchool.city} · ★ {worstSchool.avg}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom stats grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { city: 'Шымкент',   schools: SCHOOLS.filter(s=>s.city==='Шымкент'),   flag: '🏙' },
            { city: 'Түркістан', schools: SCHOOLS.filter(s=>s.city==='Түркістан'), flag: '🕌' },
            { city: 'Кентау',    schools: SCHOOLS.filter(s=>s.city==='Кентау'),    flag: '⛏' },
            { city: 'Арыс',      schools: SCHOOLS.filter(s=>s.city==='Арыс'),      flag: '🌾' },
          ].map(({ city, schools, flag }) => {
            const avg = (schools.reduce((a,s)=>a+s.avg,0) / (schools.length||1)).toFixed(2)
            const risk = (schools.reduce((a,s)=>a+s.at_risk,0) / (schools.length||1)).toFixed(0)
            return (
              <div key={city} className="card rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 transition-all"
                onClick={() => setCityFilter(city)}
                style={{ border: cityFilter === city ? '2px solid #2F7F86' : undefined }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{flag}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: gradeColor(Number(avg)) + '20', color: gradeColor(Number(avg)) }}>
                    ★ {avg}
                  </span>
                </div>
                <p className="font-['Space_Grotesk'] font-black text-sm text-[#0F4C5C]">{city}</p>
                <p className="text-xs text-[#66B2B2]">{schools.length} оқу орны</p>
                <div className="mt-3 h-1.5 rounded-full bg-[#E6F4F3] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${risk}%`, background: Number(risk) >= 25 ? '#ef4444' : '#f59e0b' }} />
                </div>
                <p className="text-[10px] text-[#66B2B2] mt-1">Қауіп: {risk}%</p>
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}
