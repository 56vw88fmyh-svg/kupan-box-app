export function formatRecordValue(record) {
  if (record.rounds != null) return `${record.rounds} rondas + ${record.reps ?? 0} reps`
  if (record.unit === 'tiempo') {
    const total = Math.round(Number(record.time_seconds ?? record.value))
    return Number.isFinite(total) && total >= 0 ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}` : 'Sin resultado'
  }
  const units = { kg: 'kg', reps: 'reps', metros: 'm', calorias: 'cal' }
  const number = Number(record.value)
  return Number.isFinite(number) ? `${number.toLocaleString('es-CL')} ${units[record.unit] ?? record.unit ?? ''}`.trim() : 'Sin resultado'
}
export function formatStatus(status) {
  return ({active:'Activo',inactive:'Inactivo',expired:'Vencido',reserved:'Reservada',attended:'Asistió',no_show:'Ausente',cancelled:'Cancelada',paid:'Pagado',pending:'Pendiente',paused:'Pausado',waitlist:'En espera'})[status] ?? 'Sin estado'
}
export function formatCalendarDate(value) {
  if (!value) return 'Sin fecha'
  const timestamp = String(value).includes('T')
  const date = new Date(timestamp ? value : `${String(value).slice(0,10)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:timestamp ? 'America/Santiago' : 'UTC'}).format(date)
}
