import { ICassGradebook } from "@/components/dashboard/icass-gradebook";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getICassMarksForStaff, getModulesForStaff, getRegisteredStudentsForStaff } from "@/lib/supabase/queries";

export default async function ICassPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const [modules, students, marks] = await Promise.all([
    getModulesForStaff(supabase, profile),
    getRegisteredStudentsForStaff(supabase),
    getICassMarksForStaff(supabase),
  ]);
  return <ICassGradebook profile={profile} modules={modules} students={students} initialMarks={marks} />;
}
