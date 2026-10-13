import { QuizManager } from "@/components/dashboard/quiz-manager";
import { QuizResultsDashboard } from "@/components/dashboard/quiz-results-dashboard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getModulesForStaff, getQuizResultsForStaff, getQuizzesForStaff } from "@/lib/supabase/queries";

export default async function QuizzesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const [modules, quizzes, results] = await Promise.all([
    getModulesForStaff(supabase, profile),
    getQuizzesForStaff(supabase, profile),
    getQuizResultsForStaff(supabase, profile.id),
  ]);
  return <div className="space-y-6"><QuizManager profile={profile} modules={modules} initialQuizzes={quizzes} /><QuizResultsDashboard quizzes={quizzes} attempts={results.attempts} answers={results.answers} /></div>;
}
