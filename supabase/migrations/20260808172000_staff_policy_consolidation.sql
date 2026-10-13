alter table public.lecturer_applications
  drop constraint if exists lecturer_applications_user_id_key;

drop policy if exists "Public content is readable" on public.app_content;
drop policy if exists "Staff view own announcements" on public.app_content;
drop policy if exists "Admins insert app_content" on public.app_content;
drop policy if exists "Lecturers create own announcements" on public.app_content;
drop policy if exists "Admins update app_content" on public.app_content;
drop policy if exists "Lecturers update own announcements" on public.app_content;
drop policy if exists "Admins delete app_content" on public.app_content;
drop policy if exists "Lecturers delete own announcements" on public.app_content;

create policy "Public active content is readable"
on public.app_content for select to anon
using (is_active);

create policy "Authenticated users read available content"
on public.app_content for select to authenticated
using (
  is_active
  or created_by = (select auth.uid())
  or (select private.is_app_admin())
);

create policy "Staff create authorized content"
on public.app_content for insert to authenticated
with check (
  (select private.is_app_admin())
  or (
    section = 'announcements'
    and created_by = (select auth.uid())
    and (select private.is_app_staff())
  )
);

create policy "Staff update authorized content"
on public.app_content for update to authenticated
using (
  (select private.is_app_admin())
  or (
    section = 'announcements'
    and created_by = (select auth.uid())
    and (select private.is_app_staff())
  )
)
with check (
  (select private.is_app_admin())
  or (
    section = 'announcements'
    and created_by = (select auth.uid())
    and (select private.is_app_staff())
  )
);

create policy "Staff delete authorized content"
on public.app_content for delete to authenticated
using (
  (select private.is_app_admin())
  or (
    section = 'announcements'
    and created_by = (select auth.uid())
    and (select private.is_app_staff())
  )
);

drop policy if exists "Students view published own marks" on public.icass_marks;
drop policy if exists "Lecturers view marks for their modules" on public.icass_marks;
create policy "Authorized users view iCAS marks"
on public.icass_marks for select to authenticated
using (
  (student_id = (select auth.uid()) and published)
  or exists (
    select 1 from public.module_lecturers ml
    where ml.module_id = icass_marks.module_id
      and ml.lecturer_id = (select auth.uid())
  )
  or (select private.is_app_admin())
);

drop policy if exists "Students view own registrations" on public.student_module_registrations;
drop policy if exists "Lecturers view registrations for their modules" on public.student_module_registrations;
create policy "Authorized users view module registrations"
on public.student_module_registrations for select to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1 from public.module_lecturers ml
    where ml.module_id = student_module_registrations.module_id
      and ml.lecturer_id = (select auth.uid())
  )
  or (select private.is_app_admin())
);

drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
drop policy if exists "Lecturers view attempts for own quizzes" on public.quiz_attempts;
create policy "Authorized users view quiz attempts"
on public.quiz_attempts for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.quizzes quiz
    where quiz.id = quiz_attempts.quiz_id
      and quiz.lecturer_id = (select auth.uid())
  )
  or (select private.is_app_admin())
);

drop policy if exists "Admins can view all applications" on public.lecturer_applications;
drop policy if exists "Users can view their own application" on public.lecturer_applications;
create policy "Authorized users view lecturer applications"
on public.lecturer_applications for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_app_admin())
);
