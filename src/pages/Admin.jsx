import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildBirthdayGreeting, formatBirthdayDayMonth } from '../utils/birthdays.js'
import { defaultAppText } from '../utils/adminContent.js'
import { getCurrentSupabaseUser } from '../utils/auth.js'
import { getHumanErrorMessage } from '../utils/appState.js'
import { buildMembershipActivationPayload } from '../utils/adminMutationBuilders.js'
import { useAdminCommunications } from '../hooks/admin/useAdminCommunications.js'
import { useAdminData } from '../hooks/admin/useAdminData.js'
import { useAdminFeedback } from '../hooks/admin/useAdminFeedback.js'
import { useAdminMemberships } from '../hooks/admin/useAdminMemberships.js'
import { useAdminPlans } from '../hooks/admin/useAdminPlans.js'
import { useAdminReservations } from '../hooks/admin/useAdminReservations.js'
import { useAdminSchedule } from '../hooks/admin/useAdminSchedule.js'
import { useAdminSettings } from '../hooks/admin/useAdminSettings.js'
import { useAdminStudents } from '../hooks/admin/useAdminStudents.js'
import { useAdminWod } from '../hooks/admin/useAdminWod.js'
import { useAdminWodDraft } from '../hooks/admin/useAdminWodDraft.js'
import { adminNavigationModules, adminSectionMeta, getAdminModuleId } from '../config/adminNavigation.js'
import {
  createEmptyManualReservationDraft,
  createEmptyMembershipDraft,
  createEmptyMembershipEditDraft,
  createEmptyPlanDraft,
  createEmptyPostDraft,
  createEmptyScheduleDraft,
  createEmptyStudentDraft,
  createEmptyWodDraft,
  settingKeys,
  studentFilters,
  weekdayLabels,
} from '../constants/adminConstants.js'
import { formatDate, formatMoney, getChileDateString, getDateTimeValue, toTime } from '../utils/adminFormatters.js'
import { addDays, calculateDaysBetween, getChileDayOfWeek, getMembershipTokens, getPlanTokenTotal } from '../utils/adminMetrics.js'
import {
  AdminMobileModuleNav,
  AdminPageHeader,
} from '../components/admin/AdminDashboard.jsx'
import { AdminSidebar, QuickActionButton } from '../components/admin/AdminUi.jsx'
import { AdminBirthdaysModule } from '../components/admin/modules/AdminBirthdaysModule.jsx'
import { AdminCommunicationsModule } from '../components/admin/modules/AdminCommunicationsModule.jsx'
import { AdminCreateStudentModule } from '../components/admin/modules/AdminCreateStudentModule.jsx'
import { AdminMembershipsModule } from '../components/admin/modules/AdminMembershipsModule.jsx'
import { AdminOverviewModule } from '../components/admin/modules/AdminOverviewModule.jsx'
import { AdminPersonalRecordsModule } from '../components/admin/modules/AdminPersonalRecordsModule.jsx'
import { AdminPlansModule } from '../components/admin/modules/AdminPlansModule.jsx'
import { AdminReservationsModule } from '../components/admin/modules/AdminReservationsModule.jsx'
import { AdminScheduleModule } from '../components/admin/modules/AdminScheduleModule.jsx'
import { AdminSettingsModule } from '../components/admin/modules/AdminSettingsModule.jsx'
import { AdminStudentsModule } from '../components/admin/modules/AdminStudentsModule.jsx'
import { AdminWodModule } from '../components/admin/modules/AdminWodModule.jsx'

function buildWhatsAppUrl(phone, credentials) {
  const cleanedPhone = phone.replace(/\D/g, '')
  const chilePhone = cleanedPhone.startsWith('56') ? cleanedPhone : `56${cleanedPhone}`
  const text = [
    'Hola, bienvenido/a a KUPAN.',
    '',
    'Tus credenciales temporales para entrar a la app son:',
    `Correo: ${credentials.email}`,
    `Clave temporal: ${credentials.password}`,
    '',
    'Al entrar puedes cambiar tu contraseña desde tu cuenta.',
  ].join('\n')

  return `https://wa.me/${chilePhone}?text=${encodeURIComponent(text)}`
}

