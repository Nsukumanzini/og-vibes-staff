import Image from "next/image";

import { LecturerSignupForm } from "@/components/dashboard/lecturer-signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(135deg,_#f8fbff_0%,_#f4f7fb_100%)]">
      <div className="hidden flex-1 flex-col justify-between p-10 text-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-background/90 shadow-sm">
            <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={48} height={48} className="object-cover" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">OG Vibes Staff</p>
            <p className="text-sm text-muted-foreground">Lecturer onboarding</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Welcome to the staff portal
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Create your lecturer account and start managing teaching with confidence.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Publish course content, manage assessments, stay connected with students, and organise your teaching calendar from one professional workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground shadow-sm">
          Secure onboarding for academic staff • Built for modern teaching workflows
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <LecturerSignupForm />
      </div>
    </div>
  );
}
