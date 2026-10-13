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
  role: "student" | "lecturer" | "admin" | "pending_lecturer";
};

export type ModuleWithProgramme = {
  id: string;
  programme_id: string;
  level: string;
  name: string;
  code: string | null;
  programmes: { name: string } | null;
};

export type AssessmentBrief = {
  id: string;
  module_id: string | null;
  lecturer_id: string | null;
  level: string | null;
  title: string | null;
  subject: string | null;
  instructions: string | null;
  due_at: string | null;
  allow_late: boolean | null;
  max_file_size_bytes: number | null;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  assessment_type: string | null;
  venue: string | null;
  duration_minutes: number | null;
  weight_percent: number | null;
  attachment_storage_path: string | null;
  attachment_file_name: string | null;
  attachment_mime_type: string | null;
  attachment_file_size_bytes: number | null;
};

export type AssessmentRubric = {
  id: string;
  brief_id: string;
  criterion: string;
  description: string | null;
  max_points: number;
  position: number;
};

export type AssignmentSubmission = {
  id: string;
  user_id: string;
  level: string;
  title: string;
  subject: string;
  due_date: string | null;
  status: string;
  storage_path: string | null;
  document_url: string;
  submitted_at: string | null;
  grade: string | null;
  feedback: string | null;
  created_at: string | null;
  module_id: string | null;
  brief_id: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  file_fingerprint: string | null;
  mime_type: string | null;
  late_reason: string | null;
  extension_requested: boolean | null;
  extension_status: string | null;
  extension_requested_at: string | null;
  extension_reviewed_at: string | null;
  extension_reviewed_by: string | null;
  extension_new_due_at: string | null;
  extension_response: string | null;
  score: number | null;
  max_score: number | null;
  graded_at: string | null;
  graded_by: string | null;
  rubric_scores: Record<string, number>;
  withdrawn_at: string | null;
  updated_at: string | null;
  upload_version: number | null;
  profiles: {
    name: string;
    surname: string;
    nickname: string | null;
    photo_url: string | null;
  } | null;
};

export type StudentProfile = {
  id: string;
  name: string;
  surname: string;
  nickname: string | null;
  email: string;
  campus: string | null;
  department: string | null;
  level: string | null;
  photo_url: string | null;
};

export type SlideRecord = {
  id: string;
  level: string | null;
  subject: string | null;
  title: string;
  storage_path: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string | null;
  module_id: string | null;
  updated_at: string | null;
  modules: { name: string; code: string | null; level: string | null } | null;
};

export type AnnouncementRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  data:
    | {
        body: string;
        role: string;
        urgency: string;
        is_pinned: boolean;
      }
    | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
};

export type ICassMarkRecord = {
  id: string;
  student_id: string;
  module_id: string;
  subject_name: string | null;
  lecturer_name: string | null;
  component_name: string | null;
  component_score: number | null;
  component_weight: number | null;
  max_score: number;
  mark_status: string | null;
  assessment_date: string | null;
  academic_year: number | null;
  semester: number | null;
  published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  student: Pick<StudentProfile, "id" | "name" | "surname" | "nickname" | "email"> | null;
  module: { name: string; code: string | null } | null;
};

export type StaffMessageRecord = {
  id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  message_type: "text" | "link" | "image" | "video" | "audio" | "document";
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  is_read: boolean | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
};

export type ModuleInvitationRecord = {
  id: string;
  module_id: string;
  lecturer_id: string;
  student_id: string | null;
  invited_email: string | null;
  academic_year: number | null;
  semester: number | null;
  status: string | null;
  expires_at: string | null;
  responded_at: string | null;
  modules: { name: string; code: string | null; level: string | null } | null;
};

export type StudentRegistration = {
  student_id: string;
  module_id: string;
  academic_year: number | null;
  semester: number | null;
  registration_status: string | null;
  registered_at: string | null;
  module_name: string | null;
  module_code: string | null;
  name: string;
  surname: string;
  nickname: string | null;
  email: string;
  campus: string | null;
  department: string | null;
  level: string | null;
  student_number: string | null;
};

