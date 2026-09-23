import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'

test('real PostgreSQL execution: private access, projection, selection, revocation and no writes', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.profiles (id uuid primary key, full_name text, role text, status text, email text);
      create table public.plans (id uuid primary key, name text, is_unlimited boolean);
      create table public.memberships (id uuid primary key default gen_random_uuid(), profile_id uuid references profiles(id), plan_id uuid references plans(id), start_date date, end_date date, expires_at date, status text, payment_status text, classes_total integer, classes_used integer, created_at timestamptz default now());
      create function public.is_admin() returns boolean language sql security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active') $$;
      insert into profiles values
        ('00000000-0000-4000-8000-000000000001', 'Admin', 'admin', 'active', 'private@example.invalid'),
        ('00000000-0000-4000-8000-000000000002', 'Vigente', 'student', 'active', 'private@example.invalid'),
        ('00000000-0000-4000-8000-000000000003', 'Sin plan', 'student', 'active', null),
        ('00000000-0000-4000-8000-000000000004', 'Inactivo', 'student', 'inactive', null),
        ('00000000-0000-4000-8000-000000000005', 'Coach', 'coach', 'active', null),
        ('00000000-0000-4000-8000-000000000006', 'Vencido', 'student', 'active', null),
        ('00000000-0000-4000-8000-000000000007', 'Ilimitado', 'student', 'active', null);
      insert into plans values
        ('10000000-0000-4000-8000-000000000001', '12 clases', false),
        ('10000000-0000-4000-8000-000000000002', 'Libre', true);
      insert into memberships (profile_id, plan_id, start_date, end_date, expires_at, status, payment_status, classes_total, classes_used)
      select '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', today - 10, today + 20, today + 20, 'active', 'paid', 12, 4 from (select (now() at time zone 'America/Santiago')::date today) t;
      insert into memberships (profile_id, plan_id, start_date, end_date, expires_at, status, payment_status, classes_total, classes_used)
      select '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', today + 21, today + 51, today + 51, 'active', 'paid', 12, 0 from (select (now() at time zone 'America/Santiago')::date today) t;
      insert into memberships (profile_id, plan_id, start_date, end_date, expires_at, status, payment_status, classes_total, classes_used)
      select '00000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', today - 40, today - 10, today - 10, 'expired', 'paid', 12, 12 from (select (now() at time zone 'America/Santiago')::date today) t;
      insert into memberships (profile_id, plan_id, start_date, end_date, expires_at, status, payment_status, classes_total, classes_used)
      select '00000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', today - 10, today + 20, today + 5, 'active', 'paid', null, 0 from (select (now() at time zone 'America/Santiago')::date today) t;
    `)
    await db.exec(readFileSync(new URL('../../supabase/migrations/20260921170000_read_only_student_roster.sql', import.meta.url), 'utf8'))
    const before = await db.query('select * from public.memberships order by id')
    const queryAs = async (role, user, sql, args = []) => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
      await db.exec(`set role ${role}`)
      return db.query(sql, args)
    }
    const denied = async (promise) => assert.rejects(promise, (error) => error.code === '42501')
    const admin = '00000000-0000-4000-8000-000000000001'
    const student = '00000000-0000-4000-8000-000000000002'

    await denied(queryAs('anon', null, "select public.admin_create_student_roster_link('forbidden', 90)"))
    await denied(queryAs('authenticated', student, "select public.admin_create_student_roster_link('forbidden', 90)"))
    await denied(queryAs('authenticated', student, 'select * from public.admin_list_student_roster_links()'))
    const { rows: created } = await queryAs('authenticated', admin, "select public.admin_create_student_roster_link('Test only', 90) as link")
    const link = created[0].link
    assert.match(link.access_token, /^[a-f0-9]{64}$/)
    await denied(queryAs('anon', null, 'select * from public.student_roster_links'))
    await denied(queryAs('authenticated', admin, 'select * from public.student_roster_links'))
    for (const secret of [null, '', 'a'.repeat(64), link.access_token.slice(1), "' OR true --"]) {
      await denied(queryAs('anon', null, 'select public.read_student_roster($1)', [secret]))
    }
    const read = async () => (await queryAs('anon', null, 'select public.read_student_roster($1) as roster', [link.access_token])).rows[0].roster
    const roster = await read()
    assert.equal(roster.students.length, 4)
    assert.equal(roster.students.find((s) => s.full_name === 'Vigente').remaining_tokens, 8, 'future renewal must not hide current balance')
    assert.equal(roster.students.find((s) => s.full_name === 'Sin plan').membership_id, null)
    assert.equal(roster.students.find((s) => s.full_name === 'Vencido').remaining_tokens, 0)
    const unlimited = roster.students.find((s) => s.full_name === 'Ilimitado')
    assert.equal(unlimited.remaining_tokens, null)
    assert.equal(unlimited.is_unlimited, true)
    assert.ok(unlimited.effective_end_date < unlimited.end_date)
    assert.equal(JSON.stringify(roster).includes('private@example.invalid'), false)
    assert.equal(Object.hasOwn(roster.students[0], 'email'), false)
    await denied(queryAs('anon', null, "update public.memberships set classes_used = 0"))
    await denied(queryAs('anon', null, 'select public.admin_revoke_student_roster_link($1)', [link.id]))
    await denied(queryAs('authenticated', student, 'select public.admin_revoke_student_roster_link($1)', [link.id]))

    await db.exec('reset role')
    await db.exec("insert into profiles (id, full_name, role, status) select gen_random_uuid(), 'Scale test ' || n, 'student', 'active' from generate_series(1, 1100) n")
    assert.equal((await read()).students.length, 1104, 'no silent 1000-row truncation')
    const list = await queryAs('authenticated', admin, 'select * from public.admin_list_student_roster_links()')
    assert.equal(list.rows.length, 1)
    assert.equal(Object.hasOwn(list.rows[0], 'token_hash'), false)
    await queryAs('authenticated', admin, 'select public.admin_revoke_student_roster_link($1)', [link.id])
    await denied(read())

    const { rows: expiring } = await queryAs('authenticated', admin, "select public.admin_create_student_roster_link('Expired test', 1) as link")
    await db.exec('reset role')
    await db.query("update public.student_roster_links set created_at = now() - interval '2 days', expires_at = now() - interval '1 day' where id = $1", [expiring[0].link.id])
    await denied(queryAs('anon', null, 'select public.read_student_roster($1)', [expiring[0].link.access_token]))
    await db.exec('reset role')
    const after = await db.query('select * from public.memberships order by id')
    assert.deepEqual(after.rows, before.rows, 'roster operations never change memberships')
  } finally { await db.close() }
})
