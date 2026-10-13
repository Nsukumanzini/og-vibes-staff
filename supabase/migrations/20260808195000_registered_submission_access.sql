drop policy if exists "Students can insert their own submissions" on public.assignment_submissions;
drop policy if exists "Users can insert their own submissions" on public.assignment_submissions;
create policy "Students create registered submissions"
on public.assignment_submissions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.can_access_module(module_id))
  and (
    brief_id is null
    or exists (
      select 1 from public.assessment_briefs brief
      where brief.id = assignment_submissions.brief_id
        and brief.module_id is not distinct from assignment_submissions.module_id
        and brief.published
    )
  )
);

drop policy if exists "Users can update their own submissions" on public.assignment_submissions;
create policy "Students update registered submissions"
on public.assignment_submissions for update to authenticated
using (
  user_id = (select auth.uid())
  and (select private.can_access_module(module_id))
)
with check (
  user_id = (select auth.uid())
  and (select private.can_access_module(module_id))
  and (
    brief_id is null
    or exists (
      select 1 from public.assessment_briefs brief
      where brief.id = assignment_submissions.brief_id
        and brief.module_id is not distinct from assignment_submissions.module_id
        and brief.published
    )
  )
);

drop policy if exists "Students can view their own submissions" on public.assignment_submissions;
drop policy if exists "Users can view their own submissions" on public.assignment_submissions;
create policy "Students view own submissions"
on public.assignment_submissions for select to authenticated
using (user_id = (select auth.uid()));

create or replace function private.guard_student_submission_grading_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id = (select auth.uid())
    and not (select private.is_app_staff())
    and (
      new.grade is distinct from old.grade
      or new.feedback is distinct from old.feedback
    )
  then
    raise exception 'Students cannot change grades or lecturer feedback.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_student_submission_grading_fields() from public, anon, authenticated;

drop trigger if exists assignment_submissions_guard_student_grading on public.assignment_submissions;
create trigger assignment_submissions_guard_student_grading
before update of grade, feedback on public.assignment_submissions
for each row execute function private.guard_student_submission_grading_fields();
