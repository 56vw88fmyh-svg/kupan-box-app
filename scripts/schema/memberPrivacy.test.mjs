import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
try {
await db.exec(`set timezone = 'America/Santiago'; create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;
 create table profiles(id uuid primary key,full_name text,birth_date date,role text,status text,phone text,level text);
 create function is_admin() returns boolean language sql stable security definer as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;
 create table reservations(id uuid primary key default gen_random_uuid(),profile_id uuid,status text,reservation_date date);
 create table wod(id uuid,date date,title text,warmup text,strength text,workout text,time_cap text,notes text,created_at timestamptz,updated_at timestamptz);
 create table personal_records(id uuid primary key default gen_random_uuid(),profile_id uuid,movement text,value numeric,unit text,record_date date,created_at timestamptz default now(),rounds integer,reps integer,time_seconds integer);
 create table community_posts(id uuid,type text,title text,content text,event_date date,created_at timestamptz,active boolean);
 insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
 insert into profiles select id,'PRIVATE FULL NAME',(now() at time zone 'America/Santiago')::date,'student','active','PRIVATE PHONE','RX' from auth.users;
 insert into reservations(profile_id,status,reservation_date) select id,'attended',current_date from auth.users;
 insert into reservations(profile_id,status,reservation_date) select id,'reserved',current_date from auth.users;
 insert into personal_records(profile_id,movement,value,unit,record_date) select id,'Deadlift',100,'kg',current_date from auth.users;
`)
for(const file of ['supabase/sql/community-public-feed.sql','supabase/sql/birthdays-functions.sql','supabase/sql/pr-ranking.sql']) await db.exec(readFileSync(file,'utf8'))
const migration=readFileSync('supabase/migrations/20261104140000_metrics_and_member_privacy.sql','utf8')
await db.exec(migration); await db.exec(migration)
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`)
await db.query('insert into athlete_preferences(profile_id,community_alias,share_attendance,share_records,share_birthday,weekly_goal) values ($1,$2,true,true,true,3)',[a,'Alias A'])
await assert.rejects(db.query('insert into athlete_preferences(profile_id) values ($1)',[b]))
await assert.rejects(db.query('update athlete_preferences set weekly_goal=0 where profile_id=$1',[a]))
let feed=(await db.query('select get_member_community_feed() as feed')).rows[0].feed
assert.equal(feed.ranking.length,1);assert.equal(feed.ranking[0].attendance_count,1);assert.equal(feed.ranking[0].full_name,'Alias A')
assert.equal(feed.records.length,1);assert.equal(feed.birthdays.length,1)
assert.ok(!JSON.stringify(feed).includes('PRIVATE'))
assert.equal((await db.query('select * from get_public_good_vibes_ranking()')).rows[0].reservations_count,1)
assert.ok(!JSON.stringify((await db.query('select * from get_public_recent_prs()')).rows).includes('PRIVATE'))
assert.ok(!JSON.stringify((await db.query('select * from get_public_pr_ranking()')).rows).includes('PRIVATE'))
assert.equal((await db.query('select * from birthdays_this_month()')).rows.length,0)
await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`)
assert.equal((await db.query('select * from athlete_preferences')).rows.length,0)
await db.exec(`select set_config('request.jwt.claim.sub','${a}',false)`)
await db.exec('update athlete_preferences set share_attendance=false,share_records=false,share_birthday=false')
feed=(await db.query('select get_member_community_feed() as feed')).rows[0].feed
assert.deepEqual(feed.ranking,[]);assert.deepEqual(feed.records,[]);assert.deepEqual(feed.birthdays,[])
await db.exec(`reset role; update profiles set status='inactive' where id='${b}'; set role authenticated; select set_config('request.jwt.claim.sub','${b}',false)`)
await assert.rejects(db.exec('select get_member_community_feed()'))
assert.equal((await db.query('select * from get_public_recent_prs()')).rows.length,0)
await db.exec(`reset role; update profiles set role='admin' where id='00000000-0000-4000-8000-000000000003'; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false)`)
assert.ok((await db.query('select * from birthdays_this_month()')).rows.length > 0)
assert.ok((await db.query('select * from upcoming_birthdays()')).rows.length > 0)
await db.exec('set role anon')
for(const sql of ['select * from athlete_preferences','select get_member_community_feed()','select * from get_public_recent_prs()','select * from get_public_good_vibes_ranking()','select * from birthdays_this_month()','select * from upcoming_birthdays()','select * from stage2_private_get_public_recent_prs()']) await assert.rejects(db.exec(sql))
console.log('PostgreSQL privacy: opt-in, alias, attendance-only, owner isolation, revoke consent, anon and legacy RPC denial OK')
} catch(error) { console.error(error.message, error.code, error.detail, error.where); process.exitCode=1 } finally {await db.close()}
