import { Button } from './Button.jsx'
import { Card } from './Card.jsx'
import { cn } from './utils.js'
import { getAppStateKind, getHumanErrorMessage } from '../../utils/appState.js'

export function EmptyState({ action = null, className = '', description, icon = null, title }) {
  return (
    <Card className={cn('p-5 text-center', className)} variant="standard">
      {icon ? <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-kupan-border bg-kupan-gray/70 text-kupan-flame">{icon}</div> : null}
      <h3 className="text-lg font-black uppercase leading-tight text-white">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/65">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  )
}

export function LoadingState({ className = '', description = '', label, lines = 3, title = 'Cargando' }) {
  const heading = label ?? title

  return (
    <Card className={cn('space-y-3 p-4', className)} variant="standard" aria-busy="true" role="status">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-kupan-flame border-t-transparent" aria-hidden="true" />
        <span className="text-sm font-black uppercase tracking-[0.14em] text-white/70">{heading}</span>
      </div>
      {description ? <p className="text-sm leading-6 text-white/60">{description}</p> : null}
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className={cn('h-4 animate-pulse rounded-full bg-white/10', index === lines - 1 ? 'w-2/3' : 'w-full')} />
        ))}
      </div>
    </Card>
  )
}

export function ErrorState({ actionLabel = 'Reintentar', className = '', description, error = null, onAction, title = 'No pudimos cargar esta sección' }) {
  const kind = getAppStateKind(error ?? description)
  const safeDescription = getHumanErrorMessage(error ?? description, description || 'Revisa tu conexión y vuelve a intentarlo.')
  const eyebrow = kind === 'offline'
    ? 'Sin conexión'
    : kind === 'session'
      ? 'Sesión expirada'
      : kind === 'permission'
        ? 'Permiso denegado'
        : kind === 'deleted'
          ? 'Contenido eliminado'
          : 'Atención'

  return (
    <Card className={cn('p-5', className)} variant="warning">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-warning">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white">{title}</h3>
      {safeDescription ? <p className="mt-2 text-sm leading-6 text-white/70">{safeDescription}</p> : null}
      {onAction ? <Button className="mt-4" size="sm" variant="secondary" onClick={onAction}>{actionLabel}</Button> : null}
    </Card>
  )
}

export function SuccessState({ action = null, className = '', description, title = 'Listo' }) {
  return (
    <Card className={cn('p-5', className)} variant="standard">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-success">Guardado</p>
      <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-white/70">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  )
}

export function OfflineState({ onRetry }) {
  return (
    <ErrorState
      actionLabel="Reintentar"
      error="offline"
      onAction={onRetry}
      title="Estás sin conexión"
    />
  )
}

export function SessionExpiredState({ onLogin }) {
  return (
    <ErrorState
      actionLabel="Iniciar sesión"
      error="session expired"
      onAction={onLogin}
      title="Tu sesión venció"
    />
  )
}

export function PermissionDeniedState({ onBack }) {
  return (
    <ErrorState
      actionLabel="Volver"
      error="permission denied"
      onAction={onBack}
      title="Acceso restringido"
    />
  )
}

export function PendingSyncState({ className = '', description = 'Tus cambios se guardarán cuando vuelva internet.', onRetry, title = 'Sincronización pendiente' }) {
  return (
    <Card className={cn('p-5', className)} variant="warning">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-warning">Pendiente</p>
      <h3 className="mt-2 text-xl font-black uppercase leading-tight text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
      {onRetry ? <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>Intentar sincronizar</Button> : null}
    </Card>
  )
}

export function StaleDataState({ className = '', onRetry }) {
  return (
    <Card className={cn('p-4', className)} variant="warning">
      <p className="text-sm font-bold leading-6 text-white/70">
        Mostramos la última información disponible. Puede estar desactualizada.
      </p>
      {onRetry ? <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>Actualizar</Button> : null}
    </Card>
  )
}

export function DeletedState({ onBack }) {
  return (
    <ErrorState
      actionLabel="Volver"
      error="not found deleted"
      onAction={onBack}
      title="Contenido no disponible"
    />
  )
}
