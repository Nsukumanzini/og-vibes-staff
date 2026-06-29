import { ClipboardCheck, FileUp } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function AssessmentsPage() {
  return (
    <LecturerSectionPage
      title="Assessments"
      description="Create submission spaces for assignments, review submissions and grade work with confidence."
      summary="Students can upload their work through the student app while lecturers manage rubrics, deadlines and marking in one place."
      stats={[
        { label: "Active tasks", value: "12", detail: "across your modules" },
        { label: "Awaiting review", value: "41", detail: "student submissions" },
        { label: "Average turnaround", value: "2d", detail: "to publish grades" },
      ]}
      actions={[
        {
          title: "Create an assignment",
          description: "Set instructions, due dates and grading criteria for students.",
          href: "/dashboard/assessments",
          icon: ClipboardCheck,
        },
        {
          title: "Collect submissions",
          description: "Receive uploaded assignments and keep everything organised by module.",
          href: "/dashboard/assessments",
          icon: FileUp,
        },
      ]}
      checklist={[
        {
          title: "Student submission portal",
          description: "Assignments appear in the student app with clear deadlines and upload steps.",
        },
        {
          title: "Structured grading",
          description: "Lecturers can mark submissions and share feedback directly to each student.",
        },
        {
          title: "Assessment scheduling",
          description: "Upcoming tasks can be planned and surfaced before students submit.",
        },
      ]}
    />
  );
}
