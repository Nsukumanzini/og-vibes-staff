import { BellRing, Megaphone } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function AlertsPage() {
  return (
    <LecturerSectionPage
      title="Alerts"
      description="Send updates, reminders and announcements that appear directly on the student app alert screen."
      summary="Keep students informed with timely notices about classes, assessments, deadlines and important campus updates."
      stats={[
        { label: "Active alerts", value: "6", detail: "currently published" },
        { label: "Unread by students", value: "184", detail: "across your cohorts" },
        { label: "Response rate", value: "92%", detail: "engagement on key notices" },
      ]}
      actions={[
        {
          title: "Post a new announcement",
          description: "Share urgent updates or reminders to your student groups.",
          href: "/dashboard/alerts",
          icon: Megaphone,
        },
        {
          title: "Review recent alerts",
          description: "Track message history and keep communications consistent.",
          href: "/dashboard/alerts",
          icon: BellRing,
        },
      ]}
      checklist={[
        {
          title: "Student alert screen",
          description: "Announcements are surfaced in the student app alert feed immediately.",
        },
        {
          title: "Audience targeting",
          description: "Notifications can be sent to specific programmes, levels or cohorts.",
        },
        {
          title: "Priority messaging",
          description: "Urgent updates can be marked for quick attention by students.",
        },
      ]}
    />
  );
}
