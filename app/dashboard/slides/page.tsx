import { FileText, UploadCloud } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function SlidesPage() {
  return (
    <LecturerSectionPage
      title="Lecture slides"
      description="Upload polished lesson decks so students can review them directly from the student app."
      summary="Keep every lecture resource organised, versioned and ready for students to access before and after class."
      stats={[
        { label: "Slides uploaded", value: "24", detail: "across active modules" },
        { label: "Pending review", value: "3", detail: "new decks awaiting release" },
        { label: "Student views", value: "1.4k", detail: "this month" },
      ]}
      actions={[
        {
          title: "Upload a new deck",
          description: "Add PDFs or presentation files for the next lecture.",
          href: "/dashboard/slides",
          icon: UploadCloud,
        },
        {
          title: "Review module materials",
          description: "Make sure the latest slides are published in the right order.",
          href: "/dashboard/modules",
          icon: FileText,
        },
      ]}
      checklist={[
        {
          title: "Shared student access",
          description: "Slides appear in the student app as soon as they are published.",
        },
        {
          title: "Structured lesson flow",
          description: "Lecturers can organise slides by week, topic or assessment milestone.",
        },
        {
          title: "Clear version control",
          description: "Students always see the latest approved version of each deck.",
        },
      ]}
    />
  );
}
