import Link from "next/link";
import {
  BadgeCheck,
  BellRing,
  BookOpen,
  BrainCircuit,
  Calendar,
  ClipboardCheck,
  MessageSquareText,
  MonitorPlay,
  TrendingUp,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getDashboardStats,
  getRecentSubmissionsForLecturer,
} from "@/lib/supabase/queries";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RecentActivityTable } from "@/components/dashboard/recent-activity-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * DashboardHome — the lecturer dashboard landing page.
 *
 * This is a Server Component: all three Supabase calls run on the server,
 * before any HTML is sent to the browser. There's no client-side loading
 * state or useEffect here on purpose — Next.js waits for this component to
 * finish fetching, then streams the fully-rendered page. RLS (see
 * lib/supabase/queries.ts for the policies each helper depends on) scopes
 * every query to whichever lecturer is signed in, enforced by the database
 * itself rather than by anything in this component.
 */
export default async function DashboardHome() {
  const supabase = await createClient();

  const profile = await getCurrentProfile(supabase);

  // Fetch stats and recent activity in parallel — they're independent
  // queries, no reason to wait for one before starting the other.
  const [stats, recentSubmissions] = await Promise.all([
    getDashboardStats(supabase),
    getRecentSubmissionsForLecturer(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/15 via-background to-background p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              Staff dashboard
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {profile?.name ?? "Lecturer"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Here&apos;s a clear view of your teaching flow for the term, from lessons and assessments to student communication.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3 text-sm shadow-sm">
            <p className="font-medium text-foreground">Today&apos;s focus</p>
            <p className="text-muted-foreground">Review student submissions and update upcoming announcements.</p>
          </div>
        </div>
      </div>

      <SummaryCards stats={stats} />

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Lecturer workspace</CardTitle>
          <CardDescription>
            Move through your most important teaching workflows in one calm, organised space.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              title: "Teaching content",
              items: [
                { href: "/dashboard/slides", label: "Lecture slides", description: "Share lesson decks", icon: BookOpen },
                { href: "/dashboard/online-classes", label: "Online classes", description: "Host live sessions", icon: MonitorPlay },
                { href: "/dashboard/modules", label: "My modules", description: "Organise courses", icon: BookOpen },
              ],
            },
            {
              title: "Assessment management",
              items: [
                { href: "/dashboard/assessments", label: "Assessments", description: "Manage submissions", icon: ClipboardCheck },
                { href: "/dashboard/quizzes", label: "Quizzes", description: "Create learner checks", icon: BrainCircuit },
                { href: "/dashboard/icass", label: "ICASS", description: "Upload marks", icon: BadgeCheck },
              ],
            },
            {
              title: "Communication",
              items: [
                { href: "/dashboard/alerts", label: "Alerts", description: "Post announcements", icon: BellRing },
                { href: "/dashboard/messages", label: "Messages", description: "Talk with students", icon: MessageSquareText },
              ],
            },
            {
              title: "Student oversight",
              items: [
                { href: "/dashboard/students", label: "My students", description: "View enrolled learners", icon: Users },
              ],
            },
            {
              title: "Planning and organisation",
              items: [
                { href: "/dashboard/schedule", label: "Schedule", description: "Plan live sessions", icon: Calendar },
              ],
            },
          ].map((group) => (
            <div key={group.title} className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-foreground">{group.title}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button key={item.href} asChild variant="outline" className="h-auto justify-start px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                      <Link href={item.href} className="flex w-full items-start gap-3 text-left">
                        <div className="rounded-md bg-primary/10 p-2 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span>
                          <span className="block font-medium">{item.label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <RecentActivityTable submissions={recentSubmissions} />
    </div>
  );
}
