import Image from "next/image";

import { LoginForm } from "@/components/dashboard/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on small screens, the form is what matters there. */}
      <div className="hidden flex-1 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div />
        <div className="max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-sidebar-primary/20 bg-background/80">
              <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={48} height={48} className="object-cover" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-sidebar-foreground">OG Vibes Staff</p>
              <p className="text-sm text-sidebar-foreground/70">Lecturer dashboard</p>
            </div>
          </div>
          <p className="text-2xl font-medium leading-snug">
            Track submissions, grade assignments, and keep every module on
            schedule — all in one place.
          </p>
          <p className="mt-4 text-sm text-sidebar-foreground/60">
            OG Vibes Staff Dashboard
          </p>
        </div>
        <div />
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <LoginForm />
      </div>
    </div>
  );
}
