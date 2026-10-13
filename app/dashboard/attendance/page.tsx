import { AttendanceManager } from "@/components/dashboard/attendance-manager";
import { createClient } from "@/lib/supabase/server";
import { getAttendanceForLecturer, getCurrentProfile, getModulesForStaff, getOnlineClassesForLecturer } from "@/lib/supabase/queries";

export default async function AttendancePage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const [modules, onlineClasses, attendance] = await Promise.all([
    getModulesForStaff(supabase, profile),
    getOnlineClassesForLecturer(supabase, profile.id),
    getAttendanceForLecturer(supabase, profile.id),
  ]);
  return <AttendanceManager profile={profile} modules={modules} onlineClasses={onlineClasses} initialSessions={attendance.sessions} initialRecords={attendance.records} />;
}
