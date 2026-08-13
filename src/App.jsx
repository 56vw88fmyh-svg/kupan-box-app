import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './components/BottomNav.jsx'
import { AppShell } from './components/AppShell.jsx'
import { LoadingScreen } from './components/LoadingScreen.jsx'
import { MotionPage } from './components/Motion.jsx'
import { PwaUpdateBanner } from './components/PwaUpdateBanner.jsx'
import { gymConfig } from './config/gymConfig.js'
import { ProtectedRoute } from './navigation/ProtectedRoute.jsx'
import { getPathForPageId, getRouteMeta, routeAliases } from './navigation/routes.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import { getCurrentSupabaseUser, loginWithSupabase, logoutFromSupabase, registerWithSupabase } from './utils/auth.js'
import { defaultAdminContent } from './utils/adminContent.js'
import { loadSharedContent } from './utils/sharedContent.js'

const Admin = lazy(() => import('./pages/Admin.jsx').then((module) => ({ default: module.Admin })))
const Auth = lazy(() => import('./pages/Auth.jsx').then((module) => ({ default: module.Auth })))
const Coach = lazy(() => import('./pages/Coach.jsx').then((module) => ({ default: module.Coach })))
const Community = lazy(() => import('./pages/Community.jsx').then((module) => ({ default: module.Community })))
const Home = lazy(() => import('./pages/Home.jsx').then((module) => ({ default: module.Home })))
const PersonalRecords = lazy(() => import('./pages/PersonalRecords.jsx').then((module) => ({ default: module.PersonalRecords })))
const PasswordUpdate = lazy(() => import('./pages/PasswordUpdate.jsx').then((module) => ({ default: module.PasswordUpdate })))
const Plans = lazy(() => import('./pages/Plans.jsx').then((module) => ({ default: module.Plans })))
const Profile = lazy(() => import('./pages/Profile.jsx').then((module) => ({ default: module.Profile })))
const Ranking = lazy(() => import('./pages/Ranking.jsx').then((module) => ({ default: module.Ranking })))
const Reservations = lazy(() => import('./pages/Reservations.jsx').then((module) => ({ default: module.Reservations })))
const TrialClass = lazy(() => import('./pages/TrialClass.jsx').then((module) => ({ default: module.TrialClass })))
const Wod = lazy(() => import('./pages/Wod.jsx').then((module) => ({ default: module.Wod })))

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [pendingReservation, setPendingReservation] = useState(null)
  const [appContent, setAppContent] = useState(defaultAdminContent)
  const [currentUser, setCurrentUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const page = useMemo(() => getRouteMeta(location.pathname), [location.pathname])

  function goToPage(pageId) {
    navigate(getPathForPageId(pageId))
  }

  async function login(credentials) {
    const result = await loginWithSupabase(credentials)

    if (!result.ok) return result

    setCurrentUser(result.user)
    navigate(result.user?.forcePasswordChange ? '/cambio-password-obligatorio' : '/perfil')
    return result
  }

  async function register(formData) {
    const result = await registerWithSupabase(formData)

    if (!result.ok) return result

    if (result.user) {
      setCurrentUser(result.user)
      navigate('/perfil')
    }

    return result
  }

  async function logout() {
    await logoutFromSupabase()
    setCurrentUser(null)
    navigate('/login')
  }

  useEffect(() => {
    // Recover from a dialog or an interrupted PWA render that left page scrolling locked.
    document.body.style.removeProperty('overflow')
    const timer = window.setTimeout(() => setIsLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    let isMounted = true

    getCurrentSupabaseUser().then((user) => {
      if (!isMounted) return
      setCurrentUser(user)
      setAuthChecked(true)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    let authRefreshTimer = null

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUser(null)
        setAuthChecked(true)
        return
      }

      if (authRefreshTimer) window.clearTimeout(authRefreshTimer)
      authRefreshTimer = window.setTimeout(() => {
        getCurrentSupabaseUser().then((user) => {
          setCurrentUser(user)
          setAuthChecked(true)
        })
      }, 0)
    })

    return () => {
      if (authRefreshTimer) window.clearTimeout(authRefreshTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    loadSharedContent().then((content) => {
      if (isMounted) setAppContent(content)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const shortcut = new window.URLSearchParams(location.search).get('shortcut')
    if (shortcut === 'reservas') navigate('/reservas', { replace: true })
    if (shortcut === 'wod') navigate('/wod', { replace: true })
  }, [location.search, navigate])

  useEffect(() => {
    const alias = routeAliases.find((item) => item.from === location.pathname)
    if (alias) navigate(alias.to, { replace: true })
  }, [location.pathname, navigate])

  useEffect(() => {
    if (!authChecked || !currentUser?.forcePasswordChange) return
    const allowedPaths = ['/cambio-password-obligatorio', '/login']
    if (!allowedPaths.includes(location.pathname)) {
      navigate('/cambio-password-obligatorio', { replace: true })
    }
  }, [authChecked, currentUser?.forcePasswordChange, location.pathname, navigate])


  const mustChangePassword = Boolean(
    currentUser?.forcePasswordChange && !['/cambio-password-obligatorio', '/login'].includes(location.pathname),
  )

  return (
    <AppShell title={page.title} eyebrow={page.eyebrow} currentUser={currentUser}>
      {isLoading ? <LoadingScreen /> : null}
      <MotionPage key={location.pathname}>
        <Suspense fallback={<div className="k-card p-5 text-sm font-bold uppercase text-white/60">Cargando {gymConfig.identity.name}...</div>}>
          {mustChangePassword ? (
            <Navigate to="/cambio-password-obligatorio" replace />
          ) : (
            <Routes location={location}>
                <Route path="/" element={<Home setActivePage={goToPage} appContent={appContent} currentUser={currentUser} />} />
                {routeAliases.map((alias) => <Route key={alias.from} path={alias.from} element={<Navigate to={alias.to} replace />} />)}
                <Route
                  path="/reservas"
                  element={(
                    gymConfig.features.reservations ? (
                      <Reservations
                        setActivePage={goToPage}
                        currentUser={currentUser}
                        appContent={appContent}
                        pendingReservation={pendingReservation}
                        onClearPendingReservation={() => setPendingReservation(null)}
                      />
                    ) : <Navigate to="/" replace />
                  )}
                />
                <Route path="/wod" element={gymConfig.features.wod ? <Wod appContent={appContent} currentUser={currentUser} setActivePage={goToPage} /> : <Navigate to="/" replace />} />
                <Route path="/planes" element={<Plans appContent={appContent} />} />
                <Route path="/prueba" element={<TrialClass setActivePage={goToPage} />} />
                <Route path="/comunidad" element={gymConfig.features.community ? <Community appContent={appContent} /> : <Navigate to="/" replace />} />
                <Route path="/perfil" element={<Profile currentUser={currentUser} onLogout={logout} setActivePage={goToPage} onUserUpdate={setCurrentUser} />} />
                <Route path="/mis-pr" element={gymConfig.features.wod ? <PersonalRecords currentUser={currentUser} setActivePage={goToPage} /> : <Navigate to="/" replace />} />
                <Route path="/wod/pr" element={gymConfig.features.wod ? <PersonalRecords currentUser={currentUser} setActivePage={goToPage} /> : <Navigate to="/" replace />} />
                <Route path="/ranking" element={gymConfig.features.community && gymConfig.features.wod ? <Ranking /> : <Navigate to="/" replace />} />
                <Route path="/comunidad/ranking" element={gymConfig.features.community && gymConfig.features.wod ? <Ranking /> : <Navigate to="/" replace />} />
                <Route path="/login" element={<Auth onLogin={login} onRegister={register} />} />
                <Route path="/actualizar-password" element={<PasswordUpdate currentUser={currentUser} onUserUpdate={setCurrentUser} />} />
                <Route
                  path="/cambio-password-obligatorio"
                  element={currentUser ? (
                    <PasswordUpdate currentUser={currentUser} forced onUserUpdate={setCurrentUser} />
                  ) : (
                    <Navigate to="/login?access=required" replace />
                  )}
                />
                <Route
                  path="/admin"
                  element={(
                    <ProtectedRoute authChecked={authChecked} currentUser={currentUser} routePath="/admin">
                      <Admin currentUser={currentUser} setActivePage={goToPage} onContentChange={async () => setAppContent(await loadSharedContent())} />
                    </ProtectedRoute>
                  )}
                />
                <Route
                  path="/coach"
                  element={(
                    gymConfig.features.coachManagement ? (
                      <ProtectedRoute authChecked={authChecked} currentUser={currentUser} routePath="/coach">
                        <Coach currentUser={currentUser} setActivePage={goToPage} />
                      </ProtectedRoute>
                    ) : <Navigate to="/" replace />
                  )}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </Suspense>
      </MotionPage>
      <PwaUpdateBanner />
      <BottomNav currentUser={currentUser} />
    </AppShell>
  )
}
