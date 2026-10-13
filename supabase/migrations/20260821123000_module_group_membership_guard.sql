-- Enforce the module cohort rule even if a membership is created through an
-- invite RPC or another trusted database function.

create or replace function private.validate_module_group_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_kind text;
  v_module_id uuid;
  v_creator_id uuid;
begin
  select chat.group_kind, chat.module_id, chat.created_by
  into v_group_kind, v_module_id, v_creator_id
  from public.group_chats chat
  where chat.id = new.group_id;

  if not found then
    raise exception 'Group not found';
  end if;

  if v_group_kind = 'module'
     and new.user_id <> v_creator_id
     and not exists (
       select 1
       from public.student_module_registrations registration
       where registration.student_id = new.user_id
         and registration.module_id = v_module_id
         and registration.status = 'active'
     ) then
    raise exception 'Only active registered students can join this module group';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_module_group_membership
  on public.group_members;
create trigger validate_module_group_membership
before insert on public.group_members
for each row execute function private.validate_module_group_membership();
