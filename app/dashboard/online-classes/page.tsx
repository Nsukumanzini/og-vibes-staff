import { OnlineClassWorkspace } from "@/components/dashboard/online-class-workspace";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getModulesForStaff, getOnlineClassesForLecturer } from "@/lib/supabase/queries";

export default async function OnlineClassesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const [modules, classes] = await Promise.all([
    getModulesForStaff(supabase, profile),
    getOnlineClassesForLecturer(supabase, profile.id),
  ]);
  return <OnlineClassWorkspace profile={profile} modules={modules} initialClasses={classes} />;
}
