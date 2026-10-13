-- Complete lecturer-side academic operations shared with the OG Vibes student app.

alter table public.assignment_submissions
  add column if not exists extension_requested_at timestamptz,
  add column if not exists extension_reviewed_at timestamptz,
  add column if not exists extension_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists extension_new_due_at timestamptz,
  add column if not exists extension_response text,
  add column if not exists score numeric,
  add column if not exists max_score numeric,
  add column if not exists graded_at timestamptz,
  add column if not exists graded_by uuid references public.profiles(id) on delete set null,
  add column if not exists rubric_scores jsonb not null default '{}'::jsonb;

alter table public.online_classes
  add column if not exists resource_storage_path text,
  add column if not exists resource_file_name text,
  add column if not exists resource_mime_type text,
  add column if not exists resource_file_size_bytes bigint;

alter table public.icass_marks add column if not exists max_score numeric not null default 100;

do $$ begin alter table public.assignment_submissions add constraint assignment_submissions_score_check check (score is null or score >= 0); exception when duplicate_object then null; end $$;
do $$ begin alter table public.assignment_submissions add constraint assignment_submissions_max_score_check check (max_score is null or max_score > 0); exception when duplicate_object then null; end $$;
do $$ begin alter table public.assignment_submissions add constraint assignment_submissions_score_within_max_check check (score is null or max_score is null or score <= max_score); exception when duplicate_object then null; end $$;
do $$ begin alter table public.assignment_submissions add constraint assignment_submissions_extension_status_check check (extension_status in ('none','pending','approved','declined')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.icass_marks add constraint icass_marks_max_score_check check (max_score > 0); exception when duplicate_object then null; end $$;
do $$ begin alter table public.icass_marks add constraint icass_marks_score_within_max_check check (component_score is null or component_score <= max_score); exception when duplicate_object then null; end $$;

create table if not exists public.assessment_rubrics (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.assessment_briefs(id) on delete cascade,
  criterion text not null check (length(trim(criterion)) between 2 and 120),
  description text,
  max_points numeric not null check (max_points > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, position)
);
alter table public.assessment_rubrics enable row level security;
create policy "Lecturers manage own assessment rubrics" on public.assessment_rubrics for all to authenticated
  using (exists (select 1 from public.assessment_briefs b where b.id=brief_id and (b.lecturer_id=(select auth.uid()) or (select private.is_app_admin()))))
  with check (exists (select 1 from public.assessment_briefs b where b.id=brief_id and (b.lecturer_id=(select auth.uid()) or (select private.is_app_admin()))));
create policy "Students view published assessment rubrics" on public.assessment_rubrics for select to authenticated
  using (exists (select 1 from public.assessment_briefs b where b.id=brief_id and b.published and private.can_access_module(b.module_id)));

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  lecturer_id uuid not null references public.profiles(id) on delete cascade,
  online_class_id uuid references public.online_classes(id) on delete set null,
  title text not null check (length(trim(title)) between 2 and 160),
  session_type text not null check (session_type in ('physical','online')),
  session_date date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled','open','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists attendance_sessions_module_date_idx on public.attendance_sessions(module_id,session_date desc);
alter table public.attendance_sessions enable row level security;
create policy "Lecturers manage module attendance sessions" on public.attendance_sessions for all to authenticated
  using ((lecturer_id=(select auth.uid()) and exists (select 1 from public.module_lecturers ml where ml.module_id=attendance_sessions.module_id and ml.lecturer_id=(select auth.uid()))) or (select private.is_app_admin()))
  with check ((lecturer_id=(select auth.uid()) and exists (select 1 from public.module_lecturers ml where ml.module_id=attendance_sessions.module_id and ml.lecturer_id=(select auth.uid()))) or (select private.is_app_admin()));
create policy "Students view registered attendance sessions" on public.attendance_sessions for select to authenticated using (private.can_access_module(module_id));

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'absent' check (status in ('present','absent','late','excused')),
  check_in_at timestamptz,
  note text,
  marked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id,student_id)
);
create index if not exists attendance_records_student_idx on public.attendance_records(student_id,created_at desc);
alter table public.attendance_records enable row level security;
create policy "Lecturers manage module attendance records" on public.attendance_records for all to authenticated
  using (exists (select 1 from public.attendance_sessions s join public.module_lecturers ml on ml.module_id=s.module_id where s.id=session_id and (ml.lecturer_id=(select auth.uid()) or (select private.is_app_admin()))))
  with check (exists (select 1 from public.attendance_sessions s join public.module_lecturers ml on ml.module_id=s.module_id where s.id=session_id and (ml.lecturer_id=(select auth.uid()) or (select private.is_app_admin()))));
