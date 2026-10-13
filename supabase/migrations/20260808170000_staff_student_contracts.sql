-- Shared OG Vibes staff/student contracts.
-- The Supabase CLI is not installed in this checkout, so this migration was
-- created manually and applied through the connected Supabase project.

create schema if not exists private;

create or replace function private.is_app_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('admin', 'lecturer')
  );
$$;
revoke execute on function private.is_app_staff() from public, anon, authenticated;

alter table public.app_content
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.lecturer_applications
  add column if not exists staff_id text,
  add column if not exists department text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lecturer_applications_user_id_key'
      and conrelid = 'public.lecturer_applications'::regclass
  ) then
    alter table public.lecturer_applications
      add constraint lecturer_applications_user_id_key unique (user_id);
  end if;
end $$;

create or replace function private.guard_profile_role_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and not (select private.is_app_admin()) then
    raise exception 'Only an administrator can change account roles.';
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_profile_role_change() from public, anon, authenticated;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
before update of role on public.profiles
for each row execute function private.guard_profile_role_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  is_lecturer_application boolean :=
    coalesce(new.raw_user_meta_data->>'account_type', '') = 'lecturer';
begin
  insert into public.profiles (
    id, email, name, surname, campus, department, level, student_type, gender, role
  ) values (
    new.id, coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'surname', ''),
    coalesce(new.raw_user_meta_data->>'campus', ''),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'level', ''),
    case when is_lecturer_application then 'staff' else coalesce(new.raw_user_meta_data->>'studentType', '') end,
    coalesce(new.raw_user_meta_data->>'gender', ''),
    case when is_lecturer_application then 'pending_lecturer' else 'student' end
  ) on conflict (id) do nothing;

  if is_lecturer_application then
    insert into public.lecturer_applications (user_id, status, staff_id, department)
    values (
      new.id, 'pending',
      nullif(trim(coalesce(new.raw_user_meta_data->>'staff_id', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'department', '')), '')
    ) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop policy if exists "Lecturers create own announcements" on public.app_content;
create policy "Lecturers create own announcements" on public.app_content
for insert to authenticated with check (
  section = 'announcements' and created_by = (select auth.uid())
  and (select private.is_app_staff())
);
drop policy if exists "Lecturers update own announcements" on public.app_content;
create policy "Lecturers update own announcements" on public.app_content
for update to authenticated
using (section = 'announcements' and created_by = (select auth.uid()) and (select private.is_app_staff()))
with check (section = 'announcements' and created_by = (select auth.uid()) and (select private.is_app_staff()));
drop policy if exists "Lecturers delete own announcements" on public.app_content;
create policy "Lecturers delete own announcements" on public.app_content
for delete to authenticated
using (section = 'announcements' and created_by = (select auth.uid()) and (select private.is_app_staff()));

drop policy if exists "Lecturers view registrations for their modules" on public.student_module_registrations;
create policy "Lecturers view registrations for their modules"
on public.student_module_registrations for select to authenticated using (
  exists (
    select 1 from public.module_lecturers ml
    where ml.module_id = student_module_registrations.module_id
      and ml.lecturer_id = (select auth.uid())
  ) or (select private.is_app_admin())
);

drop policy if exists "Lecturers view marks for their modules" on public.icass_marks;
create policy "Lecturers view marks for their modules" on public.icass_marks
for select to authenticated using (
  exists (select 1 from public.module_lecturers ml
    where ml.module_id = icass_marks.module_id and ml.lecturer_id = (select auth.uid()))
  or (select private.is_app_admin())
);
drop policy if exists "Lecturers create marks for their modules" on public.icass_marks;
create policy "Lecturers create marks for their modules" on public.icass_marks
for insert to authenticated with check (
  exists (select 1 from public.module_lecturers ml
    where ml.module_id = icass_marks.module_id and ml.lecturer_id = (select auth.uid()))
  or (select private.is_app_admin())
);
drop policy if exists "Lecturers update marks for their modules" on public.icass_marks;
create policy "Lecturers update marks for their modules" on public.icass_marks
for update to authenticated
using (exists (select 1 from public.module_lecturers ml
    where ml.module_id = icass_marks.module_id and ml.lecturer_id = (select auth.uid()))
  or (select private.is_app_admin()))
