import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './components/BottomNav.jsx'
import { AppShell } from './components/AppShell.jsx'
import { LoadingScreen } from './components/LoadingScreen.jsx'
import { MotionPage } from './components/Motion.jsx'
import { pages } from './data/pages.js'
import { clearSession, loadSession, loadUsers, normalizeEmail, saveSession, saveUsers } from './utils/auth.js'
import { loadAdminContent, saveAdminContent } from './utils/adminContent.js'
import { getAvailableSpots, getClassKey, hasActiveReservation, RESERVATIONS_STORAGE_KEY } from './utils/reservations.js'

const Admin = lazy(() => import('./pages/Admin.jsx').then((module) => ({ default: module.Admin })))
const Auth = lazy(() => import('./pages/Auth.jsx').then((module) => ({ default: module.Auth })))
const Community = lazy(() => import('./pages/Community.jsx').then((module) => ({ default: module.Community })))
const Home = lazy(() => import('./pages/Home.jsx').then((module) => ({ default: module.Home })))
const Plans = lazy(() => import('./pages/Plans.jsx').then((module) => ({ default: module.Plans })))
const Profile = lazy(() => import('./pages/Profile.jsx').then((module) => ({ default: module.Profile })))
const Reservations = lazy(() => import('./pages/Reservations.jsx').then((module) => ({ default: module.Reservations })))
const Schedule = lazy(() => import('./pages/Schedule.jsx').then((module) => ({ default: module.Schedule })))
const Wod = lazy(() => import('./pages/Wod.jsx').then((module) => ({ default: module.Wod })))

function buildSchedulePreview(weeklySchedule) {
  return weeklySchedule.flatMap((day) =>
    ['AM', 'PM'].flatMap((block) =>
      day.blocks[block].map((classItem) => ({
        ...classItem,
        level: day.label,
      })),
    ),
  )
}

