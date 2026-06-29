import { Video, CalendarDays } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function OnlineClassesPage() {
  return (
    <LecturerSectionPage
      title="Online classes"
      description="Host live virtual sessions and make them available to students from one central place."
      summary="Run engaging online lessons with clear schedules, session links and follow-up resources for your classes."
      stats={[
        { label: "Live sessions", value: "8", detail: "scheduled this week" },
        { label: "Attendance", value: "86%", detail: "average participation" },
        { label: "Recording ready", value: "5", detail: "ready for replay" },
      ]}
      actions={[
        {
          title: "Schedule a class",
          description: "Create a new online session and share the meeting link.",
          href: "/dashboard/online-classes",
          icon: CalendarDays,
        },
        {
          title: "Prepare a live lesson",
          description: "Attach supporting materials and reminders before the session starts.",
          href: "/dashboard/slides",
          icon: Video,
        },
      ]}
      checklist={[
        {
          title: "Calendar-based delivery",
          description: "Students can see upcoming online classes in a clear timetable.",
        },
        {
          title: "Live session links",
          description: "Each class includes a direct link for students to join instantly.",
        },
        {
          title: "Replay support",
          description: "Recordings can be attached to the lesson for later review.",
        },
      ]}
    />
  );
}
