import { AlertsManager } from "@/components/dashboard/operation-managers";
import { getAnnouncementsForStaff, getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AlertsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const alerts = await getAnnouncementsForStaff(supabase);
  return <AlertsManager initialAlerts={alerts} profile={profile} />;
}
