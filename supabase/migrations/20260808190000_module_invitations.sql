-- Secure lecturer invitations and registration-backed academic visibility.
-- Shared by the OG Vibes staff panel and student application.

create table if not exists public.module_invitations (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  academic_year integer not null default extract(year from current_date)::integer,
  semester integer not null default case when extract(month from current_date) <= 6 then 1 else 2 end,
  token_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  responded_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint module_invitations_semester_check check (semester between 1 and 3),
  constraint module_invitations_status_check check (status in ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  constraint module_invitations_email_normalized check (
    invited_email is null or invited_email = lower(trim(invited_email))
  )
);

alter table public.module_invitations enable row level security;

create index if not exists module_invitations_lecturer_created_idx
  on public.module_invitations (lecturer_id, created_at desc);
create index if not exists module_invitations_student_status_idx
  on public.module_invitations (student_id, status, created_at desc)
  where student_id is not null;
create index if not exists module_invitations_email_status_idx
  on public.module_invitations (lower(invited_email), status, created_at desc)
  where invited_email is not null;
create index if not exists module_invitations_module_period_idx
  on public.module_invitations (module_id, academic_year, semester, status);
create index if not exists student_module_registrations_active_module_idx
  on public.student_module_registrations (module_id, student_id)
  where status = 'active';

create or replace function private.can_manage_module(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.module_lecturers ml
      where ml.module_id = target_module_id
        and ml.lecturer_id = (select auth.uid())
    )
    or (select private.is_app_admin())
  );
$$;
revoke all on function private.can_manage_module(uuid) from public, anon;
grant execute on function private.can_manage_module(uuid) to authenticated;

