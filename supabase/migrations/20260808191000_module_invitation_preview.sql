create or replace function public.preview_module_invitation(invitation_token text)
returns table (
  invitation_id uuid,
  module_id uuid,
  module_name text,
  module_code text,
  module_level text,
  lecturer_name text,
  academic_year integer,
  semester integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid()); actor_email text;
begin
  if actor_id is null then raise exception 'Authentication required.'; end if;
  select lower(email) into actor_email from auth.users where id = actor_id;
  return query
  select invitation.id, invitation.module_id, module.name, module.code,
    module.level,
    coalesce(nullif(trim(profile.nickname), ''), trim(profile.name || ' ' || profile.surname)),
    invitation.academic_year, invitation.semester, invitation.expires_at
  from public.module_invitations invitation
  join public.modules module on module.id = invitation.module_id
  join public.profiles profile on profile.id = invitation.lecturer_id
  where invitation.token_hash = encode(extensions.digest(invitation_token, 'sha256'), 'hex')
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and (invitation.student_id is null or invitation.student_id = actor_id)
    and (invitation.invited_email is null or invitation.invited_email = actor_email)
  limit 1;
end;
$$;
revoke all on function public.preview_module_invitation(text) from public, anon;
grant execute on function public.preview_module_invitation(text) to authenticated;
