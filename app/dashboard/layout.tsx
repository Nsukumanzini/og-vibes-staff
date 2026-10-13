import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  // Middleware already redirects unauthenticated visitors away from
  // /dashboard, but it can't check *role* without an extra DB round trip
  // on every request. We do that check here instead, once per navigation.
  if (profile?.role === "pending_lecturer") {
    redirect("/pending-approval");
  }

  if (!profile || !["lecturer", "admin"].includes(profile.role)) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 px-4 py-5 pb-28 sm:px-6 sm:pb-28 lg:px-8 lg:py-7 lg:pb-7">{children}</main>
      </div>
    </div>
  );
}
