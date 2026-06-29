import { CalendarDays, Clock3 } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function SchedulePage() {
  return (
    <LecturerSectionPage
      title="Schedule"
      description="Plan teaching sessions, assessments and important deadlines in one place."
      summary="This section will become the academic calendar for classes, assessments and teaching milestones."
      stats={[
        { label: "Upcoming events", value: "7", detail: "this week" },
        { label: "Live classes", value: "4", detail: "scheduled" },
        { label: "Deadlines", value: "3", detail: "due soon" },
      ]}
      actions={[
        {
          title: "View timetable",
          description: "See your next teaching events and class times.",
          href: "/dashboard/schedule",
          icon: CalendarDays,
        },
        {
          title: "Plan a session",
          description: "Schedule a lecture, assessment or student check-in.",
          href: "/dashboard/online-classes",
          icon: Clock3,
        },
      ]}
      checklist={[
        {
          title: "Teaching calendar",
          description: "Lecturers will be able to plan classes and assessments around academic dates.",
        },
        {
          title: "Upcoming reminders",
          description: "Critical deadlines and sessions will be surfaced clearly for lecturers.",
        },
      ]}
    />
  );
}
