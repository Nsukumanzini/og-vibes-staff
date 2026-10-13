create or replace function private.current_auth_email()
returns text language sql stable security invoker set search_path = '' as $$
  select lower(coalesce(auth.jwt()->>'email', ''));
$$;
revoke all on function private.current_auth_email() from public, anon;
grant execute on function private.current_auth_email() to authenticated;

drop policy if exists "Authorized users view module invitations" on public.module_invitations;
create policy "Authorized users view module invitations"
on public.module_invitations for select to authenticated
using (
  lecturer_id = (select auth.uid())
  or student_id = (select auth.uid())
  or (
    student_id is null
    and invited_email is not null
    and invited_email = (select private.current_auth_email())
  )
  or (select private.is_app_admin())
);