export type TimetableRecord = {
  id: string;
  title: string;
  level: string | null;
  programme: string | null;
  module: string | null;
  module_id: string | null;
  group_name: string | null;
  storage_path: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type QuizQuestionRecord = {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number | null;
  points: number | null;
  position: number | null;
};

export type QuizRecord = {
  id: string;
  module_id: string | null;
  lecturer_id: string | null;
  lecturer_name: string | null;
  title: string | null;
  description: string | null;
  duration_minutes: number | null;
  passing_score: number | null;
  quiz_date: string | null;
  available_from: string | null;
  closes_at: string | null;
  published: boolean | null;
  difficulty: string | null;
  max_attempts: number | null;
  randomize_questions: boolean | null;
  randomize_options: boolean | null;
  secure_mode: boolean | null;
  reward_points: number | null;
  instructions: string | null;
  results_release: string | null;
  assessment_type: string | null;
  quiz_questions: QuizQuestionRecord[];
};

export type OnlineClassRecord = {
  id: string;
  module_id: string | null;
  module: string | null;
  subject: string | null;
  topic: string | null;
  scheduled_at: string | null;
  status: string | null;
  lecturer: string | null;
  lecturer_id: string | null;
  url: string | null;
  resource_title: string | null;
  resource_url: string | null;
  resource_storage_path: string | null;
  resource_file_name: string | null;
  resource_mime_type: string | null;
  resource_file_size_bytes: number | null;
  recording_url: string | null;
  duration_minutes: number | null;
  created_at: string | null;
};

export type QuizAttemptRecord = {
  id: string;
  quiz_id: string;
  user_id: string;
  attempt_number: number;
  status: "in_progress" | "completed" | "expired" | "abandoned";
  started_at: string;
  completed_at: string | null;
  focus_violations: number;
  score_points: number | null;
  total_points: number | null;
  percentage: number | null;
  passed: boolean | null;
  quiz: { title: string | null; module_id: string | null; passing_score: number | null } | null;
  student: Pick<StudentProfile, "id" | "name" | "surname" | "nickname" | "email"> | null;
};

export type QuizAttemptAnswerRecord = {
  attempt_id: string;
  question_id: string;
  selected_option: number;
  is_correct: boolean | null;
  awarded_points: number | null;
  question: { question_text: string; correct_option: number | null; points: number | null } | null;
};

export type AttendanceSessionRecord = {
  id: string;
  module_id: string;
  lecturer_id: string;
  online_class_id: string | null;
  title: string;
  session_type: "physical" | "online";
  session_date: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  notes: string | null;
  status: "scheduled" | "open" | "closed" | "cancelled";
  created_at: string;
  module: { name: string; code: string | null } | null;
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  check_in_at: string | null;
  note: string | null;
  source: "roster" | "manual" | "online_tracking";
  attendance_seconds: number | null;
  required_seconds: number | null;
  last_synced_at: string | null;
  student: Pick<StudentProfile, "id" | "name" | "surname" | "nickname" | "email"> | null;
};

export type ModuleGroupRecord = {
  id: string;
  name: string;
  description: string | null;
  member_count: number | null;
  created_by: string;
  created_at: string | null;
  updated_at: string;
  module_id: string;
  group_kind: "module";
  accent_color: string;
  modules: { name: string; code: string | null; level: string | null } | null;
};

export type PastPaperRecord = {
  id: string;
  level: string | null;
  subject: string | null;
  title: string;
  year: number | null;
  exam_type: string | null;
  paper_type: "Paper 1" | "Paper 2" | null;
  storage_path: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string | null;
  module_id: string | null;
  modules: { name: string; code: string | null; level: string | null } | null;
};

export type ModuleGroupMessageRecord = {
  id: string;
  group_id: string;
  sender_id: string;
  text: string;
  message_type: "text" | "image" | "video" | "audio" | "document" | "link" | "poll";
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_at: string;
  is_deleted: boolean;
  profiles: {
    name: string;
    surname: string;
    nickname: string | null;
    photo_url: string | null;
  } | null;
};

export async function getStudentProfiles(
  supabase: SupabaseClient,
  limit = 20,
): Promise<StudentProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, surname, nickname, email, campus, department, level, photo_url",
    )
    .eq("role", "student")
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as StudentProfile[];
}

