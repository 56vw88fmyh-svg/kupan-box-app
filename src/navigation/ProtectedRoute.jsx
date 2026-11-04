import { useLocation } from 'react-router-dom'
import { loginDestination } from './flowContext.js'
import { Navigate } from 'react-router-dom'
import { LoadingState } from '../components/ui/index.js'
import { getRouteMeta, userCanAccessRoute } from './routes.js'
import { gymConfig } from '../config/gymConfig.js'

export function ProtectedRoute({ authChecked, currentUser, routePath, children }) {
  const location = useLocation()
  const route = getRouteMeta(routePath)

  if (!authChecked) {
    return <LoadingState title="Verificando acceso" description={`Un momento mientras validamos tu permiso en ${gymConfig.identity.name}.`} lines={3} />
  }

  if (!userCanAccessRoute(route, currentUser)) {
    const target = currentUser ? '/perfil?access=restricted' : loginDestination(location.pathname + location.search)
    return <Navigate to={target} replace />
  }

  if (currentUser?.forcePasswordChange && routePath !== '/cambio-password-obligatorio') {
    return <Navigate to="/cambio-password-obligatorio" replace />
  }

  return children
}
