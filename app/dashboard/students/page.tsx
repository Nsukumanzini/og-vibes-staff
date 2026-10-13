import { StudentDirectory } from "@/components/dashboard/operation-managers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getRegisteredStudentsForStaff } from "@/lib/supabase/queries";

export default async function StudentsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;
  const students = await getRegisteredStudentsForStaff(supabase);
  return <StudentDirectory students={students} />;
}
