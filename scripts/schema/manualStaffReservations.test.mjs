import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const admin = '00000000-0000-4000-8000-000000000001'
const coach = '00000000-0000-4000-8000-000000000002'
const full = '00000000-0000-4000-8000-000000000003'
const limited = '00000000-0000-4000-8000-000000000004'
const noPlan = '00000000-0000-4000-8000-000000000005'
const inactive = '00000000-0000-4000-8000-000000000006'
const expired = '00000000-0000-4000-8000-000000000007'
const slot = '10000000-0000-4000-8000-000000000001'
const otherSlot = '10000000-0000-4000-8000-000000000002'
const source = readFileSync('tests/fixtures/manual-reservation-before.sql', 'utf8')
const migration = readFileSync('supabase/migrations/20261105230000_manual_staff_reservations.sql', 'utf8')
const actAs = async id => db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`)
const reserve = (id, overrides = {}) => db.query(`select admin_reserve_for_student('${id}','${overrides.slot ?? slot}',${overrides.date ?? "(now() at time zone 'America/Santiago')::date"},${overrides.allow ?? false},'test') as result`)
const rejects = async (fn, text) => assert.rejects(fn, error => error.message.includes(text))
try {
  await db.exec(`set timezone = 'America/Santiago'; create role anon; create role authenticated; create schema auth; create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated, anon;
    create table profiles(id uuid primary key,full_name text,email text,phone text,role text,status text);
    create table plans(id uuid primary key,is_unlimited boolean);
    create table class_schedule(id uuid primary key,day_of_week int,time time,class_name text,coach text,max_spots int,active boolean);
    create table memberships(id uuid primary key default gen_random_uuid(),profile_id uuid,plan_id uuid,status text,payment_status text,start_date date,end_date date,expires_at date,activated_at timestamptz,created_at timestamptz default now(),classes_total int,classes_used int);
    create table reservations(id uuid primary key default gen_random_uuid(),profile_id uuid,class_schedule_id uuid,reservation_date date,status text,membership_id uuid,token_charged boolean,notes text,cancellation_kind text,created_at timestamptz default now());
    create unique index unique_live_booking on reservations(profile_id,class_schedule_id,reservation_date) where status in ('reserved','attended','no_show');
    create table membership_token_movements(id uuid default gen_random_uuid(),membership_id uuid,profile_id uuid,reservation_id uuid,movement_type text,quantity int,reason text,created_by uuid);
    insert into profiles(id,role,status) values ('${admin}','admin','active'),('${coach}','coach','active'),('${full}','student','active'),('${limited}','student','active'),('${noPlan}','student','active'),('${inactive}','coach','inactive'),('${expired}','student','active');
    insert into plans values ('20000000-0000-4000-8000-000000000001',true),('20000000-0000-4000-8000-000000000002',false);
    insert into memberships(profile_id,plan_id,status,payment_status,start_date,end_date,expires_at,activated_at,classes_total,classes_used) values
    ('${full}','20000000-0000-4000-8000-000000000001','active','paid',current_date-1,current_date+28,current_date+28,now()-interval '60 days',null,0),
    ('${limited}','20000000-0000-4000-8000-000000000002','active','paid',current_date-1,current_date+28,current_date+28,now(),8,2),
    ('${expired}','20000000-0000-4000-8000-000000000002','active','paid',current_date-40,current_date-1,current_date-1,now(),8,0);
    insert into class_schedule values ('${slot}',extract(isodow from now() at time zone 'America/Santiago'),'00:00','CrossFit','Test',10,true),('${otherSlot}',extract(isodow from now() at time zone 'America/Santiago'),'00:01','Hybrid','Test',10,true);
    create function is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role='admin' and status='active')$$;
    create function is_coach_or_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role in ('admin','coach') and status='active')$$;
    create function has_active_membership(who uuid) returns boolean language sql stable security definer as $$select exists(select 1 from memberships where profile_id=who and status='active' and payment_status='paid' and start_date<=current_date and end_date>=current_date)$$;
    create function kupan_setting_int(setting text,fallback int) returns int language sql as $$select fallback$$;
    create function kupan_class_starts_at(slot_id uuid,day date) returns timestamptz language sql as $$select (day+time) at time zone 'America/Santiago' from class_schedule where id=slot_id$$;
    create function available_spots(slot_id uuid,day date) returns int language sql security definer as $$select max_spots-(select count(*)::int from reservations where class_schedule_id=slot_id and reservation_date=day and status in ('reserved','attended','no_show')) from class_schedule where id=slot_id$$;
    alter table reservations enable row level security;
    grant select,insert,update on reservations to authenticated;
    create policy admins_manage on reservations for all to authenticated using(is_admin()) with check(is_admin());
  `)
  await db.exec(source)
  await db.exec('create trigger guard_reservation_write_trigger before insert or update on reservations for each row execute function guard_reservation_write()')
  await actAs(admin)
  await rejects(() => reserve(full), 'fuera del período permitido')
  await db.exec('reset role')
  const installer = readFileSync('supabase/releases/20261105_manual_staff_reservations.sql', 'utf8')
  await db.exec(installer)
  const installed = (await db.query("select pg_get_functiondef(oid) d from pg_proc where pronamespace='public'::regnamespace and proname in ('admin_reserve_for_student','guard_reservation_write') order by proname")).rows
  await db.exec(migration)
  assert.deepEqual((await db.query("select pg_get_functiondef(oid) d from pg_proc where pronamespace='public'::regnamespace and proname in ('admin_reserve_for_student','guard_reservation_write') order by proname")).rows, installed)
  await db.exec(installer)
  assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n, 1)
  await actAs(admin)
  const first = (await reserve(full)).rows[0].result
  assert.equal(first.token_charged, false)
  await rejects(() => reserve(full), 'ya tiene una reserva')
  await rejects(() => reserve(full, { slot: otherSlot }), 'límite diario')
  await actAs(coach)
  const finite = (await reserve(limited)).rows[0].result
  assert.equal(finite.token_charged, true)
  // A coach still cannot bypass the RPC to insert a reservation directly.
  await assert.rejects(db.query(`insert into reservations(profile_id,class_schedule_id,reservation_date,status) values ('${coach}','${otherSlot}',current_date,'reserved')`), error => error.code === '42501')
  await rejects(() => reserve(noPlan), 'no tiene plan activo')
  await rejects(() => reserve(noPlan, { allow: true }), 'Solo admin')
  await rejects(() => reserve(expired), 'no tiene plan activo')
  await rejects(() => reserve(noPlan, { date: "(now() at time zone 'America/Santiago')::date-7" }), 'fecha debe estar')
  await rejects(() => reserve(noPlan, { date: "(now() at time zone 'America/Santiago')::date+14" }), 'fecha debe estar')
  await rejects(() => reserve(noPlan, { date: "(now() at time zone 'America/Santiago')::date+1" }), 'no corresponde')
  await db.exec('reset role')
  assert.equal((await db.query(`select classes_used from memberships where profile_id='${limited}'`)).rows[0].classes_used, 3)
  assert.equal((await db.query('select count(*)::int n from membership_token_movements')).rows[0].n, 1)
  await db.exec(`update memberships set classes_used=8 where profile_id='${limited}'`)
  await actAs(coach)
  await rejects(() => reserve(limited, { slot: otherSlot }), 'no tiene tokens')
  await actAs(full)
  await rejects(() => reserve(limited, { slot: otherSlot }), 'Solo admin o coach')
  await actAs(inactive)
  await rejects(() => reserve(limited, { slot: otherSlot }), 'Solo admin o coach')
  await actAs('')
  await rejects(() => reserve(limited, { slot: otherSlot }), 'Debes iniciar')
  await db.exec('reset role; set role anon')
  await rejects(() => reserve(limited, { slot: otherSlot }), 'Debes iniciar')
  await db.exec('reset role')
  await db.exec(`update class_schedule set max_spots=2 where id='${slot}'`)
  await actAs(admin)
  await rejects(() => reserve(noPlan, { allow: true }), 'Clase completa')
  const override = (await reserve(noPlan, { slot: otherSlot, allow: true })).rows[0].result
  assert.equal(override.membership_id, null)
  assert.equal(override.token_charged, false)
  await db.exec('reset role')
  assert.equal((await db.query('select count(*)::int n from reservations')).rows[0].n, 3)
  console.log('Manual staff booking: original cutoff reproduced; same-day admin/coach, Full, exact token charge, duplicate, capacity, date, membership, RLS and role checks OK')
} catch (error) { console.error(error.stack); process.exitCode = 1 } finally { await db.close() }
