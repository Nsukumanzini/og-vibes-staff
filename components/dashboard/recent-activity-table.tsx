import { FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecentSubmission } from "@/lib/supabase/queries";

function formatStudentName(student: RecentSubmission["student"]) {
  if (!student) return "Unknown student";
  if (student.nickname) return student.nickname;
  return `${student.name} ${student.surname}`.trim();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(submission: RecentSubmission) {
  if (submission.grade) {
    return <Badge variant="success">Graded · {submission.grade}</Badge>;
  }
  if (submission.status === "submitted") {
    return <Badge variant="warning">Awaiting grade</Badge>;
  }
  return <Badge variant="muted">{submission.status}</Badge>;
}

export function RecentActivityTable({
  submissions,
}: {
  submissions: RecentSubmission[];
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Recent Activity</CardTitle>
        <CardDescription>
          The latest assignment submissions across your modules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No submissions yet. New student work will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Recent assignment submissions from your students
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Student
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Assignment
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Module
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Submitted
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {formatStudentName(submission.student)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {submission.title}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {submission.module?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(submission.submitted_at)}
                    </td>
                    <td className="py-3 pr-4">{statusBadge(submission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
