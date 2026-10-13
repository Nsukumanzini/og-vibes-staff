-- Cover the foreign keys and filters used by the corrected academic workflows.

create index if not exists quiz_questions_quiz_id_idx on public.quiz_questions(quiz_id);
create index if not exists lecture_slides_module_id_idx on public.lecture_slides(module_id);
create index if not exists timetables_module_id_idx on public.timetables(module_id);
create index if not exists assessment_briefs_module_id_idx on public.assessment_briefs(module_id);
create index if not exists attendance_sessions_online_class_id_idx on public.attendance_sessions(online_class_id) where online_class_id is not null;
create index if not exists attendance_records_session_id_idx on public.attendance_records(session_id);
create index if not exists online_class_attendance_class_id_idx on public.online_class_attendance(class_id);
