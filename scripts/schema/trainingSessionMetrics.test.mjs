import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite()
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;
 create table wod(id uuid primary key,date date,title text,warmup text,strength text,workout text,time_cap text,notes text,created_at timestamptz,updated_at timestamptz);
 insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
 insert into wod(id,date,title) values ('10000000-0000-4000-8000-000000000001',current_date,'Test');`)
 await db.exec(readFileSync('supabase/migrations/20261104120000_training_reliability.sql','utf8'))
 const migration=readFileSync('supabase/migrations/20261104160000_training_session_metrics.sql','utf8')
 await db.exec(migration);await db.exec(migration)
 const owner='00000000-0000-4000-8000-000000000001'
 const context=JSON.stringify({wod_id:'10000000-0000-4000-8000-000000000001',version:'v1',level:'RX',result_type:'time'})
 await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`)
 const insert=(rpe,duration)=>db.query("insert into workout_results(id,profile_id,movement,value,unit,record_date,time_seconds,result_context,rpe,duration_minutes) values (gen_random_uuid(),$1,'Test',300,'tiempo',current_date,300,$2,$3,$4) returning rpe,duration_minutes",[owner,context,rpe,duration])
 assert.equal((await insert(8,45)).rows[0].rpe,8)
 assert.equal((await insert(null,null)).rows[0].duration_minutes,null)
 for(const args of [[0,30],[11,30],[5,0],[5,-1],[5,601]])await assert.rejects(insert(...args))
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false)")
 assert.equal((await db.query('select * from workout_results')).rows.length,0)
 await db.exec('set role anon');await assert.rejects(db.query('select rpe,duration_minutes from workout_results'))
 console.log('Session metrics: optional values, limits, migration replay, owner isolation and anon denial OK')
}finally{await db.close()}
