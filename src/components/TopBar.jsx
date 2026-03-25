export default function TopBar({ breadcrumb, subtitle, hasSidebar = true }) {
  const today = new Date().toLocaleDateString('kk-KZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <header className={`topbar ${hasSidebar ? 'ml-64' : ''} flex justify-between items-center px-8 py-4 sticky top-0 z-40`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-label uppercase tracking-widest">
          <span className="text-[#66B2B2]">{breadcrumb}</span>
          {subtitle && (
            <>
              <span className="text-[#BFE3E1]">/</span>
              <span className="font-bold text-[#2F7F86]">{subtitle}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: '#f0fafa', border: '1px solid #BFE3E1' }}>
          <span className="material-symbols-outlined text-[#66B2B2] text-sm">calendar_today</span>
          <span className="text-sm font-semibold text-[#0F4C5C]">{today}</span>
        </div>

        <div className="flex items-center gap-1">
          <button className="relative p-2 rounded-xl transition-all hover:bg-[#E6F4F3] text-[#66B2B2] hover:text-[#2F7F86]">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2F7F86] rounded-full" />
          </button>
          <button className="p-2 rounded-xl transition-all hover:bg-[#E6F4F3] text-[#66B2B2] hover:text-[#2F7F86]">
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>

          {/* Avatar */}
          <div className="ml-1 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #66B2B2, #2F7F86)' }}>
            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          </div>
        </div>
      </div>
    </header>
  )
}
