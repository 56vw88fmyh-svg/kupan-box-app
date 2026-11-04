begin;

-- Owner-only projection: existing reservation RLS can recurse through profiles.
-- No profile identifiers or credentials are accepted from the caller.
create or replace function public.get_my_training_attendance(page_offset integer default 0, page_size integer default 250)
returns table (id uuid, reservation_date date, status text, class_schedule jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Member session required' using errcode = '42501';
  end if;
  if page_offset is null or page_offset < 0 or page_offset > 10000 or page_size is null or page_size < 1 or page_size > 250 then
    raise exception 'Invalid attendance page' using errcode = '22023';
  end if;
  return query
    select r.id, r.reservation_date, r.status::text,
      jsonb_build_object('time', cs.time, 'class_name', cs.class_name)
    from public.reservations r
    left join public.class_schedule cs on cs.id = r.class_schedule_id
    where r.profile_id = auth.uid()
    order by r.reservation_date desc, r.id desc
    limit page_size offset page_offset;
end;
$$;

revoke all on function public.get_my_training_attendance(integer, integer) from public, anon, authenticated;
grant execute on function public.get_my_training_attendance(integer, integer) to authenticated;
commit;
