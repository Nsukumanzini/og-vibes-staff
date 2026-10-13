import { AssessmentWorkspace } from "@/components/dashboard/assessment-workspace";
import { createClient } from "@/lib/supabase/server";
import { getAssessmentBriefsForLecturer, getAssessmentRubricsForLecturer, getCurrentProfile, getModulesForStaff, getSubmissionsForModule } from "@/lib/supabase/queries";

export default async function AssessmentsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const modules = await getModulesForStaff(supabase, profile);
  const [briefs, submissionGroups] = await Promise.all([
    getAssessmentBriefsForLecturer(supabase, profile.id),
    Promise.all(modules.map((module) => getSubmissionsForModule(supabase, module.id))),
  ]);
  const submissions = Array.from(new Map(submissionGroups.flat().map((item) => [item.id, item])).values());
  const rubrics = await getAssessmentRubricsForLecturer(supabase, briefs.map((brief) => brief.id));
  return <AssessmentWorkspace profile={profile} modules={modules} initialBriefs={briefs} initialSubmissions={submissions} initialRubrics={rubrics} />;
}