/** Fetches the currently signed-in user's profile, including their role. */
export async function getSlidesForLecturer(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<SlideRecord[]> {
  const { data: moduleRows, error: moduleError } = await supabase
    .from("module_lecturers")
    .select("module_id")
    .eq("lecturer_id", lecturerId);

  if (moduleError) throw moduleError;

  const moduleIds = (moduleRows ?? []).map((row) => row.module_id).filter(Boolean);

  if (moduleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("lecture_slides")
    .select("id, level, subject, title, storage_path, url, created_by, created_at, module_id, updated_at, modules!lecture_slides_module_id_fkey(name, code, level)")
    .in("module_id", moduleIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  type RawSlideRow = {
    id: string;
    level: string | null;
    subject: string | null;
    title: string;
    storage_path: string | null;
    url: string | null;
    created_by: string | null;
    created_at: string | null;
    module_id: string | null;
    updated_at: string | null;
    modules:
      | { name: string; code: string | null; level: string | null }
      | { name: string; code: string | null; level: string | null }[]
      | null;
  };

  return ((data ?? []) as RawSlideRow[]).map((slide) => ({
    ...slide,
    modules: Array.isArray(slide.modules) ? slide.modules[0] ?? null : slide.modules,
  })) as SlideRecord[];
}

export async function getOnlineClassesForLecturer(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<OnlineClassRecord[]> {
  const { data, error } = await supabase
    .from("online_classes")
    .select("id, module_id, module, subject, topic, scheduled_at, status, lecturer, lecturer_id, url, resource_title, resource_url, resource_storage_path, resource_file_name, resource_mime_type, resource_file_size_bytes, recording_url, duration_minutes, created_at")
    .eq("lecturer_id", lecturerId)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OnlineClassRecord[];
}

export async function getAssessmentBriefsForLecturer(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<AssessmentBrief[]> {
  const { data, error } = await supabase
    .from("assessment_briefs")
    .select("id, module_id, lecturer_id, level, title, subject, instructions, due_at, allow_late, max_file_size_bytes, published, created_at, updated_at, assessment_type, venue, duration_minutes, weight_percent, attachment_storage_path, attachment_file_name, attachment_mime_type, attachment_file_size_bytes")
    .eq("lecturer_id", lecturerId)
    .order("due_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AssessmentBrief[];
}

export async function getQuizzesForStaff(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<QuizRecord[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select(
      "id, module_id, lecturer_id, lecturer_name, title, description, duration_minutes, passing_score, quiz_date, available_from, closes_at, published, difficulty, max_attempts, randomize_questions, randomize_options, secure_mode, reward_points, instructions, results_release, assessment_type, quiz_questions(id, quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, points, position)",
    )
    .eq("lecturer_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((quiz) => ({
    ...quiz,
    quiz_questions: Array.isArray(quiz.quiz_questions)
      ? quiz.quiz_questions
      : [],
  })) as QuizRecord[];
}

export async function getSlidesForStaff(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<SlideRecord[]> {
  if (profile.role !== "admin") {
    return getSlidesForLecturer(supabase, profile.id);
  }

  const { data, error } = await supabase
    .from("lecture_slides")
    .select("id, level, subject, title, storage_path, url, created_by, created_at, module_id, updated_at, modules!lecture_slides_module_id_fkey(name, code, level)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((slide) => ({
    ...slide,
    modules: Array.isArray(slide.modules) ? slide.modules[0] ?? null : slide.modules,
  })) as SlideRecord[];
}

export async function getPastPapersForStaff(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<PastPaperRecord[]> {
  let moduleIds: string[] | null = null;
  if (profile.role !== "admin") {
    const { data: assignments, error: assignmentError } = await supabase
      .from("module_lecturers")
      .select("module_id")
      .eq("lecturer_id", profile.id);
    if (assignmentError) throw assignmentError;
    moduleIds = (assignments ?? []).map((row) => row.module_id).filter(Boolean);
    if (moduleIds.length === 0) return [];
  }

  let query = supabase
    .from("past_papers")
    .select("id, level, subject, title, year, exam_type, paper_type, storage_path, url, created_by, created_at, module_id, modules!past_papers_module_id_fkey(name, code, level)")
    .order("created_at", { ascending: false });
  if (moduleIds) query = query.in("module_id", moduleIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((paper) => ({
    ...paper,
    modules: Array.isArray(paper.modules) ? paper.modules[0] ?? null : paper.modules,
  })) as PastPaperRecord[];
}

export async function getQuizResultsForStaff(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<{ attempts: QuizAttemptRecord[]; answers: QuizAttemptAnswerRecord[] }> {
  const { data: quizzes, error: quizError } = await supabase
    .from("quizzes")
    .select("id, title, module_id, passing_score")
    .eq("lecturer_id", lecturerId);
  if (quizError) throw quizError;
  const quizRows = quizzes ?? [];
  if (quizRows.length === 0) return { attempts: [], answers: [] };

  const quizIds = quizRows.map((quiz) => quiz.id);
  const { data: attempts, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, user_id, attempt_number, status, started_at, completed_at, focus_violations, score_points, total_points, percentage, passed")
    .in("quiz_id", quizIds)
    .order("started_at", { ascending: false });
  if (attemptError) throw attemptError;
  const attemptRows = attempts ?? [];
  if (attemptRows.length === 0) return { attempts: [], answers: [] };

  const studentIds = [...new Set(attemptRows.map((attempt) => attempt.user_id))];
  const attemptIds = attemptRows.map((attempt) => attempt.id);
  const [{ data: profiles, error: profileError }, { data: answers, error: answerError }] = await Promise.all([
    supabase.from("profiles").select("id, name, surname, nickname, email").in("id", studentIds),
    supabase.from("quiz_attempt_answers").select("attempt_id, question_id, selected_option, is_correct, awarded_points, quiz_questions!quiz_attempt_answers_question_id_fkey(question_text, correct_option, points)").in("attempt_id", attemptIds),
  ]);
  if (profileError) throw profileError;
  if (answerError) throw answerError;
  const quizMap = new Map(quizRows.map((quiz) => [quiz.id, quiz]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  type RawAnswer = {
    attempt_id: string;
    question_id: string;
    selected_option: number;
    is_correct: boolean | null;
    awarded_points: number | null;
    quiz_questions: QuizAttemptAnswerRecord["question"] | QuizAttemptAnswerRecord["question"][];
  };
  return {
    attempts: attemptRows.map((attempt) => ({ ...attempt, quiz: quizMap.get(attempt.quiz_id) ?? null, student: profileMap.get(attempt.user_id) ?? null })) as QuizAttemptRecord[],
    answers: ((answers ?? []) as unknown as RawAnswer[]).map((answer) => ({
      attempt_id: answer.attempt_id,
      question_id: answer.question_id,
      selected_option: answer.selected_option,
      is_correct: answer.is_correct,
      awarded_points: answer.awarded_points,
      question: Array.isArray(answer.quiz_questions) ? answer.quiz_questions[0] ?? null : answer.quiz_questions,
    })),
  };
}

export async function getAssessmentRubricsForLecturer(
  supabase: SupabaseClient,
  briefIds: string[],
): Promise<AssessmentRubric[]> {
  if (briefIds.length === 0) return [];
  const { data, error } = await supabase
    .from("assessment_rubrics")
    .select("id, brief_id, criterion, description, max_points, position")
    .in("brief_id", briefIds)
    .order("position");
  if (error) throw error;
  return (data ?? []) as AssessmentRubric[];
}

export async function getAttendanceForLecturer(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<{ sessions: AttendanceSessionRecord[]; records: AttendanceRecord[] }> {
  const { data: sessions, error: sessionError } = await supabase
    .from("attendance_sessions")
    .select("id, module_id, lecturer_id, online_class_id, title, session_type, session_date, starts_at, ends_at, venue, notes, status, created_at, modules!attendance_sessions_module_id_fkey(name, code)")
    .eq("lecturer_id", lecturerId)
    .order("session_date", { ascending: false });
  if (sessionError) throw sessionError;
  type RawSession = Omit<AttendanceSessionRecord, "module"> & { modules: AttendanceSessionRecord["module"] | AttendanceSessionRecord["module"][] };
  const sessionRows = ((sessions ?? []) as unknown as RawSession[]).map((session) => ({
    ...session,
    module: Array.isArray(session.modules) ? session.modules[0] ?? null : session.modules,
  }));
  if (sessionRows.length === 0) return { sessions: [], records: [] };
  const { data: records, error: recordError } = await supabase
    .from("attendance_records")
    .select("id, session_id, student_id, status, check_in_at, note, source, attendance_seconds, required_seconds, last_synced_at")
    .in("session_id", sessionRows.map((session) => session.id));
  if (recordError) throw recordError;
  const recordRows = records ?? [];
  const studentIds = [...new Set(recordRows.map((record) => record.student_id))];
  const { data: profiles, error: profileError } = studentIds.length
    ? await supabase.from("profiles").select("id, name, surname, nickname, email").in("id", studentIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return {
    sessions: sessionRows as AttendanceSessionRecord[],
    records: recordRows.map((record) => ({ ...record, student: profileMap.get(record.student_id) ?? null })) as AttendanceRecord[],
  };
}

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

export async function getModulesForStaff(
  supabase: SupabaseClient,
  profile: Profile,
): Promise<ModuleWithProgramme[]> {
  return getModulesForLecturer(supabase, profile.id);
}

export async function getAnnouncementsForStaff(
  supabase: SupabaseClient,
): Promise<AnnouncementRecord[]> {
  const { data, error } = await supabase
    .from("app_content")
    .select("id, slug, title, subtitle, data, is_active, created_at, updated_at, created_by")
    .eq("section", "announcements")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnnouncementRecord[];
}

export async function getICassMarksForStaff(
  supabase: SupabaseClient,
): Promise<ICassMarkRecord[]> {
  const { data, error } = await supabase
    .from("icass_marks")
    .select("id, student_id, module_id, subject_name, lecturer_name, component_name, component_score, component_weight, max_score, mark_status, assessment_date, academic_year, semester, published, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const studentIds = [...new Set(rows.map((row) => row.student_id))];
  const moduleIds = [...new Set(rows.map((row) => row.module_id).filter(Boolean))];
  const [{ data: profiles, error: profileError }, { data: modules, error: moduleError }] = await Promise.all([
    supabase.from("profiles").select("id, name, surname, nickname, email").in("id", studentIds),
    supabase.from("modules").select("id, name, code").in("id", moduleIds),
  ]);
  if (profileError) throw profileError;
  if (moduleError) throw moduleError;
  const profileMap = new Map((profiles ?? []).map((row) => [row.id, row]));
  const moduleMap = new Map((modules ?? []).map((row) => [row.id, row]));
  return rows.map((row) => ({ ...row, student: profileMap.get(row.student_id) ?? null, module: moduleMap.get(row.module_id) ?? null })) as ICassMarkRecord[];
}

export async function getMessagesForStaff(
  supabase: SupabaseClient,
  staffId: string,
): Promise<StaffMessageRecord[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, text, message_type, attachment_url, attachment_name, attachment_mime, attachment_size, is_read, delivered_at, read_at, created_at")
    .or(`sender_id.eq.${staffId},recipient_id.eq.${staffId}`)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return ((data ?? []) as StaffMessageRecord[]).reverse();
}

export async function getModuleGroupsForLecturer(
  supabase: SupabaseClient,
  lecturerId: string,
): Promise<ModuleGroupRecord[]> {
  const { data, error } = await supabase
    .from("group_chats")
    .select(
      "id, name, description, member_count, created_by, created_at, updated_at, module_id, group_kind, accent_color, modules!group_chats_module_id_fkey(name, code, level)",
    )
    .eq("group_kind", "module")
    .eq("created_by", lecturerId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  type RawGroup = Omit<ModuleGroupRecord, "modules"> & {
    modules:
      | ModuleGroupRecord["modules"]
      | NonNullable<ModuleGroupRecord["modules"]>[];
  };
  return ((data ?? []) as unknown as RawGroup[]).map((group) => ({
    ...group,
    modules: Array.isArray(group.modules) ? group.modules[0] ?? null : group.modules,
  }));
}

export async function getModuleGroupMessages(
  supabase: SupabaseClient,
  groupIds: string[],
): Promise<ModuleGroupMessageRecord[]> {
  if (groupIds.length === 0) return [];
  const { data, error } = await supabase
    .from("group_messages")
    .select(
      "id, group_id, sender_id, text, message_type, attachment_url, attachment_name, attachment_mime, created_at, is_deleted",
    )
    .in("group_id", groupIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(1000);

  if (error) throw error;
  const messages = (data ?? []) as Omit<ModuleGroupMessageRecord, "profiles">[];
  if (messages.length === 0) return [];
  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, surname, nickname, photo_url")
    .in("id", senderIds);
  if (profileError) throw profileError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return messages.map((message) => ({
    ...message,
    profiles: profileMap.get(message.sender_id) ?? null,
  }));
}

export async function getModuleInvitationsForStaff(
  supabase: SupabaseClient,
): Promise<ModuleInvitationRecord[]> {
  const { data, error } = await supabase
    .from("module_invitations")
    .select("id, module_id, lecturer_id, student_id, invited_email, academic_year, semester, status, expires_at, responded_at, modules!module_invitations_module_id_fkey(name, code, level)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  type RawInvitationRow = {
    id: string;
    module_id: string;
    lecturer_id: string;
    student_id: string | null;
    invited_email: string | null;
    academic_year: number | null;
    semester: number | null;
    status: string | null;
    expires_at: string | null;
    responded_at: string | null;
    modules:
      | { name: string; code: string | null; level: string | null }
      | { name: string; code: string | null; level: string | null }[]
      | null;
  };

  return ((data ?? []) as RawInvitationRow[]).map((row) => ({
    ...row,
    modules: Array.isArray(row.modules) ? row.modules[0] ?? null : row.modules,
  })) as ModuleInvitationRecord[];
}

export async function getRegisteredStudentsForStaff(
  supabase: SupabaseClient,
): Promise<StudentRegistration[]> {
  const { data, error } = await supabase
    .from("student_module_registrations")
    .select(
      "student_id, module_id, academic_year, semester, status, registered_at, modules!student_module_registrations_module_id_fkey(name, code)",
    )
    .order("registered_at", { ascending: false });

  if (error) throw error;

  const registrations = (data ?? []) as Array<{
    student_id: string;
    module_id: string;
    academic_year: number | null;
    semester: number | null;
    status: string | null;
    registered_at: string | null;
    modules: { name: string; code: string | null } | { name: string; code: string | null }[] | null;
  }>;

  const studentIds = [...new Set(registrations.map((row) => row.student_id))];
  if (studentIds.length === 0) return [];

  // student_module_registrations.student_id points to auth.users, not
  // public.profiles, so PostgREST cannot embed profiles through a foreign key.
  // Fetch the authorized registrations first, then load their public profiles.
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, surname, nickname, email, campus, department, level, student_number")
    .in("id", studentIds);

  if (profileError) throw profileError;

  const profileMap = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));

  return registrations.map((row) => {
    const profileRow = profileMap.get(row.student_id);
    const moduleRow = Array.isArray(row.modules) ? row.modules[0] ?? null : row.modules;
    return {
      student_id: row.student_id,
      module_id: row.module_id,
      academic_year: row.academic_year,
      semester: row.semester,
      registration_status: row.status,
      registered_at: row.registered_at,
      module_name: moduleRow?.name ?? null,
      module_code: moduleRow?.code ?? null,
      name: profileRow?.name ?? "",
      surname: profileRow?.surname ?? "",
      nickname: profileRow?.nickname ?? null,
      email: profileRow?.email ?? "",
      campus: profileRow?.campus ?? null,
      department: profileRow?.department ?? null,
      level: profileRow?.level ?? null,
      student_number: profileRow?.student_number ?? null,
    };
  });
}

export async function getTimetablesForStaff(
  supabase: SupabaseClient,
  moduleIds: string[],
): Promise<TimetableRecord[]> {
  if (moduleIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("timetables")
    .select(
      "id, title, level, programme, module, module_id, group_name, storage_path, url, created_by, created_at, updated_at",
    )
    .in("module_id", moduleIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TimetableRecord[];
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
      "id, user_id, level, title, subject, due_date, status, storage_path, document_url, submitted_at, grade, feedback, created_at, module_id, brief_id, file_name, file_size_bytes, file_fingerprint, mime_type, late_reason, extension_requested, extension_status, extension_requested_at, extension_reviewed_at, extension_reviewed_by, extension_new_due_at, extension_response, score, max_score, graded_at, graded_by, rubric_scores, withdrawn_at, updated_at, upload_version",
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
