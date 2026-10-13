import Link from "next/link";
import { Users, CalendarClock, ClipboardList, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardStats } from "@/lib/supabase/queries";

export function SummaryCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total Students"
        value={stats.total_students}
        icon={Users}
        helpText="Across all your modules"
      />

      <StatCard
        label="Pending Grades"
        value={stats.pending_grades}
        icon={ClipboardList}
        helpText="Submissions awaiting a grade"
        emphasize={stats.pending_grades > 0}
      />

      <StatCard
        label="Upcoming Assessments"
        value={stats.upcoming_assessments}
        icon={CalendarClock}
        helpText="Quizzes and assignments due soon"
      />

      {/* Action card, not a stat — creating a quiz isn't a count. */}
      <Card className="flex flex-col justify-between border border-dashed border-primary/30 bg-primary/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Quick action
          </CardTitle>
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Create or review a quiz in seconds and keep learning moving.
          </p>
          <Button asChild size="sm" className="w-full">
            <Link href="/dashboard/quizzes">Create a quiz</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  helpText,
  emphasize = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  helpText: string;
  emphasize?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm transition-transform hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className={emphasize ? "rounded-full bg-warning/10 p-2" : "rounded-full bg-muted p-2"}>
          <Icon
            className={emphasize ? "h-4 w-4 text-warning" : "h-4 w-4 text-muted-foreground"}
            aria-hidden={true}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
      </CardContent>
    </Card>
  );
}
