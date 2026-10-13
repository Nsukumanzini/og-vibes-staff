"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, BellRing, BookOpen, BrainCircuit, CalendarCheck2, ClipboardCheck, FileText, LayoutDashboard, MessageSquareText, MessagesSquare, MonitorPlay, MoreHorizontal, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/alerts", label: "Announcements", icon: BellRing },
  { href: "/dashboard/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck2 },
  { href: "/dashboard/icass", label: "ICASS", icon: BadgeCheck },
  { href: "/dashboard/slides", label: "Academic Library", icon: FileText },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
  { href: "/dashboard/group-chats", label: "Class Groups", icon: MessagesSquare },
  { href: "/dashboard/modules", label: "My Modules", icon: BookOpen },
  { href: "/dashboard/online-classes", label: "Live Classes", icon: MonitorPlay },
  { href: "/dashboard/quizzes", label: "Quizzes", icon: BrainCircuit },
  { href: "/dashboard/students", label: "Students", icon: Users },
] as const;

const MOBILE_PRIMARY_ITEMS = [
  "/dashboard",
  "/dashboard/slides",
  "/dashboard/assessments",
  "/dashboard/messages",
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href:string) => href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  return <>
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#07152f_0%,#0b2552_58%,#08203f_100%)] text-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><div className="overflow-hidden rounded-2xl border border-white/15 bg-white p-1 shadow-lg"><Image src="/assets/logo.jpeg" alt="OG Vibes" width={38} height={38} className="rounded-xl object-cover"/></div><div><p className="text-base font-black tracking-tight">OG Vibes <span className="text-cyan-300">Staff</span></p><p className="text-[11px] text-blue-100/60">Academic operations</p></div></div>
      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4">{NAV_ITEMS.map(item=><Link key={item.href} href={item.href} aria-current={isActive(item.href)?"page":undefined} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-blue-50/70 transition",isActive(item.href)?"bg-white text-blue-950 shadow-lg":"hover:bg-white/10 hover:text-white")}><span className={cn("rounded-lg p-1.5 transition",isActive(item.href)?"bg-blue-100 text-blue-700":"bg-white/[.06] text-cyan-200 group-hover:bg-white/10")}><item.icon className="h-4 w-4"/></span>{item.label}</Link>)}</nav>
      <div className="border-t border-white/10 px-6 py-4 text-[11px] text-blue-100/50">OG Technologies · Secure staff access</div>
    </aside>
    <nav aria-label="Mobile dashboard navigation" className="fixed inset-x-3 z-50 flex items-stretch justify-between gap-1 rounded-2xl border border-white/30 bg-slate-950/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl lg:hidden" style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      {NAV_ITEMS.filter((item) => MOBILE_PRIMARY_ITEMS.includes(item.href)).map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-bold text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300", isActive(item.href) && "bg-white text-blue-950")}>
        <item.icon className="h-5 w-5" aria-hidden="true"/><span className="truncate">{item.label === "Academic Library" ? "Library" : item.label === "Assessments" ? "Assess" : item.label}</span>
      </Link>)}
      <details className="relative min-w-0 flex-1">
        <summary aria-label="More dashboard pages" className="flex h-full cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-bold text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-5 w-5" aria-hidden="true"/><span>More</span>
        </summary>
        <div className="absolute bottom-[calc(100%+0.75rem)] right-0 grid max-h-[min(65dvh,30rem)] w-[min(92vw,24rem)] grid-cols-2 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl">
          {NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_ITEMS.includes(item.href)).map((item) => <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={cn("flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500", isActive(item.href) ? "bg-blue-50 text-blue-800" : "hover:bg-slate-50")}>
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true"/><span>{item.label}</span>
          </Link>)}
        </div>
      </details>
    </nav>
  </>;
}