with check (exists (select 1 from public.module_lecturers ml
    where ml.module_id = icass_marks.module_id and ml.lecturer_id = (select auth.uid()))
  or (select private.is_app_admin()));
drop policy if exists "Lecturers delete marks for their modules" on public.icass_marks;
create policy "Lecturers delete marks for their modules" on public.icass_marks
for delete to authenticated using (
  exists (select 1 from public.module_lecturers ml
    where ml.module_id = icass_marks.module_id and ml.lecturer_id = (select auth.uid()))
  or (select private.is_app_admin())
);

alter table public.online_classes
  add column if not exists lecturer_id uuid references public.profiles(id) on delete set null,
  add column if not exists module_id uuid references public.modules(id) on delete set null;
alter table public.lecture_slides
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.timetables
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

drop policy if exists "Academic publishers insert online_classes" on public.online_classes;
drop policy if exists "Academic publishers update online_classes" on public.online_classes;
drop policy if exists "Academic publishers delete online_classes" on public.online_classes;
create policy "Lecturers create own online classes" on public.online_classes
for insert to authenticated with check (
  (lecturer_id = (select auth.uid()) and (
    module_id is null or exists (select 1 from public.module_lecturers ml
      where ml.module_id = online_classes.module_id and ml.lecturer_id = (select auth.uid()))
  )) or (select private.is_app_admin())
);
create policy "Lecturers update own online classes" on public.online_classes
for update to authenticated
using (lecturer_id = (select auth.uid()) or (select private.is_app_admin()))
with check (lecturer_id = (select auth.uid()) or (select private.is_app_admin()));
create policy "Lecturers delete own online classes" on public.online_classes
for delete to authenticated using (lecturer_id = (select auth.uid()) or (select private.is_app_admin()));

drop policy if exists "Academic publishers insert lecture_slides" on public.lecture_slides;
drop policy if exists "Academic publishers update lecture_slides" on public.lecture_slides;
drop policy if exists "Academic publishers delete lecture_slides" on public.lecture_slides;
create policy "Lecturers create own lecture slides" on public.lecture_slides
for insert to authenticated with check (
  (created_by = (select auth.uid()) and exists (select 1 from public.module_lecturers ml
    where ml.module_id = lecture_slides.module_id and ml.lecturer_id = (select auth.uid())))
  or (select private.is_app_admin())
);
create policy "Lecturers update own lecture slides" on public.lecture_slides
for update to authenticated
using (created_by = (select auth.uid()) or (select private.is_app_admin()))
with check (created_by = (select auth.uid()) or (select private.is_app_admin()));
create policy "Lecturers delete own lecture slides" on public.lecture_slides
for delete to authenticated using (created_by = (select auth.uid()) or (select private.is_app_admin()));

drop policy if exists "Academic publishers insert timetables" on public.timetables;
drop policy if exists "Academic publishers update timetables" on public.timetables;
drop policy if exists "Academic publishers delete timetables" on public.timetables;
create policy "Lecturers create own timetables" on public.timetables
for insert to authenticated with check (
  (created_by = (select auth.uid()) and (
    module_id is null or exists (select 1 from public.module_lecturers ml
      where ml.module_id = timetables.module_id and ml.lecturer_id = (select auth.uid()))
  )) or (select private.is_app_admin())
);
create policy "Lecturers update own timetables" on public.timetables
for update to authenticated
using (created_by = (select auth.uid()) or (select private.is_app_admin()))
with check (created_by = (select auth.uid()) or (select private.is_app_admin()));
create policy "Lecturers delete own timetables" on public.timetables
for delete to authenticated using (created_by = (select auth.uid()) or (select private.is_app_admin()));

