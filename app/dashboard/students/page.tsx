import { BadgeCheck, Users2 } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function StudentsPage() {
  return (
    <LecturerSectionPage
      title="My students"
      description="View the students enrolled in your modules by programme, level and course."
      summary="Keep track of learner cohorts and quickly find the students under your teaching responsibility."
      stats={[
        { label: "Enrolled students", value: "148", detail: "across your courses" },
        { label: "Active cohorts", value: "4", detail: "programme groups" },
        { label: "At risk", value: "9", detail: "students need attention" },
      ]}
      actions={[
        {
          title: "Browse student list",
          description: "Filter students by module, level or programme.",
          href: "/dashboard/students",
          icon: Users2,
        },
        {
          title: "Monitor progress",
          description: "Identify students who need extra support or follow-up.",
          href: "/dashboard/icass",
          icon: BadgeCheck,
        },
      ]}
      checklist={[
        {
          title: "Module-based student views",
          description: "Students can be grouped by courses and modules that lecturers manage.",
        },
        {
          title: "Programme and level filtering",
          description: "Views can be narrowed to the exact cohort a lecturer is responsible for.",
        },
        {
          title: "Performance visibility",
          description: "Students can be reviewed alongside their assessments and attendance records.",
        },
      ]}
    />
  );
}
