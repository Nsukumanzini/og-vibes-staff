import { BrainCircuit, PencilRuler } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function QuizzesPage() {
  return (
    <LecturerSectionPage
      title="Quizzes"
      description="Create and manage formative assessments, timed tests and other quiz-based learning activities."
      summary="Support continuous learning by publishing quizzes that students can complete in the app and review immediately."
      stats={[
        { label: "Published quizzes", value: "9", detail: "ready for students" },
        { label: "Average score", value: "71%", detail: "class performance" },
        { label: "Upcoming", value: "2", detail: "scheduled this week" },
      ]}
      actions={[
        {
          title: "Create a new quiz",
          description: "Build a timed assessment with multiple-choice, short answer or mixed questions.",
          href: "/dashboard/quizzes",
          icon: PencilRuler,
        },
        {
          title: "Review performance",
          description: "See student results and identify where learners need extra support.",
          href: "/dashboard/quizzes",
          icon: BrainCircuit,
        },
      ]}
      checklist={[
        {
          title: "Student-facing quiz flow",
          description: "Students can access quizzes from the app and submit answers in real time.",
        },
        {
          title: "Auto-marking support",
          description: "Multiple-choice and short-form assessments can be evaluated quickly.",
        },
        {
          title: "Insightful reporting",
          description: "Results can guide revision, feedback and future lesson planning.",
        },
      ]}
    />
  );
}
