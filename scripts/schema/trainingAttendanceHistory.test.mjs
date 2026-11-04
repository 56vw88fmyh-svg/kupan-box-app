import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const owner = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;
    create table public.profiles(id uuid primary key, role text);
    create table public.class_schedule(id uuid primary key, time time, class_name text);
    create table public.reservations(id uuid primary key, profile_id uuid, class_schedule_id uuid, reservation_date date, status text);
    insert into profiles values ('${owner}','student'),('${other}','student');
    insert into class_schedule values ('10000000-0000-4000-8000-000000000001','18:00','CrossFit');
    insert into reservations values
      ('20000000-0000-4000-8000-000000000001','${owner}','10000000-0000-4000-8000-000000000001','2026-10-01','attended'),
      ('20000000-0000-4000-8000-000000000002','${owner}','10000000-0000-4000-8000-000000000001','2026-11-10','reserved'),
      ('20000000-0000-4000-8000-000000000003','${other}','10000000-0000-4000-8000-000000000001','2026-10-01','no_show');
    alter table profiles enable row level security; alter table reservations enable row level security;
    grant select on profiles,reservations,class_schedule to authenticated;
    create policy recursive_profile_policy on profiles for select to authenticated using(exists(select 1 from profiles p where p.id=auth.uid()));
    create policy existing_reservation_policy on reservations for select to authenticated using(profile_id=auth.uid() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='admin'));
  `)
  const migration = readFileSync('supabase/migrations/20261104170000_training_attendance_history.sql', 'utf8')
  await db.exec(migration)
  await db.exec(migration)
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`)
  await assert.rejects(db.query('select * from reservations'), error => error.code === '42P17')
  const { rows } = await db.query('select * from get_my_training_attendance()')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].status, 'reserved')
  assert.equal(rows[1].reservation_date.toISOString().slice(0, 10), '2026-10-01')
  assert.equal(rows[1].class_schedule.class_name, 'CrossFit')
  assert.equal('profile_id' in rows[0], false)
  assert.equal((await db.query('select * from get_my_training_attendance(1,1)')).rows[0].status, 'attended')
  for (const args of ['-1,250','0,251','0,0','null,250','0,null']) await assert.rejects(db.query(`select * from get_my_training_attendance(${args})`), error => error.code === '22023')
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`)
  assert.equal((await db.query('select * from get_my_training_attendance()')).rows[0].status, 'no_show')
  await db.exec("select set_config('request.jwt.claim.sub','',false)")
  await assert.rejects(db.query('select * from get_my_training_attendance()'), error => error.code === '42501')
  await db.exec('set role anon')
  await assert.rejects(db.query('select * from get_my_training_attendance()'), error => error.code === '42501')
  await db.exec('reset role')
  assert.equal((await db.query('select count(*)::int as n from reservations')).rows[0].n, 3)
  console.log('Attendance history: recursive legacy RLS, past/future rows, owner isolation, pagination and anonymous denial OK')
} finally { await db.close() }
