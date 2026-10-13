-- Table privileges allow PostgREST to reach quiz_questions; the existing
-- "Authorized users read quiz questions" RLS policy still limits rows.
grant select on table public.quiz_questions to authenticated;
