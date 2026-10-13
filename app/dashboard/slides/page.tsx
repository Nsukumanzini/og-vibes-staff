import { AcademicLibraryWorkspace } from "@/components/dashboard/operation-managers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getModulesForStaff, getPastPapersForStaff, getSlidesForStaff } from "@/lib/supabase/queries";

export default async function SlidesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const modules = await getModulesForStaff(supabase, profile);
  const [slides, papers] = await Promise.all([
    getSlidesForStaff(supabase, profile),
    getPastPapersForStaff(supabase, profile),
  ]);
  return <AcademicLibraryWorkspace profile={profile} modules={modules} slides={slides} papers={papers} />;
}
