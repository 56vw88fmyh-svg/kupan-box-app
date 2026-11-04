import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table public.wod(id uuid primary key, date date, title text, warmup text, strength text, workout text, time_cap text, notes text, created_at timestamptz, updated_at timestamptz);
    insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
    insert into wod(id,date,title) values ('10000000-0000-4000-8000-000000000001',current_date,'Test');
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`)
  const migration = readFileSync(new URL('../../supabase/migrations/20261104120000_training_reliability.sql', import.meta.url),'utf8')
  await db.exec(migration); await db.exec(migration)
  const a = '00000000-0000-4000-8000-000000000001', b = '00000000-0000-4000-8000-000000000002'
  const context = JSON.stringify({ wod_id: '10000000-0000-4000-8000-000000000001', version: 'v1', level: 'RX', result_type: 'rounds_reps' })
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`)
  await db.query(`insert into workout_results(id,profile_id,movement,value,unit,record_date,rounds,reps,result_context) values ('20000000-0000-4000-8000-000000000001',$1,'Test',0,'reps',current_date,0,15,$2)`,[a,context])
  assert.equal((await db.query('select * from workout_results')).rows.length,1)
  await assert.rejects(db.query(`insert into workout_results(id,profile_id,movement,value,unit,record_date,rounds,reps,result_context) values ('20000000-0000-4000-8000-000000000002',$1,'Test',0,'reps',current_date,0,15,$2)`,[b,context]))
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`)
  assert.equal((await db.query('select * from workout_results')).rows.length,0)
  await assert.rejects(db.exec('delete from workout_results'))
  await db.exec('set role anon')
  await assert.rejects(db.exec('select * from workout_results'))
  const publicWod = (await db.query('select get_public_todays_wod_v2(current_date) as wod')).rows[0].wod
  assert.equal(publicWod.title,'Test'); assert.deepEqual(publicWod.training_details,{})
  console.log('PostgreSQL migration, replay, RLS owners, anon denial and WOD projection: OK')
} finally { await db.close() }
