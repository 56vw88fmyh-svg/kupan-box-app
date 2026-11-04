const missingRpcCodes = new Set(['PGRST202', '42883'])
export function getNextChileScheduleDate(day, now = new Date()) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year:'numeric', month:'2-digit', day:'2-digit' }).format(now)
  const date = new Date(`${key}T12:00:00Z`)
  const today = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + (Number(day) - today + 7) % 7)
  return date.toISOString().slice(0,10)
}
export async function loadScheduleAvailability(client, requests) {
  if (!requests.length) return new Map()
  const result = await client.rpc('get_schedule_availability', { target_requests: requests })
  if (!result.error) {
    const availability = new Map((result.data ?? []).map((row) => [`${row.class_schedule_id}:${row.reservation_date}`, Number(row.available_spots)]))
    if (requests.some((row) => !Number.isFinite(availability.get(`${row.class_schedule_id}:${row.reservation_date}`)))) throw new Error('availability_incomplete')
    return availability
  }
  if (!missingRpcCodes.has(result.error.code)) throw result.error
  // Transitional fallback for deployments whose SQL has not yet been upgraded.
  const map = new Map()
  let next = 0
  await Promise.all(Array.from({length:Math.min(4, requests.length)}, async () => {
    while (next < requests.length) {
      const request = requests[next++]
      const item = await client.rpc('available_spots', {class_id:request.class_schedule_id,target_date:request.reservation_date})
      if (item.error || item.data === null || !Number.isFinite(Number(item.data))) throw item.error ?? new Error('availability_invalid')
      map.set(`${request.class_schedule_id}:${request.reservation_date}`, Number(item.data))
    }
  }))
  return map
}
