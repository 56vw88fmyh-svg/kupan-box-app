import { motion as Motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import isotipoKupan from '../assets/brand/isotipo-kupan.png'

export function BottomNav({ pages }) {
  return (
    <nav className="k-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-kupan-black/96 px-2 pt-2 backdrop-blur-2xl">
      <div className="mx-auto grid max-w-5xl grid-cols-7 gap-1">
        {pages.filter((page) => !page.hidden).map((page) => {
          return (
            <NavLink
              key={page.id}
              to={page.path}
              aria-label={page.label}
              className={({ isActive }) =>
                `k-tab-item flex flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.62rem] font-black transition duration-200 ${
                  isActive ? 'bg-kupan-ember text-white shadow-[0_10px_24px_rgba(255,90,31,0.26)]' : 'text-white/55 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <Motion.span
                  className="flex flex-col items-center justify-center gap-1"
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ y: -1 }}
                  transition={{ duration: 0.14 }}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs ${isActive ? 'bg-white/15' : 'bg-white/10'}`}>
                    {page.id === 'home' ? <img className="h-5 w-5 object-contain" src={isotipoKupan} alt="" /> : page.icon}
                  </span>
                  <span className="max-w-full truncate leading-none">{page.label}</span>
                </Motion.span>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