create or replace function private.can_direct_message(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and target_user_id is not null
    and target_user_id <> (select auth.uid())
    and not exists (
      select 1 from public.blocked_users block
      where (block.user_id = (select auth.uid()) and block.blocked_user_id = target_user_id)
         or (block.user_id = target_user_id and block.blocked_user_id = (select auth.uid()))
    )
    and (
      exists (select 1 from public.friendships friendship
        where (friendship.user_id = (select auth.uid()) and friendship.friend_id = target_user_id)
           or (friendship.user_id = target_user_id and friendship.friend_id = (select auth.uid())))
      or exists (select 1 from public.conversations conversation
        where (conversation.user_a_id = (select auth.uid()) and conversation.user_b_id = target_user_id)
           or (conversation.user_a_id = target_user_id and conversation.user_b_id = (select auth.uid())))
      or exists (select 1 from public.profiles actor join public.profiles target on target.id = target_user_id
        where actor.id = (select auth.uid()) and actor.role = 'admin' and target.role <> 'admin')
      or exists (select 1 from public.module_lecturers ml
        join public.student_module_registrations smr on smr.module_id = ml.module_id
        where ml.lecturer_id = (select auth.uid()) and smr.student_id = target_user_id
          and smr.status <> 'cancelled')
      or exists (select 1 from public.student_module_registrations smr
        join public.module_lecturers ml on ml.module_id = smr.module_id
        where smr.student_id = (select auth.uid()) and ml.lecturer_id = target_user_id
          and smr.status <> 'cancelled')
    );
$$;
revoke execute on function private.can_direct_message(uuid) from public, anon, authenticated;

drop policy if exists "Academic publishers upload content" on storage.objects;
drop policy if exists "Academic publishers update content" on storage.objects;
drop policy if exists "Academic publishers delete content" on storage.objects;
create policy "Staff upload own academic content" on storage.objects
for insert to authenticated with check (
  bucket_id = 'academic-content' and (select private.is_app_staff())
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
create policy "Staff update own academic content" on storage.objects
for update to authenticated
using (bucket_id = 'academic-content' and (
  (storage.foldername(name))[2] = (select auth.uid())::text or (select private.is_app_admin())
))
with check (bucket_id = 'academic-content' and (
  (storage.foldername(name))[2] = (select auth.uid())::text or (select private.is_app_admin())
));
create policy "Staff delete own academic content" on storage.objects
for delete to authenticated using (bucket_id = 'academic-content' and (
  (storage.foldername(name))[2] = (select auth.uid())::text or (select private.is_app_admin())
));

create index if not exists app_content_created_by_idx on public.app_content(created_by);
create index if not exists icass_marks_module_id_idx on public.icass_marks(module_id);
create index if not exists icass_marks_student_id_idx on public.icass_marks(student_id);
create index if not exists online_classes_lecturer_id_idx on public.online_classes(lecturer_id);
create index if not exists online_classes_module_id_idx on public.online_classes(module_id);
create index if not exists lecture_slides_created_by_idx on public.lecture_slides(created_by);
create index if not exists timetables_created_by_idx on public.timetables(created_by);

create or replace function public.get_lecturer_dashboard_stats()
returns json language sql stable set search_path = '' as $$
  select json_build_object(
    'total_students', (select count(distinct smr.student_id)
      from public.student_module_registrations smr
      join public.module_lecturers ml on ml.module_id = smr.module_id
      where ml.lecturer_id = (select auth.uid()) and smr.status <> 'cancelled'),
    'pending_grades', (select count(*) from public.assignment_submissions submission
      join public.module_lecturers ml on ml.module_id = submission.module_id
      where ml.lecturer_id = (select auth.uid()) and submission.submitted_at is not null
        and submission.grade is null and submission.status <> 'withdrawn'),
    'upcoming_assessments', (
      (select count(*) from public.quizzes quiz where quiz.lecturer_id = (select auth.uid())
        and coalesce(quiz.available_from, quiz.quiz_date) >= now())
      + (select count(*) from public.assessment_briefs brief
        where brief.lecturer_id = (select auth.uid()) and brief.due_at >= now())
    )
  );
$$;

grant select, insert, update, delete on public.app_content to authenticated;
grant select, insert, update, delete on public.icass_marks to authenticated;
grant select on public.student_module_registrations to authenticated;
grant select, insert, update, delete on public.online_classes to authenticated;
grant select, insert, update, delete on public.lecture_slides to authenticated;
grant select, insert, update, delete on public.timetables to authenticated;
