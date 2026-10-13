-- Keep future attendance rosters aligned with accepted module registrations.

create or replace function private.sync_registration_attendance_rosters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    insert into public.attendance_records (session_id, student_id, source)
    select s.id, new.student_id, 'roster'
    from public.attendance_sessions s
    where s.module_id = new.module_id
      and s.session_date >= current_date
      and s.status in ('scheduled','open')
    on conflict (session_id,student_id) do nothing;
  elsif old.status = 'active' and new.status <> 'active' then
    delete from public.attendance_records r
    using public.attendance_sessions s
    where r.session_id = s.id
      and r.student_id = new.student_id
      and r.source = 'roster'
      and s.module_id = new.module_id
      and s.session_date >= current_date
      and s.status = 'scheduled';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_registration_attendance_rosters on public.student_module_registrations;
create trigger sync_registration_attendance_rosters
after insert or update of status on public.student_module_registrations
for each row execute function private.sync_registration_attendance_rosters();
