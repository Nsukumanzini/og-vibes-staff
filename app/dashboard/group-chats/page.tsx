import { ModuleGroupChatManager } from "@/components/dashboard/module-group-chat-manager";
import {
  getCurrentProfile,
  getModuleGroupMessages,
  getModuleGroupsForLecturer,
  getModulesForStaff,
} from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ModuleGroupChatsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return null;

  const [modules, groups] = await Promise.all([
    getModulesForStaff(supabase, profile),
    getModuleGroupsForLecturer(supabase, profile.id),
  ]);
  const messages = await getModuleGroupMessages(
    supabase,
    groups.slice(0, 1).map((group) => group.id),
  );

  return (
    <ModuleGroupChatManager
      profile={profile}
      modules={modules}
      initialGroups={groups}
      initialMessages={messages}
    />
  );
}
