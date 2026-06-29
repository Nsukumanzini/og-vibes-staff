import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Calendar,
  GraduationCap,
  FileText,
  MonitorPlay,
  BellRing,
  BrainCircuit,
  MessageSquareText,
  Users,
  BadgeCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/slides", label: "Lecture Slides", icon: FileText },
  { href: "/dashboard/online-classes", label: "Online Classes", icon: MonitorPlay },
  { href: "/dashboard/modules", label: "My Modules", icon: BookOpen },
  { href: "/dashboard/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/dashboard/quizzes", label: "Quizzes", icon: BrainCircuit },
  { href: "/dashboard/icass", label: "ICASS", icon: BadgeCheck },
  { href: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
  { href: "/dashboard/students", label: "My Students", icon: Users },
  { href: "/dashboard/schedule", label: "Schedule", icon: Calendar },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border/70 px-6">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-sidebar-primary/20 bg-background/90 shadow-sm">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={40} height={40} className="object-cover" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight">OG Vibes <span className="text-sidebar-primary">Staff</span></p>
          <p className="text-xs text-sidebar-foreground/60">Lecturer portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {/*
          TODO (frontend): highlight the active nav item, e.g. via
          usePathname() from next/navigation. That requires either making
          this a Client Component or extracting each link into its own
          small Client Component — your call on which fits the rest of the
          dashboard's structure.
        */}
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-all",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60">
        Teaching management workspace
      </div>
    </aside>
  );
}
