import { createAdminClient, getEnvironment } from './lib/environment.mjs'
import { registerResource } from './resource-manifest.mjs'

const dryRun = process.argv.includes('--dry-run')
const environment = getEnvironment()
if (!environment.isValid) {
  console.log('Seed E2E data: BLOCKED')
  for (const error of environment.errors) console.log(`- ${error}`)
  process.exit(1)
}
if (process.env.STAGING_SCHEMA_VALIDATED !== 'true') {
  console.log('Seed E2E data: BLOCKED')
  console.log('- STAGING_SCHEMA_VALIDATED debe ser true')
  process.exit(1)
}

if (dryRun) {
  console.log('Seed E2E data dry-run: OK')
  console.log('- KUPAN E2E PLAN 8: WOULD_CREATE_OR_REUSE')
  console.log('- KUPAN E2E FULL: WOULD_CREATE_OR_REUSE')
  console.log('- KUPAN E2E SCHEDULE: WOULD_CREATE_OR_REUSE')
  console.log('- KUPAN E2E POST: WOULD_CREATE_OR_REUSE')
  console.log('- WOD 2099-12-31: WOULD_CREATE_OR_REUSE')
  process.exit(0)
}

const supabase = createAdminClient(environment)

async function upsertByName(table, name, payload, type) {
  const { data: existing, error: findError } = await supabase.from(table).select('*').eq('name', name).maybeSingle()
  if (findError) throw findError
  if (existing) {
    registerResource(type, { id: existing.id, name }, environment)
    return { status: 'REUSED', row: existing }
  }
  const { data, error } = await supabase.from(table).insert(payload).select('*').single()
  if (error) throw error
  registerResource(type, { id: data.id, name }, environment)
  return { status: 'CREATED', row: data }
}

async function upsertPost() {
  const title = 'KUPAN E2E POST'
  const { data: existing, error: findError } = await supabase.from('community_posts').select('*').eq('title', title).maybeSingle()
  if (findError) throw findError
  if (existing) {
    registerResource('posts', { id: existing.id, name: title }, environment)
    return 'REUSED'
  }
  const { data, error } = await supabase
    .from('community_posts')
    .insert({ type: 'news', title, content: 'Contenido ficticio staging kupan-e2e', active: true })
    .select('*')
    .single()
  if (error) throw error
  registerResource('posts', { id: data.id, name: title }, environment)
  return 'CREATED'
}

async function upsertWod() {
  const date = '2099-12-31'
  const payload = {
    date,
    title: 'KUPAN E2E WOD',
    warmup: 'KUPAN E2E warm up',
    strength: 'KUPAN E2E strength',
    workout: 'KUPAN E2E workout',
    time_cap: '12 min',
    notes: 'kupan-e2e',
  }
  const { data, error } = await supabase.from('wod').upsert(payload, { onConflict: 'date' }).select('*').single()
  if (error) throw error
  registerResource('wodDates', { id: date, name: `kupan-e2e-wod-${date}`, reference: date }, environment)
  return data ? 'CREATED_OR_UPDATED' : 'SKIPPED'
}

const tokenPlan = await upsertByName('plans', 'KUPAN E2E PLAN 8', {
  name: 'KUPAN E2E PLAN 8',
  price: 1,
  classes_per_week: 8,
  is_unlimited: false,
  active: true,
}, 'plans')
console.log(`Plan tokenizado: ${tokenPlan.status}`)

const fullPlan = await upsertByName('plans', 'KUPAN E2E FULL', {
  name: 'KUPAN E2E FULL',
  price: 1,
  classes_per_week: null,
  is_unlimited: true,
  active: true,
}, 'plans')
console.log(`Plan full: ${fullPlan.status}`)

const { data: scheduleExisting, error: scheduleFindError } = await supabase
  .from('class_schedule')
  .select('*')
  .eq('class_name', 'KUPAN E2E CLASS')
  .eq('day_of_week', 1)
  .eq('time', '09:00')
  .maybeSingle()
if (scheduleFindError) throw scheduleFindError
if (scheduleExisting) {
  registerResource('schedules', { id: scheduleExisting.id, name: 'KUPAN E2E CLASS' }, environment)
  console.log('Horario: REUSED')
} else {
  const { data, error } = await supabase
    .from('class_schedule')
    .insert({ day_of_week: 1, time: '09:00', class_name: 'KUPAN E2E CLASS', coach: 'KUPAN E2E COACH', max_spots: 12, active: true })
    .select('*')
    .single()
  if (error) throw error
  registerResource('schedules', { id: data.id, name: 'KUPAN E2E CLASS' }, environment)
  console.log('Horario: CREATED')
}

console.log(`Post: ${await upsertPost()}`)
console.log(`WOD: ${await upsertWod()}`)

const studentEmail = process.env.STAGING_STUDENT_EMAIL
if (studentEmail) {
  const { data: student, error: studentError } = await supabase.from('profiles').select('*').eq('email', studentEmail).maybeSingle()
  if (studentError) throw studentError
  if (student) {
    const { data: existingMembership, error: membershipFindError } = await supabase
      .from('memberships')
      .select('*')
      .eq('profile_id', student.id)
      .eq('notes', 'kupan-e2e-membership')
      .maybeSingle()
    if (membershipFindError) throw membershipFindError
    if (existingMembership) {
      registerResource('memberships', { id: existingMembership.id, name: 'kupan-e2e-membership' }, environment)
      console.log('Membresia alumno: REUSED')
    } else {
      const startDate = new Date().toISOString().slice(0, 10)
      const end = new Date(`${startDate}T00:00:00.000Z`)
      end.setUTCDate(end.getUTCDate() + 30)
      const endDate = end.toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('memberships')
        .insert({
          profile_id: student.id,
          plan_id: tokenPlan.row.id,
          start_date: startDate,
          end_date: endDate,
          expires_at: endDate,
          status: 'active',
          payment_status: 'paid',
          classes_total: 8,
          classes_used: 0,
          notes: 'kupan-e2e-membership',
          activated_at: new Date().toISOString(),
          auto_activated: false,
        })
        .select('*')
        .single()
      if (error) throw error
      registerResource('memberships', { id: data.id, name: 'kupan-e2e-membership', dependencies: [student.id, tokenPlan.row.id] }, environment)
      console.log('Membresia alumno: CREATED')
    }
  } else {
    console.log('Membresia alumno: SKIPPED, falta profile alumno E2E')
  }
} else {
  console.log('Membresia alumno: SKIPPED, falta STAGING_STUDENT_EMAIL')
}
