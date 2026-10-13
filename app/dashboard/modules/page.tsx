import { ModuleInvitationManager } from "@/components/dashboard/module-invitation-manager";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getModuleInvitationsForStaff,
  getModulesForStaff,
  getRegisteredStudentsForStaff,
} from "@/lib/supabase/queries";

export default async function ModulesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const [modules, registrations, invitations] = await Promise.all([
    getModulesForStaff(supabase, profile),
    getRegisteredStudentsForStaff(supabase),
    getModuleInvitationsForStaff(supabase),
  ]);
  return <ModuleInvitationManager
    modules={modules}
    initialRegistrations={registrations.filter((item) => item.registration_status === "active")}
    initialInvitations={invitations}
    studentAppUrl={process.env.NEXT_PUBLIC_STUDENT_APP_URL ?? "https://student.ogvibes.co.za/"}
  />;
}
