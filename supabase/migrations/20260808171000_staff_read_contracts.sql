drop policy if exists "Staff view own announcements" on public.app_content;
create policy "Staff view own announcements"
on public.app_content for select to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_app_admin())
);

drop policy if exists "Lecturers view attempts for own quizzes" on public.quiz_attempts;
create policy "Lecturers view attempts for own quizzes"
on public.quiz_attempts for select to authenticated
using (
  exists (
    select 1 from public.quizzes quiz
    where quiz.id = quiz_attempts.quiz_id
      and quiz.lecturer_id = (select auth.uid())
  )
  or (select private.is_app_admin())
);
