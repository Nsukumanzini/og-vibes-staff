import { StaffMessagesManager } from "@/components/dashboard/staff-messages-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMessagesForStaff, getRegisteredStudentsForStaff } from "@/lib/supabase/queries";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const [students, messages, params] = await Promise.all([
    getRegisteredStudentsForStaff(supabase),
    getMessagesForStaff(supabase, profile.id),
    searchParams,
  ]);
  return <StaffMessagesManager profile={profile} students={students} initialMessages={messages} initialStudentId={params.student} />;
}
