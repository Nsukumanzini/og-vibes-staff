import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatItem = {
  label: string;
  value: string;
  detail: string;
};

type ActionItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type ChecklistItem = {
  title: string;
  description: string;
};

export function LecturerSectionPage({
  title,
  description,
  summary,
  stats,
  actions,
  checklist,
}: {
  title: string;
  description: string;
  summary: string;
  stats: StatItem[];
  actions?: ActionItem[];
  checklist: ChecklistItem[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
            <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={24} height={24} className="rounded-full object-cover" />
            OG Vibes Staff
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Lecturer workspace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="success">Student-ready</Badge>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
          {summary}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {actions && actions.length > 0 ? null : null}

        <Card>
          <CardHeader>
            <CardTitle>What students will experience</CardTitle>
            <CardDescription>These are the pieces that flow into the student app.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.title} className="rounded-lg border border-border/70 bg-background/70 p-4">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
