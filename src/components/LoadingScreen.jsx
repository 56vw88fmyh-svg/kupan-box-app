import { motion as Motion } from 'framer-motion'
import logoKupan from '../assets/brand/logo-kupan.png'

export function LoadingScreen() {
  return (
    <Motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-kupan-black px-8"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <Motion.div
        className="flex w-full max-w-xs flex-col items-center gap-5"
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Motion.img
          className="max-h-36 w-full object-contain"
          src={logoKupan}
          alt="KUPAN"
          animate={{ scale: [1, 1.025, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <Motion.div
            className="h-full rounded-full bg-kupan-ember shadow-glow"
            initial={{ width: '18%' }}
            animate={{ width: ['18%', '72%', '100%'] }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <Motion.p
          className="text-xs font-black uppercase tracking-[0.24em] text-kupan-flame"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          Preparando tu WOD
        </Motion.p>
      </Motion.div>
    </Motion.div>
  )
}
