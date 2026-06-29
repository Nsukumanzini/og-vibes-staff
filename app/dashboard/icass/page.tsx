import { BookMarked, GraduationCap } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function ICassPage() {
  return (
    <LecturerSectionPage
      title="ICASS"
      description="Upload and manage continuous assessment marks for students in a clear, structured format."
      summary="Track student progress with transparent ICASS entries that are easy to review and share with learners."
      stats={[
        { label: "Modules linked", value: "5", detail: "active ICASS entries" },
        { label: "Marked entries", value: "312", detail: "submitted this term" },
        { label: "Pending", value: "18", detail: "still awaiting upload" },
      ]}
      actions={[
        {
          title: "Upload ICASS marks",
          description: "Add student results for the latest assessment cycle.",
          href: "/dashboard/icass",
          icon: BookMarked,
        },
        {
          title: "Review performance",
          description: "Compare marks across students and modules for reporting purposes.",
          href: "/dashboard/icass",
          icon: GraduationCap,
        },
      ]}
      checklist={[
        {
          title: "Student mark visibility",
          description: "Accepted ICASS marks can be made visible to students in the app.",
        },
        {
          title: "Bulk upload support",
          description: "Lecturers can upload class results in a consistent format for each module.",
        },
        {
          title: "Progress tracking",
          description: "Marks can be reviewed over time to support intervention and feedback.",
        },
      ]}
    />
  );
}
