import { BookOpen, GraduationCap } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function ModulesPage() {
  return (
    <LecturerSectionPage
      title="My modules"
      description="Organise the modules you teach and prepare the teaching materials students will access from the app."
      summary="This space will become the main module management hub for curriculum, resources and teaching plans."
      stats={[
        { label: "Active modules", value: "6", detail: "currently assigned to you" },
        { label: "Teaching weeks", value: "12", detail: "in the current term" },
        { label: "Resources ready", value: "18", detail: "linked to your modules" },
      ]}
      actions={[
        {
          title: "Open module overview",
          description: "Review your teaching modules and current course status.",
          href: "/dashboard/modules",
          icon: BookOpen,
        },
        {
          title: "Prepare material",
          description: "Connect slides, assessments and online classes to each module.",
          href: "/dashboard/slides",
          icon: GraduationCap,
        },
      ]}
      checklist={[
        {
          title: "Module-based teaching",
          description: "Each module will group the content, assessments and communication students need.",
        },
        {
          title: "Future expansion",
          description: "This page is ready for full module CRUD and course management later.",
        },
      ]}
    />
  );
}
