import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lecturer-scoped data helpers.
 *
 * These all rely on RLS policies already in place on the og-vibes Supabase
 * project (see: "Lecturers can view submissions for their modules" /
 * "Lecturers can grade submissions for their modules" policies on
 * assignment_submissions, and the analogous read policies on modules /
 * module_lecturers). Every query here is implicitly scoped to whichever
 * lecturer is currently authenticated — there is no need to add a
 * `.eq('lecturer_id', ...)` filter in application code, since the database
 * already enforces it. Don't bypass these helpers with raw queries that
 * skip RLS assumptions documented here.
 */

export type Profile = {
  id: string;
  name: string;
  surname: string;
  nickname: string | null;
  email: string;
  campus: string;
  department: string;
  level: string;
  photo_url: string | null;
  role: "student" | "lecturer" | "admin";
};

export type ModuleWithProgramme = {
  id: string;
  programme_id: string;
  level: string;
  name: string;
  code: string | null;
  programmes: { name: string } | null;
};

export type AssignmentSubmission = {
  id: string;
  user_id: string;
  level: string;
  title: string;
  subject: string;
  status: string;
  document_url: string;
  submitted_at: string | null;
  grade: string | null;
  feedback: string | null;
  module_id: string | null;
  profiles: {
    name: string;
    surname: string;
    nickname: string | null;
    photo_url: string | null;
  } | null;
};

/** Fetches the currently signed-in user's profile, including their role. */
export async function getCurrentProfile(
  supabase: SupabaseClient,
): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, surname, nickname, email, campus, department, level, photo_url, role",
    )
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

/**
 * Modules the currently signed-in lecturer teaches.
 * Relies on the "Authenticated users can view modules" SELECT policy plus
 * an inner join against module_lecturers scoped to auth.uid() — note this
 * join happens in Postgres via the embedded select, not client-side.
 */
export async function getModulesForLecturer(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<ModuleWithProgramme[]> {
  const { data, error } = await supabase
    .from("module_lecturers")
    .select(
      "modules!module_lecturers_module_id_fkey(id, programme_id, level, name, code, programmes!modules_programme_id_fkey(name))",
    )
    .eq("lecturer_id", lecturerId);

  if (error) throw error;

  // Without generated database types, supabase-js can't know that
  // module_lecturers -> modules is a to-one relation (one row per FK
  // match), so it infers `modules` as an array. We know from the schema
  // (module_lecturers.module_id is a plain FK, not a join table on this
  // side) that it's always exactly one row or null.
  // TODO (backend): run `supabase gen types typescript` against this
  // project and replace this manual cast with real generated types —
  // this removes the need for casts like this throughout the file.
  type RawRow = { modules: ModuleWithProgramme | ModuleWithProgramme[] | null };

  return (data as unknown as RawRow[] ?? [])
    .map((row) => (Array.isArray(row.modules) ? row.modules[0] ?? null : row.modules))
    .filter((m): m is ModuleWithProgramme => m !== null && m !== undefined);
}

/**
 * Submissions for a specific module. RLS already restricts this to modules
 * the signed-in lecturer teaches — passing a moduleId the lecturer doesn't
 * teach simply returns zero rows rather than an error.
 *
 * Note: assignment_submissions.user_id references auth.users(id), not
 * public.profiles(id) directly, so PostgREST can't embed profiles via a
 * single select (there's no FK for it to traverse even though the IDs
 * match by convention). We fetch profiles in a second query instead.
 */
export async function getSubmissionsForModule(
  supabase: SupabaseClient,
  moduleId: string,
): Promise<AssignmentSubmission[]> {
  const { data: submissions, error } = await supabase
    .from("assignment_submissions")
    .select(
      "id, user_id, level, title, subject, status, document_url, submitted_at, grade, feedback, module_id",
    )
    .eq("module_id", moduleId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  if (!submissions || submissions.length === 0) return [];

  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, surname, nickname, photo_url")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return submissions.map((s) => ({
    ...s,
    profiles: profileMap.get(s.user_id) ?? null,
  })) as AssignmentSubmission[];
}

export type DashboardStats = {
  total_students: number;
  pending_grades: number;
  upcoming_assessments: number;
};

export type RecentSubmission = {
  id: string;
  title: string;
  status: string;
  submitted_at: string | null;
  grade: string | null;
  module: { name: string } | null;
  student: { name: string; surname: string; nickname: string | null } | null;
};

/**
 * Aggregate stats for the dashboard summary cards. Backed by the
 * get_lecturer_dashboard_stats() Postgres function (security invoker —
 * auth.uid() resolves to the caller, so this can never return another
 * lecturer's numbers). One round trip instead of three separate queries.
 */
export async function getDashboardStats(
  supabase: SupabaseClient,
): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_lecturer_dashboard_stats");
  if (error) throw error;
  return data as DashboardStats;
}

/**
 * Most recent submissions across every module the lecturer teaches, for
 * the Recent Activity table. RLS scopes assignment_submissions to the
 * lecturer's modules already (see "Lecturers can view submissions for
 * their modules"), so no module_id filter is needed here — omitting it
 * is what makes this span *all* of the lecturer's modules rather than one.
 */
export async function getRecentSubmissionsForLecturer(
  supabase: SupabaseClient,
  limit = 8,
): Promise<RecentSubmission[]> {
  const { data: submissions, error } = await supabase
    .from("assignment_submissions")
    .select(
      "id, user_id, title, status, submitted_at, created_at, grade, modules!assignment_submissions_module_id_fkey(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!submissions || submissions.length === 0) return [];

  const userIds = [...new Set(submissions.map((s) => s.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, surname, nickname")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Same to-one embed quirk as getModulesForLecturer: without generated
  // types, `modules` infers as an array even though module_id -> modules
  // is a plain to-one FK.
  type RawRow = (typeof submissions)[number] & {
    modules: { name: string } | { name: string }[] | null;
  };

  return (submissions as unknown as RawRow[]).map((s) => {
    const moduleRow = Array.isArray(s.modules) ? s.modules[0] ?? null : s.modules;
    const profile = profileMap.get(s.user_id);
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      submitted_at: s.submitted_at ?? s.created_at ?? null,
      grade: s.grade,
      module: moduleRow,
      student: profile
        ? { name: profile.name, surname: profile.surname, nickname: profile.nickname }
        : null,
    };
  });
}

/**
 * Grades a submission. RLS's `with_check` re-verifies the lecturer teaches
 * this submission's module on write, not just on read — so this throws if
 * the lecturer somehow targets a submission outside their modules.
 */
export async function gradeSubmission(
  supabase: SupabaseClient,
  submissionId: string,
  grade: string,
  feedback: string,
) {
  const { error } = await supabase
    .from("assignment_submissions")
    .update({ grade, feedback })
    .eq("id", submissionId);

  if (error) throw error;
}
