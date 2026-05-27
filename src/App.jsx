import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './components/BottomNav.jsx'
import { AppShell } from './components/AppShell.jsx'
import { LoadingScreen } from './components/LoadingScreen.jsx'
import { MotionPage } from './components/Motion.jsx'
import { PwaUpdateBanner } from './components/PwaUpdateBanner.jsx'
import { pages } from './data/pages.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import { getCurrentSupabaseUser, loginWithSupabase, logoutFromSupabase, registerWithSupabase } from './utils/auth.js'
import { defaultAdminContent } from './utils/adminContent.js'
import { loadSharedContent } from './utils/sharedContent.js'

const Admin = lazy(() => import('./pages/Admin.jsx').then((module) => ({ default: module.Admin })))
const Auth = lazy(() => import('./pages/Auth.jsx').then((module) => ({ default: module.Auth })))
const Coach = lazy(() => import('./pages/Coach.jsx').then((module) => ({ default: module.Coach })))
const Community = lazy(() => import('./pages/Community.jsx').then((module) => ({ default: module.Community })))
const Home = lazy(() => import('./pages/Home.jsx').then((module) => ({ default: module.Home })))
const Plans = lazy(() => import('./pages/Plans.jsx').then((module) => ({ default: module.Plans })))
const PersonalRecords = lazy(() => import('./pages/PersonalRecords.jsx').then((module) => ({ default: module.PersonalRecords })))
const Profile = lazy(() => import('./pages/Profile.jsx').then((module) => ({ default: module.Profile })))
const Ranking = lazy(() => import('./pages/Ranking.jsx').then((module) => ({ default: module.Ranking })))
const Reservations = lazy(() => import('./pages/Reservations.jsx').then((module) => ({ default: module.Reservations })))
const Wod = lazy(() => import('./pages/Wod.jsx').then((module) => ({ default: module.Wod })))

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [pendingReservation, setPendingReservation] = useState(null)
  const [appContent, setAppContent] = useState(defaultAdminContent)
  const [currentUser, setCurrentUser] = useState(null)
  const page = useMemo(
    () => pages.find((item) => item.path === location.pathname) ?? pages[0],
    [location.pathname],
  )

  function goToPage(pageId) {
    const nextPage = pages.find((item) => item.id === pageId)
    navigate(nextPage?.path ?? '/')
  }

  async function login(credentials) {
    const result = await loginWithSupabase(credentials)

    if (!result.ok) return result

    setCurrentUser(result.user)
    navigate('/perfil')
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
    const timer = window.setTimeout(() => setIsLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    let isMounted = true

    getCurrentSupabaseUser().then((user) => {
      if (isMounted) setCurrentUser(user)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUser(null)
        return
      }

      window.setTimeout(() => {
        getCurrentSupabaseUser().then((user) => setCurrentUser(user))
      }, 0)
    })

    return () => {
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

  return (
    <MotionConfig reducedMotion="user">
      <AppShell title={page.title} eyebrow={page.eyebrow} currentUser={currentUser}>
        <AnimatePresence>{isLoading ? <LoadingScreen /> : null}</AnimatePresence>
        <AnimatePresence mode="wait">
          <MotionPage key={location.pathname}>
            <Suspense fallback={<div className="k-card p-5 text-sm font-bold uppercase text-white/60">Cargando KUPAN...</div>}>
              <Routes location={location}>
                <Route path="/" element={<Home setActivePage={goToPage} appContent={appContent} />} />
                <Route path="/horarios" element={<Navigate to="/reservas" replace />} />
                <Route
                  path="/reservas"
                  element={(
                    <Reservations
                      setActivePage={goToPage}
                      currentUser={currentUser}
                      appContent={appContent}
                      pendingReservation={pendingReservation}
                      onClearPendingReservation={() => setPendingReservation(null)}
                    />
                  )}
                />
                <Route path="/wod" element={<Wod appContent={appContent} />} />
                <Route path="/planes" element={<Plans appContent={appContent} />} />
                <Route path="/comunidad" element={<Community appContent={appContent} />} />
                <Route path="/perfil" element={<Profile currentUser={currentUser} onLogout={logout} setActivePage={goToPage} onUserUpdate={setCurrentUser} />} />
                <Route path="/mis-pr" element={<PersonalRecords currentUser={currentUser} setActivePage={goToPage} />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/login" element={<Auth onLogin={login} onRegister={register} />} />
                <Route path="/admin" element={<Admin currentUser={currentUser} setActivePage={goToPage} onContentChange={async () => setAppContent(await loadSharedContent())} />} />
                <Route path="/coach" element={<Coach currentUser={currentUser} setActivePage={goToPage} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </MotionPage>
        </AnimatePresence>
        <PwaUpdateBanner />
        <BottomNav pages={pages} />
      </AppShell>
    </MotionConfig>
  )
}
