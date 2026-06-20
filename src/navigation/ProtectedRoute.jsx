import { Navigate } from 'react-router-dom'
import { LoadingState } from '../components/ui/index.js'
import { getRouteMeta, userCanAccessRoute } from './routes.js'

export function ProtectedRoute({ authChecked, currentUser, routePath, children }) {
  const route = getRouteMeta(routePath)

  if (!authChecked) {
    return <LoadingState title="Verificando acceso" description="Un momento mientras validamos tu permiso en KUPAN." lines={3} />
  }

  if (!userCanAccessRoute(route, currentUser)) {
    const target = currentUser ? '/perfil?access=restricted' : '/login?access=required'
    return <Navigate to={target} replace />
  }

  return children
}
