create index if not exists assessment_briefs_lecturer_id_idx on public.assessment_briefs(lecturer_id);
create index if not exists assignment_submissions_module_id_idx on public.assignment_submissions(module_id);
create index if not exists assignment_submissions_extension_reviewed_by_idx on public.assignment_submissions(extension_reviewed_by);
create index if not exists assignment_submissions_graded_by_idx on public.assignment_submissions(graded_by);
create index if not exists attendance_sessions_lecturer_id_idx on public.attendance_sessions(lecturer_id);
create index if not exists attendance_sessions_online_class_id_idx on public.attendance_sessions(online_class_id);
create index if not exists attendance_records_session_id_idx on public.attendance_records(session_id);
create index if not exists attendance_records_marked_by_idx on public.attendance_records(marked_by);
