alter function public.create_module_invitation(uuid, uuid, text, integer, integer, integer)
  set schema private;
alter function public.decline_module_invitation(uuid) set schema private;
alter function public.revoke_module_invitation(uuid) set schema private;
alter function public.remove_student_from_module(uuid, uuid, integer, integer) set schema private;
alter function public.preview_module_invitation(text) set schema private;

revoke all on function private.create_module_invitation(uuid, uuid, text, integer, integer, integer) from public, anon;
revoke all on function private.decline_module_invitation(uuid) from public, anon;
revoke all on function private.revoke_module_invitation(uuid) from public, anon;
revoke all on function private.remove_student_from_module(uuid, uuid, integer, integer) from public, anon;
revoke all on function private.preview_module_invitation(text) from public, anon;
grant execute on function private.create_module_invitation(uuid, uuid, text, integer, integer, integer) to authenticated;
grant execute on function private.decline_module_invitation(uuid) to authenticated;
grant execute on function private.revoke_module_invitation(uuid) to authenticated;
grant execute on function private.remove_student_from_module(uuid, uuid, integer, integer) to authenticated;
grant execute on function private.preview_module_invitation(text) to authenticated;

create function public.create_module_invitation(
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
language sql security invoker set search_path = '' as $$
  select * from private.create_module_invitation(
    target_module_id, target_student_id, target_email,
    target_academic_year, target_semester, expiry_days
  );
$$;

create function public.decline_module_invitation(invitation_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.decline_module_invitation(invitation_id);
$$;

create function public.revoke_module_invitation(invitation_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.revoke_module_invitation(invitation_id);
$$;

create function public.remove_student_from_module(
  target_student_id uuid,
  target_module_id uuid,
  target_academic_year integer,
  target_semester integer
)
returns void language sql security invoker set search_path = '' as $$
  select private.remove_student_from_module(
    target_student_id, target_module_id, target_academic_year, target_semester
  );
$$;

create function public.preview_module_invitation(invitation_token text)
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
language sql security invoker set search_path = '' as $$
  select * from private.preview_module_invitation(invitation_token);
$$;

revoke all on function public.create_module_invitation(uuid, uuid, text, integer, integer, integer) from public, anon;
revoke all on function public.decline_module_invitation(uuid) from public, anon;
revoke all on function public.revoke_module_invitation(uuid) from public, anon;
revoke all on function public.remove_student_from_module(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.preview_module_invitation(text) from public, anon;
grant execute on function public.create_module_invitation(uuid, uuid, text, integer, integer, integer) to authenticated;
grant execute on function public.decline_module_invitation(uuid) to authenticated;
grant execute on function public.revoke_module_invitation(uuid) to authenticated;
grant execute on function public.remove_student_from_module(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.preview_module_invitation(text) to authenticated;