function normalizeStoredReservations(reservations) {
  if (!Array.isArray(reservations)) return []

  const reservationsByClass = new Map()

  reservations.forEach((reservation) => {
    if (!reservation?.dayId || !reservation?.time || !reservation?.name || !reservation?.userId) return
    const classKey = getClassKey(reservation)
    if (!reservationsByClass.has(classKey)) {
      reservationsByClass.set(classKey, {
        ...reservation,
        id: reservation.id ?? classKey,
        status: reservation.status ?? 'Confirmada',
      })
    }
  })

  return [...reservationsByClass.values()]
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [pendingReservation, setPendingReservation] = useState(null)
  const [appContent, setAppContent] = useState(loadAdminContent)
  const [currentUser, setCurrentUser] = useState(loadSession)
  const [userReservations, setUserReservations] = useState(() => {
    try {
      const storedReservations = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY)
      const parsedReservations = storedReservations ? JSON.parse(storedReservations) : []
      return normalizeStoredReservations(parsedReservations)
    } catch {
      return []
    }
  })
  const page = useMemo(
    () => pages.find((item) => item.path === location.pathname) ?? pages[0],
    [location.pathname],
  )

  function goToPage(pageId) {
    const nextPage = pages.find((item) => item.id === pageId)
    navigate(nextPage?.path ?? '/')
  }

  function login({ email, password }) {
    const normalizedEmail = normalizeEmail(email)
    const user = loadUsers().find((item) => item.email === normalizedEmail && item.password === password)

    if (!user) {
      return { ok: false, message: 'Correo o contraseña incorrectos. Revisa tus datos e intenta de nuevo.' }
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email }
    setCurrentUser(sessionUser)
    saveSession(sessionUser)
    navigate('/perfil')
    return { ok: true }
  }

  function register({ name, email, password }) {
    const normalizedName = name.trim()
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedName || !normalizedEmail || !password) {
      return { ok: false, message: 'Completa nombre, correo y contraseña para crear tu cuenta.' }
    }

    if (password.length < 6) {
      return { ok: false, message: 'Usa una contraseña de al menos 6 caracteres.' }
    }

    const users = loadUsers()
    if (users.some((user) => user.email === normalizedEmail)) {
      return { ok: false, message: 'Ese correo ya está registrado. Inicia sesión para seguir.' }
    }

    const user = {
      id: `user-${Date.now()}`,
      name: normalizedName,
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    }
    const sessionUser = { id: user.id, name: user.name, email: user.email }

    saveUsers([...users, user])
    saveSession(sessionUser)
    setCurrentUser(sessionUser)
    navigate('/perfil')
    return { ok: true }
  }

  function logout() {
    clearSession()
    setCurrentUser(null)
    navigate('/login')
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const shortcut = new window.URLSearchParams(location.search).get('shortcut')
    if (shortcut === 'reservas') navigate('/reservas', { replace: true })
    if (shortcut === 'wod') navigate('/wod', { replace: true })
  }, [location.search, navigate])

  useEffect(() => {
    window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(userReservations))
  }, [userReservations])

  function startReservation(classItem) {
    setPendingReservation(classItem)
    goToPage('reservations')
  }

  function confirmReservation(classItem) {
    if (!currentUser) {
      navigate('/login')
      return null
    }

    if (hasActiveReservation(classItem, userReservations, currentUser.id) || getAvailableSpots(classItem, userReservations) <= 0) {
      return null
    }

    const reservation = {
      ...classItem,
      id: getClassKey(classItem),
      userId: currentUser.id,
      userName: currentUser.name,
      status: 'Confirmada',
      reservedAt: new Date().toISOString(),
    }

    setUserReservations((current) => normalizeStoredReservations([reservation, ...current]))
    setPendingReservation(null)
    return reservation
  }

  function cancelReservation(reservationId) {
    setUserReservations((current) => current.filter((reservation) => reservation.id !== reservationId))
  }

  function handleSaveContent(content) {
    const nextContent = {
      ...content,
      schedule: buildSchedulePreview(content.weeklySchedule),
    }
    setAppContent(nextContent)
    saveAdminContent(nextContent)
  }

  return (
    <MotionConfig reducedMotion="user">
      <AppShell title={page.title} eyebrow={page.eyebrow}>
        <AnimatePresence>{isLoading ? <LoadingScreen /> : null}</AnimatePresence>
        <AnimatePresence mode="wait">
          <MotionPage key={location.pathname}>
            <Suspense fallback={<div className="k-card p-5 text-sm font-bold uppercase text-white/60">Cargando KUPAN...</div>}>
              <Routes location={location}>
                <Route path="/" element={<Home setActivePage={goToPage} appContent={appContent} />} />
                <Route path="/horarios" element={<Schedule currentUser={currentUser} appContent={appContent} userReservations={userReservations} onStartReservation={startReservation} />} />
                <Route
                  path="/reservas"
                  element={(
                    <Reservations
                      setActivePage={goToPage}
                      currentUser={currentUser}
                      appContent={appContent}
                      pendingReservation={pendingReservation}
                      userReservations={userReservations}
                      onConfirmReservation={confirmReservation}
                      onCancelReservation={cancelReservation}
                      onClearPendingReservation={() => setPendingReservation(null)}
                    />
                  )}
                />
                <Route path="/wod" element={<Wod appContent={appContent} />} />
                <Route path="/planes" element={<Plans appContent={appContent} />} />
                <Route path="/comunidad" element={<Community appContent={appContent} />} />
                <Route path="/perfil" element={<Profile currentUser={currentUser} onLogout={logout} setActivePage={goToPage} userReservations={userReservations} onCancelReservation={cancelReservation} />} />
                <Route path="/login" element={<Auth onLogin={login} onRegister={register} />} />
                <Route path="/admin" element={<Admin appContent={appContent} onSaveContent={handleSaveContent} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </MotionPage>
        </AnimatePresence>
        <BottomNav pages={pages} />
      </AppShell>
    </MotionConfig>
  )
}
