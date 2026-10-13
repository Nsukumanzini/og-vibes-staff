create index if not exists module_invitations_accepted_by_idx
  on public.module_invitations (accepted_by)
  where accepted_by is not null;

drop policy if exists "Authorized users view module invitations" on public.module_invitations;
create policy "Authorized users view module invitations"
on public.module_invitations for select to authenticated
using (
  lecturer_id = (select auth.uid())
  or student_id = (select auth.uid())
  or (
    student_id is null
    and invited_email is not null
    and invited_email = (select lower(coalesce(auth.jwt()->>'email', '')))
  )
  or (select private.is_app_admin())
);
