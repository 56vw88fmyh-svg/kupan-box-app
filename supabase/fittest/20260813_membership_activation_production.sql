-- FITTEST production: activa membresías manuales o mediante pago simulado.
-- Idempotente y compatible con el formulario administrativo actual.

begin;

create or replace function public.admin_activate_membership(
  target_profile_id uuid,
  target_plan_id uuid,
  membership_start_date date,
  classes_total_override integer default null,
  initial_classes_used integer default 0,
  payment_provider_input text default 'manual_admin',
  payment_reference_input text default null,
  notes_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  plan_record public.plans%rowtype;
  membership_record public.memberships%rowtype;
  total_classes integer;
  used_classes integer;
  final_payment_reference text;
begin
  if not public.is_admin() then
    raise exception 'Solo admin activo puede activar membresías.';
  end if;

  if target_profile_id is null or target_plan_id is null or membership_start_date is null then
    raise exception 'Selecciona alumno, plan e inicio para activar la membresía.';
  end if;

  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception 'El alumno seleccionado no existe.';
  end if;

  select * into plan_record
  from public.plans
  where id = target_plan_id and active = true;

  if not found then
    raise exception 'El plan seleccionado no existe o está inactivo.';
  end if;

  used_classes := greatest(coalesce(initial_classes_used, 0), 0);

  if plan_record.is_unlimited then
    total_classes := null;
    used_classes := 0;
  else
    total_classes := coalesce(
      classes_total_override,
      case
        when plan_record.name ilike '%4%' then 4
        when plan_record.name ilike '%8%' then 8
        when plan_record.name ilike '%9%' then 9
        when plan_record.name ilike '%12%' then 12
        when plan_record.name ilike '%16%' then 16
        else coalesce(plan_record.classes_per_week, 0) * 4
      end
    );

    if total_classes <= 0 then
      raise exception 'Indica un total de tokens válido para el plan.';
    end if;

    if used_classes > total_classes then
      raise exception 'Los tokens ya usados no pueden ser mayores que los tokens del plan.';
    end if;
  end if;

  final_payment_reference := coalesce(
    nullif(trim(payment_reference_input), ''),
    'manual-' || target_profile_id::text || '-' || extract(epoch from clock_timestamp())::bigint::text
  );

  update public.memberships
  set status = 'expired', updated_at = now()
  where profile_id = target_profile_id and status = 'active';

  insert into public.memberships (
    profile_id, plan_id, start_date, end_date, expires_at, status,
    classes_total, classes_used, payment_status, payment_provider,
    payment_reference, activated_at, auto_activated, notes
  ) values (
    target_profile_id, target_plan_id, membership_start_date,
    membership_start_date + 30, membership_start_date + 30, 'active',
    total_classes, used_classes, 'paid',
    coalesce(nullif(trim(payment_provider_input), ''), 'manual_admin'),
    final_payment_reference, now(), false, nullif(trim(notes_input), '')
  )
  returning * into membership_record;

  if used_classes > 0 then
    insert into public.membership_token_movements (
      membership_id, profile_id, movement_type, quantity, reason, created_by
    ) values (
      membership_record.id, membership_record.profile_id, 'manual_adjustment',
      used_classes, 'Migración inicial: clases usadas antes de activar la app', auth.uid()
    );
  end if;

  return jsonb_build_object(
    'id', membership_record.id,
    'profile_id', membership_record.profile_id,
    'plan_id', membership_record.plan_id,
    'start_date', membership_record.start_date,
    'end_date', membership_record.end_date,
    'status', membership_record.status,
    'payment_status', membership_record.payment_status,
    'payment_provider', membership_record.payment_provider,
    'payment_reference', membership_record.payment_reference,
    'classes_total', membership_record.classes_total,
    'classes_used', membership_record.classes_used,
    'available_tokens', case
      when membership_record.classes_total is null then null
      else greatest(membership_record.classes_total - membership_record.classes_used, 0)
    end
  );
end;
$$;

revoke all on function public.admin_activate_membership(uuid, uuid, date, integer, integer, text, text, text) from public;
grant execute on function public.admin_activate_membership(uuid, uuid, date, integer, integer, text, text, text) to authenticated, service_role;

commit;

select
  to_regprocedure('public.admin_activate_membership(uuid,uuid,date,integer,integer,text,text,text)') is not null
    as membership_activation_ready;