create or replace function private.can_access_module(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_module_id is null
    or (select private.can_manage_module(target_module_id))
    or exists (
      select 1
      from public.student_module_registrations registration
      where registration.module_id = target_module_id
        and registration.student_id = (select auth.uid())
        and registration.status = 'active'
    );
$$;
revoke all on function private.can_access_module(uuid) from public, anon;
grant execute on function private.can_access_module(uuid) to authenticated;

drop policy if exists "Authorized users view module invitations" on public.module_invitations;
create policy "Authorized users view module invitations"
on public.module_invitations for select to authenticated
using (
  lecturer_id = (select auth.uid())
  or student_id = (select auth.uid())
  or (
    student_id is null
    and invited_email is not null
    and invited_email = lower(coalesce((select auth.jwt()->>'email'), ''))
  )
  or (select private.is_app_admin())
);

grant select on public.module_invitations to authenticated;

create or replace function public.create_module_invitation(
  target_module_id uuid,
  target_student_id uuid default null,
  target_email text default null,
  target_academic_year integer default extract(year from current_date)::integer,
  target_semester integer default case when extract(month from current_date) <= 6 then 1 else 2 end,
  expiry_days integer default 14
)
returns table (
  invitation_id uuid,
  invitation_token text,
  resolved_student_id uuid,
  resolved_email text,
  invitation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_student_id uuid := target_student_id;
  selected_email text := nullif(lower(trim(coalesce(target_email, ''))), '');
  raw_token text;
  created_invitation public.module_invitations%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required.'; end if;
  if not (select private.can_manage_module(target_module_id)) then
    raise exception 'You are not assigned to this module.';
  end if;
  if target_academic_year not between 2020 and 2100 then
    raise exception 'Choose a valid academic year.';
  end if;
  if target_semester not between 1 and 3 then
    raise exception 'Choose a valid semester.';
  end if;
  if expiry_days not between 1 and 90 then
    raise exception 'Invitation expiry must be between 1 and 90 days.';
  end if;

  if selected_student_id is not null then
    select lower(p.email) into selected_email
    from public.profiles p
    where p.id = selected_student_id and p.role = 'student';
    if not found then raise exception 'Student account not found.'; end if;
  elsif selected_email is not null then
    select p.id into selected_student_id
    from public.profiles p
    where lower(p.email) = selected_email and p.role = 'student'
    limit 1;
  end if;

  if selected_student_id is not null and exists (
    select 1 from public.student_module_registrations registration
    where registration.student_id = selected_student_id
      and registration.module_id = target_module_id
      and registration.academic_year = target_academic_year
      and registration.semester = target_semester
      and registration.status = 'active'
  ) then
    raise exception 'This student is already registered for the selected module and period.';
  end if;

  update public.module_invitations invitation
  set status = 'revoked', responded_at = now(), updated_at = now()
  where invitation.module_id = target_module_id
    and invitation.academic_year = target_academic_year
    and invitation.semester = target_semester
    and invitation.status = 'pending'
    and (
      (selected_student_id is not null and invitation.student_id = selected_student_id)
      or (selected_email is not null and invitation.student_id is null and invitation.invited_email = selected_email)
    );

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.module_invitations (
    module_id, lecturer_id, student_id, invited_email, academic_year,
    semester, token_hash, expires_at
  ) values (
    target_module_id, actor_id, selected_student_id, selected_email,
    target_academic_year, target_semester,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    now() + make_interval(days => expiry_days)
  ) returning * into created_invitation;

  return query select created_invitation.id, raw_token,
    created_invitation.student_id, created_invitation.invited_email,
    created_invitation.expires_at;
end;
$$;
revoke all on function public.create_module_invitation(uuid, uuid, text, integer, integer, integer) from public, anon;
grant execute on function public.create_module_invitation(uuid, uuid, text, integer, integer, integer) to authenticated;

create or replace function private.accept_module_invitation_internal(
  target_invitation_id uuid,
  raw_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text;
  invitation public.module_invitations%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required.'; end if;
  select lower(email) into actor_email from auth.users where id = actor_id;
  if not exists (select 1 from public.profiles where id = actor_id and role = 'student') then
    raise exception 'Only student accounts can accept module invitations.';
  end if;

  select * into invitation
  from public.module_invitations candidate
  where (
      target_invitation_id is not null and candidate.id = target_invitation_id
    ) or (
      target_invitation_id is null and raw_token is not null
      and candidate.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
    )
  order by case when candidate.id = target_invitation_id then 0 else 1 end
  limit 1
  for update;

  if not found then raise exception 'Invitation not found or the link is invalid.'; end if;
  if invitation.status <> 'pending' then raise exception 'This invitation is no longer pending.'; end if;
  if invitation.expires_at <= now() then
    update public.module_invitations set status = 'expired', updated_at = now() where id = invitation.id;
    raise exception 'This invitation has expired.';
  end if;
  if invitation.student_id is not null and invitation.student_id <> actor_id then
    raise exception 'This invitation belongs to another student.';
  end if;
  if invitation.invited_email is not null and invitation.invited_email <> actor_email then
    raise exception 'Sign in with the email address that received this invitation.';
  end if;

  insert into public.student_module_registrations (
    student_id, module_id, academic_year, semester, status, registered_at
  ) values (
    actor_id, invitation.module_id, invitation.academic_year,
    invitation.semester, 'active', now()
  )
  on conflict (student_id, module_id, academic_year, semester)
  do update set status = 'active', registered_at = now();

  update public.module_invitations
  set status = 'accepted', student_id = actor_id, accepted_by = actor_id,
      responded_at = now(), updated_at = now()
  where id = invitation.id;

  update public.module_invitations other
  set status = 'revoked', responded_at = now(), updated_at = now()
  where other.id <> invitation.id
    and other.status = 'pending'
    and other.module_id = invitation.module_id
    and other.academic_year = invitation.academic_year
    and other.semester = invitation.semester
    and (other.student_id = actor_id or other.invited_email = actor_email);

  return invitation.module_id;
end;
$$;
revoke all on function private.accept_module_invitation_internal(uuid, text) from public, anon;
grant execute on function private.accept_module_invitation_internal(uuid, text) to authenticated;

create or replace function public.accept_module_invitation(
  invitation_id uuid default null,
  invitation_token text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_module_invitation_internal(invitation_id, invitation_token);
$$;
revoke all on function public.accept_module_invitation(uuid, text) from public, anon;
grant execute on function public.accept_module_invitation(uuid, text) to authenticated;

create or replace function public.decline_module_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_email text;
begin
  if actor_id is null then raise exception 'Authentication required.'; end if;
  select lower(email) into actor_email from auth.users where id = actor_id;
  update public.module_invitations invitation
  set status = 'declined', responded_at = now(), updated_at = now()
  where invitation.id = invitation_id
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and (
      invitation.student_id = actor_id
      or (invitation.student_id is null and invitation.invited_email = actor_email)
    );
  if not found then raise exception 'Pending invitation not found.'; end if;
end;
$$;
revoke all on function public.decline_module_invitation(uuid) from public, anon;
grant execute on function public.decline_module_invitation(uuid) to authenticated;

create or replace function public.revoke_module_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare selected_module_id uuid;
begin
  select module_id into selected_module_id
  from public.module_invitations
  where id = invitation_id and status = 'pending';
  if selected_module_id is null then raise exception 'Pending invitation not found.'; end if;
  if not (select private.can_manage_module(selected_module_id)) then
    raise exception 'You cannot manage this module.';
  end if;
  update public.module_invitations
  set status = 'revoked', responded_at = now(), updated_at = now()
  where id = invitation_id;
end;
$$;
revoke all on function public.revoke_module_invitation(uuid) from public, anon;
grant execute on function public.revoke_module_invitation(uuid) to authenticated;

create or replace function public.remove_student_from_module(
  target_student_id uuid,
  target_module_id uuid,
  target_academic_year integer,
  target_semester integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.can_manage_module(target_module_id)) then
    raise exception 'You cannot manage this module.';
  end if;
  update public.student_module_registrations registration
  set status = 'cancelled'
  where registration.student_id = target_student_id
    and registration.module_id = target_module_id
    and registration.academic_year = target_academic_year
    and registration.semester = target_semester
    and registration.status = 'active';
  if not found then raise exception 'Active registration not found.'; end if;
end;
$$;
revoke all on function public.remove_student_from_module(uuid, uuid, integer, integer) from public, anon;
grant execute on function public.remove_student_from_module(uuid, uuid, integer, integer) to authenticated;

-- Students only see academic resources for active registrations. Staff retain
-- access to modules they teach, while null module_id remains institution-wide.
drop policy if exists "online_classes_authenticated_read" on public.online_classes;
create policy "Authorized users read online classes"
on public.online_classes for select to authenticated
using ((select private.can_access_module(module_id)));

drop policy if exists "Authenticated users can view lecture slides" on public.lecture_slides;
create policy "Authorized users read lecture slides"
on public.lecture_slides for select to authenticated
using ((select private.can_access_module(module_id)));

drop policy if exists "Authenticated users can view timetables" on public.timetables;
create policy "Authorized users read timetables"
on public.timetables for select to authenticated
using ((select private.can_access_module(module_id)));

drop policy if exists "assessment_briefs_authenticated_read" on public.assessment_briefs;
create policy "Authorized users read assessment briefs"
on public.assessment_briefs for select to authenticated
using (
  lecturer_id = (select auth.uid())
  or (select private.is_app_admin())
  or (published and (select private.can_access_module(module_id)))
);

drop policy if exists "Authenticated users can view published quizzes" on public.quizzes;
create policy "Authorized users read quizzes"
on public.quizzes for select to authenticated
using (
  lecturer_id = (select auth.uid())
  or (select private.is_app_admin())
  or (published and (select private.can_access_module(module_id)))
);

drop policy if exists "Users can view questions for accessible quizzes" on public.quiz_questions;
create policy "Authorized users read quiz questions"
on public.quiz_questions for select to authenticated
using (
  exists (
    select 1 from public.quizzes quiz
    where quiz.id = quiz_questions.quiz_id
      and (
        quiz.lecturer_id = (select auth.uid())
        or (select private.is_app_admin())
        or (quiz.published and (select private.can_access_module(quiz.module_id)))
      )
  )
);

drop policy if exists "Students read academic content" on storage.objects;
create policy "Authorized users read academic content"
on storage.objects for select to authenticated
using (
  bucket_id = 'academic-content'
  and (
    (select private.is_app_admin())
    or exists (
      select 1 from public.lecture_slides slide
      where slide.storage_path = name
        and (select private.can_access_module(slide.module_id))
    )
    or exists (
      select 1 from public.timetables timetable
      where timetable.storage_path = name
        and (select private.can_access_module(timetable.module_id))
    )
  )
);

alter table public.module_invitations replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.module_invitations;
exception when duplicate_object then null;
end $$;

