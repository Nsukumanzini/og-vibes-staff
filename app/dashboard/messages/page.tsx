import { MessageSquareText, Users } from "lucide-react";

import { LecturerSectionPage } from "@/components/dashboard/lecturer-section-page";

export default function MessagesPage() {
  return (
    <LecturerSectionPage
      title="Messages"
      description="Communicate with students, peers and groups from one professional messaging experience."
      summary="Support quick conversations, course announcements and group discussions directly from the lecturer workspace."
      stats={[
        { label: "Active conversations", value: "23", detail: "across courses" },
        { label: "Group chats", value: "7", detail: "student communities" },
        { label: "Unread", value: "5", detail: "pending replies" },
      ]}
      actions={[
        {
          title: "Start a conversation",
          description: "Message a student, lecturer or a defined student group.",
          href: "/dashboard/messages",
          icon: MessageSquareText,
        },
        {
          title: "Create a group chat",
          description: "Set up a discussion space for modules, projects or cohorts.",
          href: "/dashboard/messages",
          icon: Users,
        },
      ]}
      checklist={[
        {
          title: "Student and lecturer messaging",
          description: "Lecturers can reach students directly or collaborate with colleagues.",
        },
        {
          title: "Group chats",
          description: "Courses and modules can be partitioned into dedicated discussion spaces.",
        },
        {
          title: "Conversation history",
          description: "Messaging stays organised so important discussions are easy to revisit.",
        },
      ]}
    />
  );
}
