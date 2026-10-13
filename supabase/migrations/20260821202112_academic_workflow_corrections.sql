-- Professional corrections for lecturer/student academic workflows.

do $$ begin
  alter table public.quiz_questions
    add constraint quiz_questions_correct_option_zero_based_check
    check (correct_option between 0 and 3);
exception when duplicate_object then null;
end $$;

create or replace function public.delete_quiz_without_attempts(target_quiz_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.';
  end if;
  if not exists (
    select 1 from public.quizzes q
    where q.id = target_quiz_id and q.lecturer_id = (select auth.uid())
  ) then
    raise exception 'Quiz not found or you do not own it.';
  end if;
  if exists (select 1 from public.quiz_attempts a where a.quiz_id = target_quiz_id) then
    raise exception 'This quiz has student attempts and is protected. Move it to draft instead.';
  end if;
  delete from public.quiz_questions where quiz_id = target_quiz_id;
  delete from public.quizzes where id = target_quiz_id;
end;
$$;
revoke all on function public.delete_quiz_without_attempts(uuid) from public, anon;
grant execute on function public.delete_quiz_without_attempts(uuid) to authenticated;

create or replace function public.create_assessment_bundle(brief jsonb, rubric jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created public.assessment_briefs%rowtype;
  target_module_id uuid := (brief->>'module_id')::uuid;
  target_id uuid := coalesce((brief->>'id')::uuid, extensions.gen_random_uuid());
  rubric_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.'; end if;
  if coalesce(jsonb_array_length(rubric), 0) = 0 then raise exception 'Add at least one rubric criterion.'; end if;
  if not (select private.can_manage_module(target_module_id)) then raise exception 'You are not assigned to this module.'; end if;

  insert into public.assessment_briefs (
    id, module_id, lecturer_id, level, title, subject, instructions, due_at,
    allow_late, published, assessment_type, venue, duration_minutes,
    weight_percent, attachment_storage_path, attachment_file_name,
    attachment_mime_type, attachment_file_size_bytes
  ) values (
    target_id, target_module_id, (select auth.uid()), nullif(brief->>'level',''),
    trim(brief->>'title'), trim(brief->>'subject'), nullif(trim(brief->>'instructions'),''),
    (brief->>'due_at')::timestamptz, coalesce((brief->>'allow_late')::boolean,false),
    coalesce((brief->>'published')::boolean,false), coalesce(nullif(brief->>'assessment_type',''),'Assignment'),
    nullif(trim(brief->>'venue'),''), nullif(brief->>'duration_minutes','')::integer,
    nullif(brief->>'weight_percent','')::numeric, nullif(brief->>'attachment_storage_path',''),
    nullif(brief->>'attachment_file_name',''), nullif(brief->>'attachment_mime_type',''),
    nullif(brief->>'attachment_file_size_bytes','')::bigint
  ) returning * into created;

  insert into public.assessment_rubrics (brief_id, criterion, description, max_points, position)
  select target_id, trim(x.criterion), nullif(trim(x.description),''), x.max_points, x.position
  from jsonb_to_recordset(rubric) as x(criterion text, description text, max_points numeric, position integer);

  select coalesce(jsonb_agg(to_jsonb(r) order by r.position), '[]'::jsonb)
  into rubric_result from public.assessment_rubrics r where r.brief_id = target_id;
  return jsonb_build_object('brief', to_jsonb(created), 'rubrics', rubric_result);
end;
$$;
revoke all on function public.create_assessment_bundle(jsonb,jsonb) from public, anon;
grant execute on function public.create_assessment_bundle(jsonb,jsonb) to authenticated;

alter table public.attendance_records
  add column if not exists source text not null default 'roster',
  add column if not exists attendance_seconds integer,
  add column if not exists required_seconds integer,
  add column if not exists last_synced_at timestamptz;

do $$ begin
  alter table public.attendance_records add constraint attendance_records_source_check
    check (source in ('roster','manual','online_tracking'));
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.attendance_records add constraint attendance_records_seconds_check
    check (attendance_seconds is null or attendance_seconds >= 0);
exception when duplicate_object then null;
end $$;

create or replace function private.seed_attendance_roster()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.attendance_records(session_id, student_id, marked_by, source)
  select new.id, r.student_id, new.lecturer_id, 'roster'
  from public.student_module_registrations r
  where r.module_id = new.module_id
    and coalesce(r.status,'active') not in ('cancelled','declined','inactive')
  on conflict (session_id,student_id) do nothing;
  return new;
end;
$$;

create or replace function private.sync_online_attendance_row()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.attendance_records (
    session_id, student_id, status, check_in_at, source,
    attendance_seconds, required_seconds, last_synced_at, updated_at
  )
  select s.id, new.user_id,
    case when new.completed_at is not null or new.seconds_attended >= new.required_seconds
      then case when s.starts_at is not null and new.joined_at > s.starts_at + interval '15 minutes' then 'late' else 'present' end
      else 'absent' end,
    new.joined_at, 'online_tracking', new.seconds_attended, new.required_seconds, now(), now()
  from public.attendance_sessions s
  where s.online_class_id = new.class_id and s.session_type = 'online' and s.status <> 'cancelled'
  on conflict (session_id,student_id) do update set
    attendance_seconds = excluded.attendance_seconds,
    required_seconds = excluded.required_seconds,
    last_synced_at = excluded.last_synced_at,
    updated_at = now(),
    check_in_at = case when public.attendance_records.source = 'manual' then public.attendance_records.check_in_at else excluded.check_in_at end,
    status = case when public.attendance_records.source = 'manual' then public.attendance_records.status else excluded.status end,
    source = case when public.attendance_records.source = 'manual' then 'manual' else 'online_tracking' end;
  return new;
end;
$$;
drop trigger if exists sync_online_attendance_to_register on public.online_class_attendance;
create trigger sync_online_attendance_to_register
after insert or update of seconds_attended, required_seconds, completed_at, last_seen_at
on public.online_class_attendance for each row execute function private.sync_online_attendance_row();

create or replace function public.sync_online_attendance_session(target_session_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if not exists (
    select 1 from public.attendance_sessions s
    where s.id = target_session_id
      and (s.lecturer_id = (select auth.uid()) or (select private.is_app_admin()))
  ) then raise exception 'Register not found or access denied.'; end if;

  insert into public.attendance_records (
    session_id, student_id, status, check_in_at, source,
    attendance_seconds, required_seconds, last_synced_at, updated_at
  )
  select s.id, a.user_id,
    case when a.completed_at is not null or a.seconds_attended >= a.required_seconds
      then case when s.starts_at is not null and a.joined_at > s.starts_at + interval '15 minutes' then 'late' else 'present' end
      else 'absent' end,
    a.joined_at, 'online_tracking', a.seconds_attended, a.required_seconds, now(), now()
  from public.attendance_sessions s join public.online_class_attendance a on a.class_id = s.online_class_id
  where s.id = target_session_id
  on conflict (session_id,student_id) do update set
    attendance_seconds = excluded.attendance_seconds,
    required_seconds = excluded.required_seconds,
    last_synced_at = excluded.last_synced_at,
    updated_at = now(),
    check_in_at = case when public.attendance_records.source = 'manual' then public.attendance_records.check_in_at else excluded.check_in_at end,
    status = case when public.attendance_records.source = 'manual' then public.attendance_records.status else excluded.status end,
    source = case when public.attendance_records.source = 'manual' then 'manual' else 'online_tracking' end;
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.sync_online_attendance_session(uuid) from public, anon;
grant execute on function public.sync_online_attendance_session(uuid) to authenticated;

-- Backfill online telemetry into registers that already exist.
insert into public.attendance_records (
  session_id, student_id, status, check_in_at, source,
  attendance_seconds, required_seconds, last_synced_at, updated_at
)
select s.id, a.user_id,
  case when a.completed_at is not null or a.seconds_attended >= a.required_seconds
    then case when s.starts_at is not null and a.joined_at > s.starts_at + interval '15 minutes' then 'late' else 'present' end
    else 'absent' end,
  a.joined_at, 'online_tracking', a.seconds_attended, a.required_seconds, now(), now()
from public.attendance_sessions s join public.online_class_attendance a on a.class_id = s.online_class_id
where s.session_type = 'online' and s.status <> 'cancelled'
on conflict (session_id,student_id) do update set
  attendance_seconds = excluded.attendance_seconds,
  required_seconds = excluded.required_seconds,
  last_synced_at = excluded.last_synced_at,
  updated_at = now(),
  check_in_at = case when public.attendance_records.source = 'manual' then public.attendance_records.check_in_at else excluded.check_in_at end,
  status = case when public.attendance_records.source = 'manual' then public.attendance_records.status else excluded.status end,
  source = case when public.attendance_records.source = 'manual' then 'manual' else 'online_tracking' end;

alter table public.icass_marks
  add column if not exists component_key text generated always as (lower(trim(component_name))) stored;
do $$ begin
  alter table public.icass_marks add constraint icass_marks_student_component_period_key
    unique (student_id,module_id,component_key,academic_year,semester);
exception when duplicate_object then null;
end $$;

create or replace function private.guard_icass_total_weight()
returns trigger language plpgsql set search_path = '' as $$
declare existing_weight numeric;
begin
  select coalesce(sum(component_weight),0) into existing_weight
  from public.icass_marks m
  where m.student_id = new.student_id and m.module_id = new.module_id
    and m.academic_year = new.academic_year and m.semester = new.semester
    and m.id <> new.id;
  if existing_weight + coalesce(new.component_weight,0) > 100 then
    raise exception 'The total ICASS weight for this student and period cannot exceed 100%%.';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_icass_total_weight on public.icass_marks;
create trigger guard_icass_total_weight before insert or update on public.icass_marks
for each row execute function private.guard_icass_total_weight();

create or replace function private.notify_online_class()
returns trigger language plpgsql security definer set search_path = '' as $$
declare registration record; notification_title text; notification_body text; notification_key text;
begin
  if new.module_id is null then return new; end if;
  if tg_op = 'INSERT' then
    notification_title := 'Online class scheduled';
    notification_body := 'A new online class was scheduled for your module.';
    notification_key := 'scheduled';
  elsif old.status is distinct from new.status and new.status = 'live' then
    notification_title := 'Online class is live';
    notification_body := 'Your lecturer has started the online class. Join now.';
    notification_key := 'live';
  elsif old.recording_url is distinct from new.recording_url and new.recording_url is not null then
    notification_title := 'Class recording available';
    notification_body := 'A recording has been published for your online class.';
    notification_key := 'recording';
  elsif old.resource_storage_path is distinct from new.resource_storage_path and new.resource_storage_path is not null then
    notification_title := 'New class resource';
    notification_body := 'Your lecturer uploaded a resource for an online class.';
    notification_key := 'resource';
  else return new;
  end if;
  for registration in select student_id from public.student_module_registrations
    where module_id = new.module_id and status = 'active'
  loop
    perform private.enqueue_student_notification(registration.student_id, 'academics',
      notification_title, notification_body, 'online_classes', null, new.lecturer_id,
      jsonb_build_object('module_id',new.module_id,'class_id',new.id,'scheduled_at',new.scheduled_at),
      'online-class:' || new.id::text || ':' || notification_key || ':' || registration.student_id::text);
  end loop;
  return new;
end;
$$;
drop trigger if exists notify_online_class on public.online_classes;
create trigger notify_online_class after insert or update on public.online_classes
for each row execute function private.notify_online_class();

create or replace function private.notify_academic_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare registration record; destination text; heading text;
begin
  if new.module_id is null then return new; end if;
  destination := case when tg_table_name = 'lecture_slides' then 'slides' else 'timetable' end;
  heading := case when tg_table_name = 'lecture_slides' then 'New lecture slides' else 'New timetable' end;
  for registration in select student_id from public.student_module_registrations
    where module_id = new.module_id and status = 'active'
  loop
    perform private.enqueue_student_notification(registration.student_id, 'academics', heading,
      coalesce(new.title,'New academic document') || ' is now available.', destination, null, new.created_by,
      jsonb_build_object('module_id',new.module_id,'document_id',new.id),
      destination || ':' || new.id::text || ':' || registration.student_id::text);
  end loop;
  return new;
end;
$$;
drop trigger if exists notify_lecture_slide on public.lecture_slides;
create trigger notify_lecture_slide after insert on public.lecture_slides
for each row execute function private.notify_academic_document();
drop trigger if exists notify_timetable on public.timetables;
create trigger notify_timetable after insert on public.timetables
for each row execute function private.notify_academic_document();
