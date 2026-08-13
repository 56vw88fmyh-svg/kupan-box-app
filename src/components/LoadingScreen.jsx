import { gymConfig } from '../config/gymConfig.js'

export function LoadingScreen() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex animate-fade-out items-center justify-center bg-kupan-black px-8"
    >
      <div className="flex w-full max-w-xs animate-page-enter flex-col items-center gap-5">
        <img
          className="max-h-36 w-full animate-kupan-pulse object-contain"
          src={gymConfig.assets.logo}
          alt={gymConfig.identity.name}
          width="640"
          height="360"
        />
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full animate-loading-bar rounded-full bg-kupan-ember shadow-glow" />
        </div>
        <p className="animate-soft-blink text-xs font-black uppercase tracking-[0.24em] text-kupan-flame">
          Preparando tu entrenamiento
        </p>
      </div>
    </div>
  )
}
