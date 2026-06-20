import { NavLink, useLocation } from 'react-router-dom'
import isotipoKupan from '../assets/brand/isotipo-kupan.png'
import { getActiveNavId, getPrimaryNavItemsForUser } from '../navigation/routes.js'
import { cn } from './ui/index.js'

const iconPaths = {
  calendar: (
    <>
      <path d="M7 8h10" />
      <path d="M8 4v3" />
      <path d="M16 4v3" />
      <rect width="14" height="15" x="5" y="5" rx="3" />
      <path d="M8 12h2" />
      <path d="M12 12h2" />
      <path d="M16 12h.01" />
      <path d="M8 16h2" />
      <path d="M12 16h2" />
    </>
  ),
  wod: (
    <>
      <path d="M6 18V8" />
      <path d="M18 18V8" />
      <path d="M4 10h4" />
      <path d="M16 10h4" />
      <path d="M8 12h8" />
      <path d="M9 18h6" />
      <path d="M12 12v6" />
    </>
  ),
  community: (
    <>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M3.5 19c.8-3 2.4-4.5 4.5-4.5s3.7 1.5 4.5 4.5" />
      <path d="M11.5 19c.8-3 2.4-4.5 4.5-4.5s3.7 1.5 4.5 4.5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c1.1-4 3.4-6 7-6s5.9 2 7 6" />
    </>
  ),
}

function NavIcon({ icon, isActive }) {
  if (icon === 'home') return <img className="h-5 w-5 object-contain" src={isotipoKupan} alt="" width="20" height="20" decoding="async" />

  return (
    <svg className={cn('h-5 w-5', isActive ? 'stroke-kupan-black' : 'stroke-current')} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[icon] ?? iconPaths.profile}
    </svg>
  )
}

export function BottomNav({ currentUser }) {
  const location = useLocation()
  const activeNavId = getActiveNavId(location.pathname)
  const navItems = getPrimaryNavItemsForUser(currentUser)

  return (
    <nav className="k-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-kupan-border bg-kupan-black/96 px-2 pt-2 backdrop-blur-2xl" aria-label="Navegación principal">
      <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1">
        {navItems.map((page) => {
          const isActiveByGroup = activeNavId === page.id

          return (
            <NavLink
              key={page.id}
              to={page.path}
              aria-label={page.label}
              aria-current={isActiveByGroup ? 'page' : undefined}
              className={({ isActive }) => {
                const active = isActive || isActiveByGroup
                return cn(
                  'k-tab-item relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-[0.62rem] font-black transition duration-200',
                  active
                    ? 'border-kupan-ember/55 bg-kupan-ember text-kupan-black shadow-[0_10px_24px_rgba(240,68,68,0.26)]'
                    : 'border-transparent text-white/60 hover:border-kupan-border hover:bg-white/10 hover:text-white',
                )
              }}
            >
              {({ isActive }) => {
                const active = isActive || isActiveByGroup
                return (
                  <span className="flex min-w-0 flex-col items-center justify-center gap-1 transition duration-150 active:scale-95 sm:hover:-translate-y-0.5">
                    {active ? <span className="absolute left-1/2 top-1 h-1 w-6 -translate-x-1/2 rounded-full bg-kupan-black/80" aria-hidden="true" /> : null}
                    <span className={cn('mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-xs', active ? 'bg-white/20' : 'bg-white/10')}>
                      <NavIcon icon={page.icon} isActive={active} />
                    </span>
                    <span className="max-w-full truncate leading-none">{page.label}</span>
                  </span>
                )
              }}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
