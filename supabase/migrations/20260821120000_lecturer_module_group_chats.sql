-- Lecturer-owned module groups are private cohorts backed by active module
-- registrations. Existing community groups keep their current behaviour.

alter table public.group_chats
  add column if not exists module_id uuid references public.modules(id) on delete cascade,
  add column if not exists group_kind text not null default 'community';

alter table public.group_chats
  drop constraint if exists group_chats_group_kind_check;
alter table public.group_chats
  add constraint group_chats_group_kind_check
  check (group_kind in ('community', 'module'));

create index if not exists group_chats_module_updated_idx
  on public.group_chats (module_id, updated_at desc)
  where group_kind = 'module';

create or replace function private.validate_module_group()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.group_kind is distinct from old.group_kind
    or new.module_id is distinct from old.module_id
  ) then
    raise exception 'A group type and module cannot be changed after creation';
  end if;

  if new.group_kind = 'module' then
    if new.module_id is null then
      raise exception 'A module group requires a module';
    end if;
    if not exists (
      select 1
      from public.module_lecturers ml
      where ml.module_id = new.module_id
        and ml.lecturer_id = (select auth.uid())
    ) and not (select private.is_app_admin()) then
      raise exception 'You can only create groups for modules you teach';
    end if;
    new.visibility := 'private';
    new.category := 'class';
  elsif new.module_id is not null then
    raise exception 'Community groups cannot be linked to a module';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_module_group on public.group_chats;
create trigger validate_module_group
before insert or update on public.group_chats
for each row execute function private.validate_module_group();

create or replace function private.sync_new_module_group_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.group_kind <> 'module' or new.module_id is null then
    return new;
  end if;

  insert into public.group_members (group_id, user_id, role)
  select new.id, registration.student_id, 'student'
  from public.student_module_registrations registration
  where registration.module_id = new.module_id
    and registration.status = 'active'
  on conflict (group_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists sync_new_module_group_members on public.group_chats;
create trigger sync_new_module_group_members
after insert on public.group_chats
for each row execute function private.sync_new_module_group_members();

create or replace function private.sync_registration_module_groups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    insert into public.group_members (group_id, user_id, role)
    select chat.id, new.student_id, 'student'
    from public.group_chats chat
    where chat.group_kind = 'module'
      and chat.module_id = new.module_id
    on conflict (group_id, user_id) do nothing;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'active'
     and (new.status <> 'active'
       or new.module_id is distinct from old.module_id
       or new.student_id is distinct from old.student_id) then
    delete from public.group_members member
    using public.group_chats chat
    where member.group_id = chat.id
      and member.user_id = old.student_id
      and member.role = 'student'
      and chat.group_kind = 'module'
      and chat.module_id = old.module_id
      and not exists (
        select 1
        from public.student_module_registrations registration
        where registration.student_id = old.student_id
          and registration.module_id = old.module_id
          and registration.status = 'active'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_registration_module_groups
  on public.student_module_registrations;
create trigger sync_registration_module_groups
after insert or update of status, module_id, student_id
on public.student_module_registrations
for each row execute function private.sync_registration_module_groups();

grant select, insert, update, delete on public.group_chats to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_chats'
  ) then
    alter publication supabase_realtime add table public.group_chats;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table public.group_members;
  end if;
end
$$;