export function Admin({ currentUser, setActivePage, onContentChange }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [openModules, setOpenModules] = useState(['inicio', 'clases', 'alumnos'])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [globalQuery, setGlobalQuery] = useState('')
  const [pendingFocusTarget, setPendingFocusTarget] = useState('')
  const [dismissedAlertIds, setDismissedAlertIds] = useState([])
  const [verifiedUser, setVerifiedUser] = useState(currentUser)
  const [isCheckingAccess, setIsCheckingAccess] = useState(Boolean(currentUser))
  const {
    data: adminData,
    isLoading,
    isRefreshing,
    sectionLoading,
    sectionErrors,
    lastUpdated,
    reloadAll,
    reloadSection,
  } = useAdminData()
  const {
    message,
    messageType,
    showSuccess,
    showError,
    showWarning,
    clearFeedback,
  } = useAdminFeedback()
  const {
    saveWod: persistWod,
    isSavingWod,
  } = useAdminWod()
  const {
    saveSchedule: persistSchedule,
    toggleSchedule: persistScheduleToggle,
    isSavingSchedule,
  } = useAdminSchedule()
  const {
    savePost: persistPost,
    togglePost: persistPostToggle,
    isSavingPost,
  } = useAdminCommunications()
  const {
    saveTexts: persistTexts,
    isSavingSettings,
  } = useAdminSettings()
  const {
    savePlan: persistPlan,
    togglePlan: persistPlanToggle,
    isSavingPlan,
  } = useAdminPlans()
  const {
    createStudent: persistStudent,
    isCreatingStudent,
  } = useAdminStudents()
  const {
    updateReservationStatus: persistReservationStatus,
    saveManualReservation: persistManualReservation,
    isSavingManualReservation,
  } = useAdminReservations()
  const {
    saveMembership: persistMembership,
    saveMembershipEdit: persistMembershipEdit,
    updateMembershipStatus: persistMembershipStatus,
    renewMembership: persistMembershipRenewal,
    extendMembershipSevenDays: persistMembershipExtension,
    adjustMembershipTokens: persistMembershipTokenAdjustment,
    simulateApprovedPayment: persistApprovedPaymentSimulation,
    isSavingMembership,
    isSavingMembershipEdit,
    isSimulatingPayment,
  } = useAdminMemberships()
  const [studentQuery, setStudentQuery] = useState('')
  const [studentFilter, setStudentFilter] = useState('all')
  const [planDraft, setPlanDraft] = useState(() => createEmptyPlanDraft())
  const [membershipDraft, setMembershipDraft] = useState(() => createEmptyMembershipDraft())
  const [membershipEditDraft, setMembershipEditDraft] = useState(() => createEmptyMembershipEditDraft())
  const [wodDraft, setWodDraft] = useState(() => createEmptyWodDraft())
  const [scheduleDraft, setScheduleDraft] = useState(() => createEmptyScheduleDraft())
  const [postDraft, setPostDraft] = useState(() => createEmptyPostDraft())
  const [studentDraft, setStudentDraft] = useState(() => createEmptyStudentDraft())
  const [manualReservationDraft, setManualReservationDraft] = useState(() => ({
    ...createEmptyManualReservationDraft(),
    reservation_date: getChileDateString(),
  }))
  const [textDraft, setTextDraft] = useState(defaultAppText)
  const [createdCredentials, setCreatedCredentials] = useState(null)
  const contentTopRef = useRef(null)
  const createStudentRef = useRef(null)
  const membershipsOverviewRef = useRef(null)
  const membershipActivateRef = useRef(null)
  const membershipEditRef = useRef(null)
  const membershipHistoryRef = useRef(null)
  const tokenMovementsRef = useRef(null)
  const manualReservationRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const hasHydratedTextDraftRef = useRef(false)
  const isTextDraftDirtyRef = useRef(false)

  const activeUser = verifiedUser ?? currentUser
  const isAdmin = activeUser?.role === 'admin'
  const currentSectionMeta = adminSectionMeta[activeSection] ?? adminSectionMeta.overview

  useEffect(() => {
    let isMounted = true

    async function verifyAdminRole() {
      if (!currentUser?.id) {
        setVerifiedUser(null)
        setIsCheckingAccess(false)
        return
      }

      setIsCheckingAccess(true)
      const freshUser = await getCurrentSupabaseUser()

      if (!isMounted) return

      setVerifiedUser(freshUser ?? currentUser)
      setIsCheckingAccess(false)
    }

    verifyAdminRole()

    return () => {
      isMounted = false
    }
  }, [currentUser])

  useEffect(() => () => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
  }, [])

  const activeMembershipByProfile = useMemo(() => {
    const membershipsByProfile = new Map()

    adminData.memberships
      .filter((membership) => membership.status === 'active')
      .forEach((membership) => {
        if (!membershipsByProfile.has(membership.profile_id)) {
          membershipsByProfile.set(membership.profile_id, membership)
        }
      })

    return membershipsByProfile
  }, [adminData.memberships])

  const latestMembershipByProfile = useMemo(() => {
    const membershipsByProfile = new Map()

    adminData.memberships
      .slice()
      .sort((a, b) => String(b.created_at ?? b.start_date ?? '').localeCompare(String(a.created_at ?? a.start_date ?? '')))
      .forEach((membership) => {
        if (!membershipsByProfile.has(membership.profile_id)) {
          membershipsByProfile.set(membership.profile_id, membership)
        }
      })

    return membershipsByProfile
  }, [adminData.memberships])

  const todayDate = getChileDateString()

  const totals = useMemo(() => {
    const activeStudents = adminData.profiles.filter((profile) => profile.status === 'active').length
    const expiredMemberships = adminData.memberships.filter((membership) => membership.status === 'expired' || membership.end_date < todayDate).length
    const todayReservations = adminData.reservations.filter((reservation) => (
      reservation.reservation_date === todayDate && ['reserved', 'attended'].includes(reservation.status)
    )).length
    const lowTokenMemberships = adminData.memberships.filter((membership) => {
      if (membership.status !== 'active' || membership.plan?.is_unlimited || membership.classes_total === null) return false
      const remaining = Number(membership.classes_total ?? 0) - Number(membership.classes_used ?? 0)
      return remaining > 0 && remaining <= 2
    }).length

    return {
      students: adminData.profiles.length,
      activeStudents,
      expiredMemberships,
      todayReservations,
      lowTokenMemberships,
      activeMemberships: adminData.memberships.filter((membership) => membership.status === 'active').length,
      reservations: adminData.reservations.filter((reservation) => reservation.status === 'reserved').length,
      plans: adminData.plans.filter((plan) => plan.active).length,
    }
  }, [adminData, todayDate])

  const currentModuleId = getAdminModuleId(activeSection)
  const failedDataKeys = useMemo(() => new Set(sectionErrors.map((error) => error.key)), [sectionErrors])
  const hasDataError = useCallback((key) => failedDataKeys.has(key), [failedDataKeys])
  const todayDayOfWeek = getChileDayOfWeek()
  const todayLabel = weekdayLabels[todayDayOfWeek] ?? 'Hoy'
  const tomorrowDate = addDays(todayDate, 1)
  const todayWod = adminData.wod.find((item) => item.date === todayDate)
  const tomorrowWod = adminData.wod.find((item) => item.date === tomorrowDate)
  const {
    hasStoredDraft: hasStoredWodDraft,
    storedDraft: storedWodDraft,
    storedDraftMetadata: storedWodDraftMetadata,
    storedDraftStatus: storedWodDraftStatus,
    isDraftDirty: isWodDraftDirty,
    storageError: wodDraftStorageError,
    saveDraftNow: saveWodDraftNow,
    discardStoredDraft: discardStoredWodDraft,
    recoverStoredDraft: recoverStoredWodDraft,
    markRemoteSaveSuccessful: markWodRemoteSaveSuccessful,
  } = useAdminWodDraft({
    draft: wodDraft,
    onRecover: setWodDraft,
    remoteWod: adminData.wod,
  })

  const todayClasses = useMemo(() => {
    if (hasDataError('schedule') || hasDataError('reservations')) return null
    return (
    adminData.schedule
      .filter((classItem) => Number(classItem.day_of_week) === todayDayOfWeek && classItem.active)
      .sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')))
      .map((classItem) => {
        const classReservations = adminData.reservations.filter((reservation) => (
          reservation.class_schedule_id === classItem.id &&
          reservation.reservation_date === todayDate &&
          reservation.status !== 'cancelled'
        ))
        const reserved = classReservations.length
        const attended = classReservations.filter((reservation) => reservation.status === 'attended').length
        const maxSpots = Number(classItem.max_spots ?? 12)
        const occupancy = maxSpots > 0 ? reserved / maxSpots : 0

        return {
          id: classItem.id,
          time: toTime(classItem.time),
          name: classItem.class_name ?? 'Clase KUPAN',
          coach: classItem.coach || 'Sin coach asignado',
          reserved,
          attended,
          maxSpots,
          status: reserved >= maxSpots ? 'Completa' : occupancy >= 0.8 ? 'Alta ocupación' : 'Disponible',
          wodStatus: todayWod ? 'Publicado' : 'Pendiente',
        }
      })
    )
  }, [adminData.reservations, adminData.schedule, hasDataError, todayDate, todayDayOfWeek, todayWod])

  const upcomingExpirations = useMemo(() => (
    adminData.memberships
      .filter((membership) => membership.status === 'active' && membership.end_date >= todayDate)
      .map((membership) => ({
        ...membership,
        daysRemaining: calculateDaysBetween(todayDate, membership.end_date),
      }))
      .filter((membership) => membership.daysRemaining <= 10)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 6)
  ), [adminData.memberships, todayDate])

  const pendingAlerts = useMemo(() => {
    const alerts = []
    const missingCoachClasses = todayClasses?.filter((classItem) => classItem.coach === 'Sin coach asignado' || classItem.coach.toLowerCase().includes('por definir')) ?? []
    const highOccupancyClasses = todayClasses?.filter((classItem) => classItem.status === 'Alta ocupación' || classItem.status === 'Completa') ?? []
    const expiredMemberships = hasDataError('memberships') ? [] : adminData.memberships.filter((membership) => membership.status === 'expired' || membership.end_date < todayDate)
    const pendingPayments = hasDataError('memberships') ? [] : adminData.memberships.filter((membership) => membership.payment_status === 'pending')
    const incompleteProfiles = hasDataError('profiles') ? [] : adminData.profiles.filter((profile) => !profile.phone || !profile.birth_date)

    if (!hasDataError('wod') && !tomorrowWod) {
      alerts.push({
        id: 'tomorrow-wod',
        label: 'Entrenamientos',
        title: 'WOD de mañana pendiente',
        description: 'Aún no hay WOD publicado para mañana. Puedes crearlo antes de que los alumnos revisen la app.',
        priority: 'medium',
        priorityLabel: 'Medio',
        target: { id: 'wod' },
      })
    }

    if (missingCoachClasses.length > 0) {
      alerts.push({
        id: 'missing-coach',
        label: 'Clases',
        title: `${missingCoachClasses.length} clase(s) sin coach claro`,
        description: 'Revisa horarios del día y asigna entrenador para evitar dudas operativas.',
        priority: 'medium',
        priorityLabel: 'Medio',
        target: { id: 'schedule' },
      })
    }

    if (expiredMemberships.length > 0) {
      alerts.push({
        id: 'expired-memberships',
        label: 'Planes y pagos',
        title: `${expiredMemberships.length} plan(es) vencidos`,
        description: 'Hay alumnos con membresía vencida. Revisa renovaciones o estados de pago.',
        priority: 'high',
        priorityLabel: 'Alto',
        target: { id: 'memberships', target: 'membership-history' },
      })
    }

    if (pendingPayments.length > 0) {
      alerts.push({
        id: 'pending-payments',
        label: 'Pagos',
        title: `${pendingPayments.length} pago(s) pendientes`,
        description: 'Revisa membresías con pago pendiente antes de activar reservas.',
        priority: 'high',
        priorityLabel: 'Alto',
        target: { id: 'memberships', target: 'membership-history' },
      })
    }

    if (highOccupancyClasses.length > 0) {
      alerts.push({
        id: 'high-occupancy',
        label: 'Clases',
        title: 'Clases con alta ocupación',
        description: 'Una o más clases están cerca del cupo máximo. Revisa cupos y reservas.',
        priority: 'low',
        priorityLabel: 'Info',
        target: { id: 'reservations' },
      })
    }

    if (incompleteProfiles.length > 0) {
      alerts.push({
        id: 'incomplete-profiles',
        label: 'Alumnos',
        title: `${incompleteProfiles.length} perfil(es) incompletos`,
        description: 'Hay alumnos sin teléfono o fecha de nacimiento registrada.',
        priority: 'low',
        priorityLabel: 'Info',
        target: { id: 'students' },
      })
    }

    return alerts.filter((alert) => !dismissedAlertIds.includes(alert.id)).slice(0, 6)
  }, [adminData.memberships, adminData.profiles, dismissedAlertIds, hasDataError, todayClasses, todayDate, tomorrowWod])

  const weeklyOccupancy = useMemo(() => {
    const activeClasses = adminData.schedule.filter((classItem) => classItem.active)
    const capacity = activeClasses.reduce((sum, classItem) => sum + Number(classItem.max_spots ?? 12), 0)
    const reserved = adminData.reservations.filter((reservation) => (
      reservation.status !== 'cancelled' && reservation.reservation_date >= todayDate
    )).length
    if (capacity === 0) return 0
    return Math.min(Math.round((reserved / capacity) * 100), 100)
  }, [adminData.reservations, adminData.schedule, todayDate])

  const newStudentsThisMonth = useMemo(() => {
    const monthPrefix = todayDate.slice(0, 7)
    return adminData.profiles.filter((profile) => String(profile.created_at ?? '').startsWith(monthPrefix)).length
  }, [adminData.profiles, todayDate])

  const recentActivity = useMemo(() => {
    const reservationItems = adminData.reservations.slice(0, 4).map((reservation) => ({
      id: `reservation-${reservation.id}`,
      type: reservation.status === 'cancelled' ? 'Cancelación' : 'Reserva',
      title: reservation.profile?.full_name ?? 'Alumno KUPAN',
      detail: `${reservation.class_schedule?.class_name ?? 'Clase'} · ${formatDate(reservation.reservation_date)} · ${reservation.status}`,
      sortDate: getDateTimeValue(reservation.reservation_date, reservation.class_schedule?.time),
    }))

    const membershipItems = adminData.memberships.slice(0, 4).map((membership) => ({
      id: `membership-${membership.id}`,
      type: 'Membresía',
      title: membership.profile?.full_name ?? 'Alumno KUPAN',
      detail: `${membership.plan?.name ?? 'Plan'} · ${membership.status} · vence ${formatDate(membership.end_date)}`,
      sortDate: membership.updated_at ?? membership.created_at ?? membership.start_date,
    }))

    const wodItems = adminData.wod.slice(0, 3).map((wod) => ({
      id: `wod-${wod.id}`,
      type: 'WOD',
      title: wod.title || 'WOD publicado',
      detail: formatDate(wod.date),
      sortDate: wod.updated_at ?? wod.created_at ?? wod.date,
    }))

    const prItems = adminData.prs.slice(0, 3).map((record) => ({
      id: `pr-${record.id}`,
      type: 'PR',
      title: record.profile?.full_name ?? 'Atleta KUPAN',
      detail: `${record.movement} · ${record.value} ${record.unit}`,
      sortDate: record.created_at ?? record.record_date,
    }))

    return [...reservationItems, ...membershipItems, ...wodItems, ...prItems]
      .sort((a, b) => String(b.sortDate ?? '').localeCompare(String(a.sortDate ?? '')))
      .slice(0, 8)
  }, [adminData.memberships, adminData.prs, adminData.reservations, adminData.wod])

  const filteredProfiles = useMemo(() => {
    const query = studentQuery.trim().toLowerCase()

    return adminData.profiles.filter((profile) => {
      const activeMembership = activeMembershipByProfile.get(profile.id)
      const latestMembership = latestMembershipByProfile.get(profile.id)
      const tokens = activeMembership ? getMembershipTokens(activeMembership) : null
      const searchable = `${profile.full_name ?? ''} ${profile.email ?? ''} ${profile.phone ?? ''}`.toLowerCase()
      const matchesQuery = !query || searchable.includes(query)
      const hasActivePlan = Boolean(activeMembership?.status === 'active' && activeMembership.end_date >= todayDate)
      const hasExpiredPlan = Boolean(latestMembership && (latestMembership.status === 'expired' || latestMembership.end_date < todayDate))
      const hasNoTokens = Boolean(activeMembership && !activeMembership.plan?.is_unlimited && Number(tokens?.remaining ?? 0) <= 0)
      const isExpiring = Boolean(activeMembership && activeMembership.end_date >= todayDate && calculateDaysBetween(todayDate, activeMembership.end_date) <= 7)

      if (!matchesQuery) return false
      if (studentFilter === 'active') return profile.status === 'active'
      if (studentFilter === 'inactive') return profile.status === 'inactive'
      if (studentFilter === 'plan-active') return hasActivePlan
      if (studentFilter === 'plan-expired') return hasExpiredPlan
      if (studentFilter === 'no-tokens') return hasNoTokens
      if (studentFilter === 'expiring') return isExpiring
      return true
    })
  }, [activeMembershipByProfile, adminData.profiles, latestMembershipByProfile, studentFilter, studentQuery, todayDate])

  const featuredStudents = useMemo(() => (
    filteredProfiles.slice(0, 6)
  ), [filteredProfiles])

  const dashboardValues = {
    activeStudents: hasDataError('profiles') ? 'Sin cargar' : totals.activeStudents,
    totalStudents: hasDataError('profiles') ? 'No disponible' : `${totals.students} registrados`,
    todayReservations: hasDataError('reservations') ? 'Sin cargar' : totals.todayReservations,
    todayClasses: hasDataError('schedule') ? 'No disponible' : `${todayClasses?.length ?? 0} clases`,
    weeklyOccupancy: hasDataError('reservations') || hasDataError('schedule') ? 'Sin cargar' : `${weeklyOccupancy}%`,
    expiredMemberships: hasDataError('memberships') ? 'Sin cargar' : totals.expiredMemberships,
    upcomingExpirations: hasDataError('memberships') ? 'Sin cargar' : upcomingExpirations.length,
    newStudentsThisMonth: hasDataError('profiles') ? 'Sin cargar' : newStudentsThisMonth,
  }

  const manualReservationStudents = useMemo(() => {
    const query = manualReservationDraft.student_query.trim().toLowerCase()
    return adminData.profiles
      .filter((profile) => {
        const searchable = `${profile.full_name ?? ''} ${profile.email ?? ''} ${profile.phone ?? ''}`.toLowerCase()
        return !query || searchable.includes(query)
      })
      .slice(0, 40)
  }, [adminData.profiles, manualReservationDraft.student_query])

  const selectedManualProfile = useMemo(
    () => adminData.profiles.find((profile) => profile.id === manualReservationDraft.profile_id),
    [adminData.profiles, manualReservationDraft.profile_id],
  )

  const selectedManualMembership = manualReservationDraft.profile_id
    ? activeMembershipByProfile.get(manualReservationDraft.profile_id)
    : null
  const selectedManualTokens = selectedManualMembership ? getMembershipTokens(selectedManualMembership) : null

  const selectedMembershipPlan = useMemo(
    () => adminData.plans.find((plan) => plan.id === membershipDraft.plan_id),
    [adminData.plans, membershipDraft.plan_id],
  )
  const migrationTotalTokens = selectedMembershipPlan?.is_unlimited
    ? null
    : Number(membershipDraft.classes_total || getPlanTokenTotal(selectedMembershipPlan) || 0)
  const migrationUsedTokens = selectedMembershipPlan?.is_unlimited ? 0 : Number(membershipDraft.classes_used || 0)
  const migrationAvailableTokens = selectedMembershipPlan?.is_unlimited
    ? 'Ilimitado'
    : Math.max(migrationTotalTokens - migrationUsedTokens, 0)

  const globalResults = useMemo(() => {
    const query = globalQuery.trim().toLowerCase()
    if (!query) return []

    return adminNavigationModules
      .flatMap((module) => module.items.map((item) => ({ ...item, module: module.label })))
      .filter((item) => `${item.module} ${item.label} ${item.hint}`.toLowerCase().includes(query))
      .slice(0, 6)
  }, [globalQuery])

  function scrollToTarget(target) {
    const targetMap = {
      top: contentTopRef,
      'create-student-form': createStudentRef,
      'memberships-overview': membershipsOverviewRef,
      'membership-activate': membershipActivateRef,
      'membership-edit': membershipEditRef,
      'membership-history': membershipHistoryRef,
      'token-movements': tokenMovementsRef,
      'manual-reservation': manualReservationRef,
    }
    const targetRef = targetMap[target] ?? contentTopRef

    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      scrollTimeoutRef.current = null
    }, 80)
  }

  function navigateAdmin(item) {
    setActiveSection(item.id)
    setPendingFocusTarget(item.target ?? (item.id === 'create-student' ? 'create-student-form' : 'top'))
    setGlobalQuery('')
  }

  function toggleAdminModule(moduleId) {
    setOpenModules((current) => (
      current.includes(moduleId)
        ? current.filter((item) => item !== moduleId)
        : [...current, moduleId]
    ))
  }

  const buildTextDraftFromSettings = useCallback((settings) => ({
    homeEyebrow: settings.find((item) => item.key === 'home_eyebrow')?.value ?? defaultAppText.homeEyebrow,
    homeTitle: settings.find((item) => item.key === 'home_title')?.value ?? defaultAppText.homeTitle,
    homeBody: settings.find((item) => item.key === 'home_body')?.value ?? defaultAppText.homeBody,
    reservationsTitle: settings.find((item) => item.key === 'reservations_title')?.value ?? defaultAppText.reservationsTitle,
    reservationsBody: settings.find((item) => item.key === 'reservations_body')?.value ?? defaultAppText.reservationsBody,
    communityPhrase: settings.find((item) => item.key === 'community_phrase')?.value ?? defaultAppText.communityPhrase,
  }), [])

  const hydrateTextDraft = useCallback((settings, { force = false } = {}) => {
    if (!force && (hasHydratedTextDraftRef.current || isTextDraftDirtyRef.current)) return
    setTextDraft(buildTextDraftFromSettings(settings ?? []))
    isTextDraftDirtyRef.current = false
    hasHydratedTextDraftRef.current = true
  }, [buildTextDraftFromSettings])

  function updateTextDraftField(field, value) {
    isTextDraftDirtyRef.current = true
    setTextDraft((current) => ({ ...current, [field]: value }))
  }

  async function ensureFreshAdmin() {
    clearFeedback()

    const freshUser = await getCurrentSupabaseUser()
    const allowed = freshUser?.role === 'admin' && freshUser?.status === 'active'

    setVerifiedUser(freshUser ?? null)

    if (!allowed) {
      showError('Tu permiso admin ya no esta activo. Vuelve a iniciar sesion o solicita validar tu rol en Supabase.')
      return false
    }

    return true
  }

  const refreshData = useCallback(async (options = {}) => {
    if (!options.silent) clearFeedback()
    const result = await reloadAll()

    if (!result.success && !result.partial) {
      if (!options.silent) showError(result.message ?? 'No pudimos cargar datos admin desde Supabase. Revisa RLS, role admin y tablas.')
      return
    }

    hydrateTextDraft(result.data?.settings ?? [], { force: Boolean(options.hydrateTextDraft) })

    if (result.failedSections?.length) {
      if (!options.silent) showWarning(`${result.failedSections.length} secciones tuvieron problemas. Revisa el detalle bajo los contadores.`)
    } else {
      if (!options.silent) showSuccess('Datos actualizados desde Supabase.')
    }
  }, [clearFeedback, hydrateTextDraft, reloadAll, showError, showSuccess, showWarning])

  const reloadAffectedSections = useCallback(async (sections = []) => {
    if (!sections.length) {
      await refreshData({ silent: true })
      return
    }

    const uniqueSections = [...new Set(sections)]
    await Promise.all(uniqueSections.map((section) => reloadSection(section)))
  }, [refreshData, reloadSection])

  useEffect(() => {
    if (isAdmin) refreshData()
  }, [isAdmin, refreshData])

  useEffect(() => {
    if (manualReservationDraft.class_schedule_id || adminData.schedule.length === 0) return
    const firstActiveClass = adminData.schedule.find((classItem) => classItem.active) ?? adminData.schedule[0]
    setManualReservationDraft((current) => ({
      ...current,
      class_schedule_id: firstActiveClass?.id ?? '',
    }))
  }, [adminData.schedule, manualReservationDraft.class_schedule_id])

  useEffect(() => {
    if (!pendingFocusTarget) return
    scrollToTarget(pendingFocusTarget)
    setPendingFocusTarget('')
  }, [activeSection, pendingFocusTarget])

  async function savePlan(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    const result = await persistPlan(planDraft)
    if (!result.success) return showError('No pudimos guardar el plan.')
    setPlanDraft(createEmptyPlanDraft())
    showSuccess('Plan guardado en Supabase.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  async function togglePlan(plan) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistPlanToggle(plan)
    if (!result.success) return showError('No pudimos actualizar el plan.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  function editPlan(plan) {
    setActiveSection('plans')
    setPlanDraft({
      id: plan.id,
      name: plan.name,
      price: String(plan.price),
      classes_per_week: plan.classes_per_week ?? '',
      is_unlimited: plan.is_unlimited,
      active: plan.active,
    })
  }

  async function saveMembership(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    const selectedPlan = adminData.plans.find((plan) => plan.id === membershipDraft.plan_id)
    const payload = buildMembershipActivationPayload(membershipDraft, selectedPlan)
    const classesTotal = payload.classes_total
    const initialClassesUsed = payload.classes_used

    if (!payload.profile_id || !payload.plan_id || !payload.start_date || !payload.end_date) {
      showError('Selecciona alumno, plan, inicio y vencimiento.')
      return
    }

    if (!selectedPlan) {
      showError('Selecciona un plan valido para activar la membresia.')
      return
    }

    if (!selectedPlan.is_unlimited && (!Number.isFinite(classesTotal) || classesTotal <= 0)) {
      showError('Indica un total de tokens valido para el plan.')
      return
    }

    if (initialClassesUsed < 0) {
      showError('Los tokens ya usados no pueden ser menores que 0.')
      return
    }

    if (!selectedPlan.is_unlimited && initialClassesUsed > classesTotal) {
      showError('Los tokens ya usados no pueden ser mayores que los tokens del plan.')
      return
    }

    const result = await persistMembership(membershipDraft, selectedPlan)

    if (!result.success) {
      showError(`No pudimos crear la membresia: ${result.error?.message ?? 'Error desconocido'}`)
      return
    }

    setMembershipDraft(createEmptyMembershipDraft())
    showSuccess(initialClassesUsed > 0 ? 'Plan activado con tokens ya usados registrados.' : 'Membresia creada en Supabase.')
    await reloadAffectedSections(result.affectedSections)
  }

  function startEditMembership(membership) {
    setActiveSection('memberships')
    setMembershipEditDraft({
      id: membership.id,
      profile_id: membership.profile_id,
      plan_id: membership.plan_id,
      start_date: membership.start_date,
      end_date: membership.end_date,
      status: membership.status,
      classes_total: membership.classes_total ?? '',
      classes_used: membership.classes_used ?? 0,
      payment_status: membership.payment_status ?? 'paid',
      payment_provider: membership.payment_provider ?? '',
      payment_reference: membership.payment_reference ?? '',
      notes: membership.notes ?? '',
    })
    clearFeedback()
    setPendingFocusTarget('membership-edit')
  }

  async function saveMembershipEdit(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return

    if (!membershipEditDraft.id) {
      showError('Selecciona una membresia para editar.')
      return
    }

    const selectedPlan = adminData.plans.find((plan) => plan.id === membershipEditDraft.plan_id)
    if (!selectedPlan) {
      showError('Selecciona un plan valido para guardar la membresia.')
      return
    }

    if (!membershipEditDraft.start_date || Number.isNaN(new Date(`${membershipEditDraft.start_date}T00:00:00`).getTime())) {
      showError('La fecha de inicio no es valida.')
      return
    }

    const editedClassesTotal = selectedPlan?.is_unlimited ? null : Number(membershipEditDraft.classes_total || 0)
    const editedClassesUsed = selectedPlan?.is_unlimited ? 0 : Number(membershipEditDraft.classes_used ?? 0)

    if (!selectedPlan?.is_unlimited && editedClassesUsed < 0) {
      showError('Los tokens usados no pueden ser menores que 0.')
      return
    }

    if (!selectedPlan?.is_unlimited && editedClassesUsed > editedClassesTotal) {
      showError('Los tokens usados no pueden ser mayores que los tokens totales.')
      return
    }

    const result = await persistMembershipEdit(membershipEditDraft, selectedPlan)

    if (!result.success) {
      showError(`No pudimos guardar los cambios de membresia: ${result.error?.message ?? 'Error desconocido'}`)
      return
    }

    setMembershipEditDraft(createEmptyMembershipEditDraft())
    showSuccess('Membresia actualizada.')
    await reloadAffectedSections(result.affectedSections)
  }

  async function updateMembershipStatus(membership, status) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistMembershipStatus(membership, status)

    if (!result.success) {
      showError(`No pudimos cambiar estado de membresia: ${result.error?.message ?? 'Error desconocido'}`)
      return
    }

    showSuccess(`Membresia actualizada a ${status}.`)
    await reloadAffectedSections(result.affectedSections)
  }

  async function renewMembership(membership) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistMembershipRenewal(membership)

    if (!result.success) {
      showError(`No pudimos renovar la membresia: ${result.error?.message ?? 'Error desconocido'}`)
      return
    }

    showSuccess('Plan renovado. Se creo un nuevo ciclo de 30 dias sin acumular tokens anteriores.')
    await reloadAffectedSections(result.affectedSections)
  }

  async function extendMembershipSevenDays(membership) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistMembershipExtension(membership)

    if (!result.success) {
      showError(`No pudimos extender la membresia: ${result.error?.message ?? 'Error desconocido'}`)
      return
    }

    showSuccess('Membresia extendida 7 dias.')
    await reloadAffectedSections(result.affectedSections)
  }

  async function adjustMembershipTokens(membership) {
    if (!(await ensureFreshAdmin())) return
    const tokens = getMembershipTokens(membership)
    const nextValue = window.prompt(
      `Tokens usados actuales: ${tokens.used}. Ingresa el nuevo total de tokens usados:`,
      String(membership.classes_used ?? 0),
    )

    if (nextValue === null) return

    const parsedValue = Number(nextValue)
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      showError('Ingresa un numero entero de tokens usados.')
      return
    }

    const result = await persistMembershipTokenAdjustment(membership, parsedValue)

    if (!result.success) {
      showError(`No pudimos ajustar tokens: ${result.error?.message ?? 'Error desconocido'}`)
      return
    }

    showSuccess('Tokens usados actualizados y movimiento manual registrado.')
    await reloadAffectedSections(result.affectedSections)
  }

  function prepareMembershipActivation(profileId = '') {
    setMembershipDraft((current) => ({ ...current, profile_id: profileId, start_date: new Date().toISOString().slice(0, 10) }))
    scrollToTarget('membership-activate')
  }

  async function saveWod(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    saveWodDraftNow()
    const result = await persistWod(wodDraft)
    if (!result.success) return showError('No pudimos guardar el WOD.')
    markWodRemoteSaveSuccessful()
    setWodDraft(createEmptyWodDraft())
    showSuccess('WOD guardado en Supabase.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  function recoverWodDraft() {
    if (isWodDraftDirty) {
      const confirmed = window.confirm('Tienes cambios en el formulario actual. Si recuperas el borrador local, ese contenido será reemplazado. ¿Quieres continuar?')
      if (!confirmed) return
    }

    if (!recoverStoredWodDraft()) return
    showWarning('Borrador local recuperado. Revisa el contenido antes de guardar en Supabase.')
  }

  function discardWodDraft() {
    if (storedWodDraft?.draft) {
      const confirmed = window.confirm('Vas a descartar el borrador local no publicado. Esta acción no modifica el WOD guardado en Supabase. ¿Quieres continuar?')
      if (!confirmed) return
    }

    discardStoredWodDraft()
    showSuccess('Borrador local descartado.')
  }

  function saveWodDraftLocally() {
    const saved = saveWodDraftNow()
    if (saved) {
      showSuccess('Borrador local guardado en este dispositivo.')
      return
    }
    showWarning('No hay contenido suficiente para guardar un borrador local.')
  }

  async function saveSchedule(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    const result = await persistSchedule(scheduleDraft)
    if (!result.success) return showError('No pudimos guardar el horario.')
    setScheduleDraft(createEmptyScheduleDraft())
    showSuccess('Horario guardado en Supabase.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  async function toggleSchedule(classItem) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistScheduleToggle(classItem)
    if (!result.success) return showError('No pudimos actualizar el horario.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  function editSchedule(classItem) {
    setActiveSection('schedule')
    setScheduleDraft({
      id: classItem.id,
      day_of_week: classItem.day_of_week,
      time: classItem.time.slice(0, 5),
      class_name: classItem.class_name,
      coach: classItem.coach ?? '',
      max_spots: classItem.max_spots,
      active: classItem.active,
    })
  }

  async function savePost(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    const result = await persistPost(postDraft)
    if (!result.success) return showError('No pudimos guardar la publicacion.')
    setPostDraft(createEmptyPostDraft())
    showSuccess('Publicacion guardada en Supabase.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  async function togglePost(post) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistPostToggle(post)
    if (!result.success) return showError('No pudimos actualizar la publicacion.')
    await reloadAffectedSections(result.affectedSections)
    onContentChange?.()
  }

  function editPost(post) {
    setActiveSection('community')
    setPostDraft({
      id: post.id,
      type: post.type ?? 'noticia',
      title: post.title,
      content: post.content ?? '',
      event_date: post.event_date ?? '',
      active: post.active,
    })
  }

  async function saveTexts(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    const result = await persistTexts(textDraft, settingKeys)

    if (!result.success) {
      showError(result.message || getHumanErrorMessage(result.error, 'No pudimos guardar el texto.'))
      return
    }

    showSuccess('Textos principales guardados en Supabase.')
    await reloadAffectedSections(result.affectedSections)
    const settingsResult = await reloadSection('settings')
    hydrateTextDraft(settingsResult.data ?? [], { force: true })
    onContentChange?.()
  }

  async function updateReservationStatus(reservationId, status) {
    if (!(await ensureFreshAdmin())) return
    const result = await persistReservationStatus(reservationId, status)

    if (!result.success) {
      showError(result.error?.message || 'No pudimos actualizar la reserva.')
      return
    }

    showSuccess(status === 'cancelled' ? 'Reserva cancelada. Si correspondia, el token fue devuelto.' : 'Asistencia confirmada. El token queda consumido.')
    await reloadAffectedSections(result.affectedSections)
  }

  async function saveManualReservation(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    clearFeedback()
    const result = await persistManualReservation(manualReservationDraft)

    if (!result.success) {
      showError(result.message)
      return
    }

    showSuccess(result.message)
    setManualReservationDraft((current) => ({
      ...createEmptyManualReservationDraft(),
      reservation_date: current.reservation_date || getChileDateString(),
      class_schedule_id: current.class_schedule_id,
    }))
    await reloadAffectedSections(result.affectedSections)
  }

  async function simulateApprovedPayment() {
    if (!(await ensureFreshAdmin())) return
    clearFeedback()

    if (!membershipDraft.profile_id || !membershipDraft.plan_id) {
      showError('Selecciona alumno y plan para simular un pago aprobado.')
      return
    }

    const result = await persistApprovedPaymentSimulation(membershipDraft)

    if (!result.success) {
      showError(result.message || 'No pudimos simular el pago. Revisa la Edge Function payment-webhook.')
      return
    }

    showSuccess('Pago simulado aprobado. Membresia activada por 30 dias.')
    setMembershipDraft(createEmptyMembershipDraft())
    await reloadAffectedSections(result.affectedSections)
  }

  async function createStudent(event) {
    event.preventDefault()
    if (!(await ensureFreshAdmin())) return
    clearFeedback()
    setCreatedCredentials(null)

    if (!studentDraft.full_name.trim() || !studentDraft.email.trim() || !studentDraft.birth_date || !studentDraft.level || !studentDraft.status) {
      showError('Completa nombre, email, fecha de nacimiento, nivel y estado.')
      return
    }

    if (studentDraft.plan_id && !studentDraft.membership_start_date) {
      showError('Si asignas plan inicial, agrega fecha de inicio. El vencimiento se calcula automaticamente a 30 dias.')
      return
    }

    const result = await persistStudent(studentDraft)

    if (!result.success) {
      showError(result.message || 'No pudimos crear el alumno. Revisa la Edge Function y tu sesion admin.')
      return
    }

    showSuccess('Alumno creado en Supabase Auth y profiles.')
    setCreatedCredentials({
      email: result.data.email,
      password: result.data.temporary_password,
      phone: result.data.phone,
    })
    setStudentDraft(createEmptyStudentDraft())
    await reloadAffectedSections(result.affectedSections)
  }

  async function copyCredentials() {
    if (!createdCredentials) return

    const text = [
      'Credenciales KUPAN',
      `Correo: ${createdCredentials.email}`,
      `Clave temporal: ${createdCredentials.password}`,
    ].join('\n')

    try {
      await window.navigator.clipboard.writeText(text)
      showSuccess('Credenciales copiadas. Recuerda: la clave temporal se muestra solo ahora.')
    } catch {
      showError('No pudimos copiar las credenciales. Revisa los permisos del navegador.')
    }
  }

  async function copyBirthdayGreeting(birthday) {
    try {
      await window.navigator.clipboard.writeText(buildBirthdayGreeting(birthday))
      showSuccess(`Saludo de cumpleaños copiado para ${birthday.full_name}.`)
    } catch {
      showError('No pudimos copiar el saludo. Revisa los permisos del navegador.')
    }
  }

  if (!activeUser && !isCheckingAccess) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Admin KUPAN</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Inicia sesion para entrar al panel.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">El acceso admin ahora depende del rol del perfil en Supabase.</p>
        <button type="button" className="k-button mt-5 w-full" onClick={() => setActivePage('login')}>
          Iniciar sesion
        </button>
      </section>
    )
  }

  if (isCheckingAccess) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Verificando acceso</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Conectando con Supabase.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">Estamos revisando tu rol actualizado antes de abrir el panel admin.</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="k-card p-5">
        <p className="k-pill inline-flex text-kupan-flame">Acceso denegado</p>
        <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white">Este panel es solo para admins KUPAN.</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Tu perfil esta activo como alumno. Para entrar, tu usuario debe tener role = admin en Supabase.
        </p>
        <button type="button" className="k-button-secondary mt-5 w-full" onClick={() => setActivePage('profile')}>
          Volver a perfil
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <AdminPageHeader
        dateLabel={`${todayLabel} · ${formatDate(todayDate)}`}
        greeting={`Hola ${activeUser?.name ?? 'equipo KUPAN'}, revisa lo importante de hoy y resuelve rápido lo pendiente.`}
        status={todayClasses === null ? 'No pudimos cargar clases o reservas. Actualiza datos para reintentar.' : todayClasses.length > 0 ? `${todayClasses.length} clase(s) programadas hoy · ${totals.todayReservations} reservas` : 'Hoy no hay clases activas programadas.'}
        onAction={navigateAdmin}
      />

      <section className="k-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Datos en vivo</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white/65">Panel conectado a Supabase y protegido por RLS.</p>
          </div>
          <button type="button" className="k-button min-h-12 w-full lg:w-auto" onClick={refreshData} disabled={isLoading || isRefreshing}>
            {isLoading || isRefreshing ? 'Actualizando...' : 'Actualizar datos'}
          </button>
        </div>
        {lastUpdated ? (
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-white/50">
            Ultima actualizacion: {new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastUpdated)}
          </p>
        ) : null}
        {message ? (
          <p className={`mt-3 rounded-lg border p-3 text-sm font-bold text-white ${
            messageType === 'success' ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-kupan-flame/30 bg-kupan-flame/10'
          }`}
          >
            {message}
          </p>
        ) : null}
        {sectionErrors.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {sectionErrors.map((error) => (
              <div key={`${error.key}-${error.label}`} className="rounded-lg border border-kupan-flame/30 bg-kupan-flame/10 p-3 text-xs font-bold leading-5 text-white">
                <p>{error.message}</p>
                <button
                  type="button"
                  className="mt-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                  disabled={Boolean(sectionLoading[error.key])}
                  onClick={() => reloadSection(error.key)}
                >
                  {sectionLoading[error.key] ? 'Reintentando...' : 'Reintentar'}
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="k-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-kupan-flame">Buscar alumno</span>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/55 focus:border-kupan-ember"
              type="search"
              value={studentQuery}
              placeholder="Nombre, email o telefono..."
              onChange={(event) => setStudentQuery(event.target.value)}
            />
          </label>
          <p className="text-sm font-black uppercase text-white/60">{filteredProfiles.length} resultados</p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto k-scroll-x pb-1">
          {studentFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`min-w-max rounded-lg px-3 py-2 text-xs font-black uppercase transition ${
                studentFilter === filter.id ? 'bg-kupan-ember text-white shadow-glow' : 'border border-white/10 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
              onClick={() => setStudentFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
	        <AdminSidebar
	          modules={adminNavigationModules}
	          openModules={openModules}
	          onToggleModule={toggleAdminModule}
	          activeSection={activeSection}
	          activeModuleId={currentModuleId}
	          onNavigate={navigateAdmin}
	          isCollapsed={isSidebarCollapsed}
	          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        />

        <div ref={contentTopRef} className="min-w-0 space-y-5 scroll-mt-28">
          <div className="k-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-kupan-flame">
                  {currentSectionMeta.module} / {currentSectionMeta.label}
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase text-white">{currentSectionMeta.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <QuickActionButton label="Nuevo alumno" icon="NA" primary onClick={() => navigateAdmin({ id: 'create-student', target: 'create-student-form' })} />
                <QuickActionButton label="Membresia" icon="ME" onClick={() => navigateAdmin({ id: 'memberships', target: 'membership-activate' })} />
                <QuickActionButton label="Reservas" icon="RE" onClick={() => navigateAdmin({ id: 'reservations' })} />
                <QuickActionButton label="Modo Coach" icon="CO" onClick={() => setActivePage('coach')} />
              </div>
            </div>

            <div className="relative mt-4">
              <label className="block">
                <span className="sr-only">Busqueda rapida admin</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-base font-bold text-white outline-none transition placeholder:text-white/55 focus:border-kupan-ember"
                  type="search"
                  value={globalQuery}
                  placeholder="Buscar accion: alumno, pago, reservas, WOD..."
                  onChange={(event) => setGlobalQuery(event.target.value)}
                />
              </label>
              {globalResults.length > 0 ? (
                <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-white/10 bg-kupan-gray shadow-2xl">
                  {globalResults.map((result) => (
                    <button
                      key={`${result.module}-${result.label}-${result.target ?? result.id}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-white/10"
                      onClick={() => navigateAdmin(result)}
                    >
                      <span>
                        <span className="block text-sm font-black uppercase text-white">{result.label}</span>
                        <span className="text-xs font-bold text-white/45">{result.module} · {result.hint}</span>
                      </span>
                      <span className="text-xs font-black text-kupan-flame">{'>'}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

      {activeSection === 'overview' ? (
        <AdminOverviewModule
          dashboardValues={dashboardValues}
          dataStatus={{
            profiles: hasDataError('profiles'),
            reservations: hasDataError('reservations'),
            schedule: hasDataError('schedule'),
            memberships: hasDataError('memberships'),
          }}
          totals={totals}
          todayClasses={todayClasses}
          pendingAlerts={pendingAlerts}
          upcomingExpirations={upcomingExpirations}
          recentActivity={recentActivity}
          featuredStudents={featuredStudents}
          activeMembershipByProfile={activeMembershipByProfile}
          onNavigate={navigateAdmin}
          onDismissAlert={(alertId) => setDismissedAlertIds((current) => [...current, alertId])}
        />
      ) : null}

      {activeSection === 'create-student' ? (
        <AdminCreateStudentModule
          formRef={createStudentRef}
          draft={studentDraft}
          plans={adminData.plans}
          createdCredentials={createdCredentials}
          isCreating={isCreatingStudent}
          onDraftChange={setStudentDraft}
          onSubmit={createStudent}
          onCopyCredentials={copyCredentials}
          getWhatsAppUrl={buildWhatsAppUrl}
          addDays={addDays}
        />
      ) : null}

      {activeSection === 'students' ? (
        <AdminStudentsModule profiles={filteredProfiles} />
      ) : null}

      {activeSection === 'plans' ? (
        <AdminPlansModule
          draft={planDraft}
          plans={adminData.plans}
          onDraftChange={setPlanDraft}
          onSave={savePlan}
          onEdit={editPlan}
          onToggle={togglePlan}
          formatMoney={formatMoney}
          isSaving={isSavingPlan}
        />
      ) : null}

      {activeSection === 'memberships' ? (
        <AdminMembershipsModule
          profiles={filteredProfiles}
          plans={adminData.plans}
          memberships={adminData.memberships}
          tokenMovements={adminData.tokenMovements}
          activeMembershipByProfile={activeMembershipByProfile}
          refs={{
            overview: membershipsOverviewRef,
            activate: membershipActivateRef,
            edit: membershipEditRef,
            history: membershipHistoryRef,
            tokenMovements: tokenMovementsRef,
          }}
          draft={membershipDraft}
          editDraft={membershipEditDraft}
          selectedMembershipPlan={selectedMembershipPlan}
          migrationTotalTokens={migrationTotalTokens}
          migrationUsedTokens={migrationUsedTokens}
          migrationAvailableTokens={migrationAvailableTokens}
          isSavingActivation={isSavingMembership}
          isSavingEdit={isSavingMembershipEdit}
          isSimulatingPayment={isSimulatingPayment}
          actions={{
            setDraft: setMembershipDraft,
            setEditDraft: setMembershipEditDraft,
            save: saveMembership,
            saveEdit: saveMembershipEdit,
            closeEdit: () => setMembershipEditDraft(createEmptyMembershipEditDraft()),
            simulatePayment: simulateApprovedPayment,
            renew: renewMembership,
            adjustTokens: adjustMembershipTokens,
            updateStatus: updateMembershipStatus,
            extendSevenDays: extendMembershipSevenDays,
            startEdit: startEditMembership,
            prepareActivation: prepareMembershipActivation,
          }}
          formatDate={formatDate}
          addDays={addDays}
          getPlanTokenTotal={getPlanTokenTotal}
          onScrollToTarget={scrollToTarget}
        />
      ) : null}

      {activeSection === 'reservations' ? (
        <AdminReservationsModule
          formRef={manualReservationRef}
          draft={manualReservationDraft}
          scheduleItems={adminData.schedule}
          reservations={adminData.reservations}
          students={manualReservationStudents}
          selectedProfile={selectedManualProfile}
          selectedMembership={selectedManualMembership}
          selectedTokens={selectedManualTokens}
          isSaving={isSavingManualReservation}
          onDraftChange={setManualReservationDraft}
          onSave={saveManualReservation}
          onUpdateStatus={updateReservationStatus}
          formatDate={formatDate}
          toTime={toTime}
        />
      ) : null}

      {activeSection === 'wod' ? (
        <AdminWodModule
          draft={wodDraft}
          wodItems={adminData.wod}
          onDraftChange={setWodDraft}
          onSave={saveWod}
          formatDate={formatDate}
          isSaving={isSavingWod}
          draftRecovery={{
            hasStoredDraft: hasStoredWodDraft,
            metadata: storedWodDraftMetadata,
            status: storedWodDraftStatus,
            isDirty: isWodDraftDirty,
            storageError: wodDraftStorageError,
            onRecover: recoverWodDraft,
            onDiscard: discardWodDraft,
            onSaveLocal: saveWodDraftLocally,
          }}
        />
      ) : null}

      {activeSection === 'schedule' ? (
        <AdminScheduleModule
          draft={scheduleDraft}
          scheduleItems={adminData.schedule}
          onDraftChange={setScheduleDraft}
          onSave={saveSchedule}
          onEdit={editSchedule}
          onToggle={toggleSchedule}
          toTime={toTime}
          isSaving={isSavingSchedule}
        />
      ) : null}

      {activeSection === 'community' ? (
        <AdminCommunicationsModule
          draft={postDraft}
          posts={adminData.posts}
          onDraftChange={setPostDraft}
          onSave={savePost}
          onEdit={editPost}
          onToggle={togglePost}
          isSaving={isSavingPost}
        />
      ) : null}

      {activeSection === 'texts' ? (
        <AdminSettingsModule
          textDraft={textDraft}
          onTextChange={updateTextDraftField}
          onSave={saveTexts}
          isSaving={isSavingSettings}
        />
      ) : null}

      {activeSection === 'birthdays' ? (
        <AdminBirthdaysModule
          birthdays={adminData.birthdays}
          upcomingBirthdays={adminData.upcomingBirthdays}
          formatBirthdayDayMonth={formatBirthdayDayMonth}
          onCopyGreeting={copyBirthdayGreeting}
        />
      ) : null}

      {activeSection === 'prs' ? (
        <AdminPersonalRecordsModule records={adminData.prs} formatDate={formatDate} />
      ) : null}
	        </div>
	      </div>
      <AdminMobileModuleNav
        modules={adminNavigationModules}
        activeModuleId={currentModuleId}
        onNavigate={navigateAdmin}
      />
      <div className="fixed bottom-5 right-4 z-30 hidden gap-2 lg:grid">
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-kupan-ember text-xs font-black text-white shadow-glow transition hover:scale-105"
          onClick={() => navigateAdmin({ id: 'create-student', target: 'create-student-form' })}
          aria-label="Crear alumno rapido"
        >
          NA
        </button>
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-kupan-gray text-xs font-black text-white shadow-2xl transition hover:scale-105"
          onClick={() => navigateAdmin({ id: 'memberships', target: 'membership-activate' })}
          aria-label="Activar membresia rapido"
        >
          ME
        </button>
      </div>
    </div>
  )
}