create policy "Students view own attendance records" on public.attendance_records for select to authenticated using (student_id=(select auth.uid()));

create or replace function private.seed_attendance_roster() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.attendance_records(session_id,student_id,marked_by)
  select new.id,r.student_id,new.lecturer_id from public.student_module_registrations r
  where r.module_id=new.module_id and coalesce(r.status,'active') not in ('cancelled','declined','inactive')
  on conflict (session_id,student_id) do nothing;
  return new;
end;
$$;
create trigger seed_attendance_roster_after_insert after insert on public.attendance_sessions for each row execute function private.seed_attendance_roster();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('assessment-resources','assessment-resources',false,52428800,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv','image/jpeg','image/png','image/webp']),
('class-resources','class-resources',false,52428800,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','text/csv','image/jpeg','image/png','image/webp','video/mp4','audio/mpeg','audio/mp4'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "Staff upload assessment resources" on storage.objects for insert to authenticated with check (bucket_id='assessment-resources' and (storage.foldername(name))[1]=(select auth.uid())::text and private.is_app_staff());
create policy "Staff manage own assessment resources" on storage.objects for update to authenticated using (bucket_id='assessment-resources' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_app_admin())) with check (bucket_id='assessment-resources' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_app_admin()));
create policy "Staff delete own assessment resources" on storage.objects for delete to authenticated using (bucket_id='assessment-resources' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_app_admin()));
create policy "Authorized users read assessment resources" on storage.objects for select to authenticated using (bucket_id='assessment-resources' and exists (select 1 from public.assessment_briefs b where b.attachment_storage_path=storage.objects.name and (b.lecturer_id=(select auth.uid()) or private.is_app_admin() or (b.published and private.can_access_module(b.module_id)))));

create policy "Staff upload class resources" on storage.objects for insert to authenticated with check (bucket_id='class-resources' and (storage.foldername(name))[1]=(select auth.uid())::text and private.is_app_staff());
create policy "Staff manage own class resources" on storage.objects for update to authenticated using (bucket_id='class-resources' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_app_admin())) with check (bucket_id='class-resources' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_app_admin()));
create policy "Staff delete own class resources" on storage.objects for delete to authenticated using (bucket_id='class-resources' and ((storage.foldername(name))[1]=(select auth.uid())::text or private.is_app_admin()));
create policy "Authorized users read class resources" on storage.objects for select to authenticated using (bucket_id='class-resources' and exists (select 1 from public.online_classes c where c.resource_storage_path=storage.objects.name and (c.lecturer_id=(select auth.uid()) or private.is_app_admin() or private.can_access_module(c.module_id))));

create policy "Lecturers read module submission files" on storage.objects for select to authenticated using (bucket_id='assignment_submissions' and exists (select 1 from public.assignment_submissions s join public.module_lecturers ml on ml.module_id=s.module_id where s.storage_path=storage.objects.name and (ml.lecturer_id=(select auth.uid()) or private.is_app_admin())));
create policy "Lecturers view answers for their quizzes" on public.quiz_attempt_answers for select to authenticated using (exists (select 1 from public.quiz_attempts a join public.quizzes q on q.id=a.quiz_id where a.id=attempt_id and (q.lecturer_id=(select auth.uid()) or private.is_app_admin())));

alter publication supabase_realtime add table public.attendance_sessions;
alter publication supabase_realtime add table public.attendance_records;
