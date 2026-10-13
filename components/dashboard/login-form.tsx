"use client";

import Image from "next/image";
import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.code === "email_not_confirmed") {
        window.sessionStorage.setItem("og-vibes-staff-verification-email", email.trim());
        router.replace("/verify-email");
        router.refresh();
        return;
      }
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.user) {
      setError("Unable to sign in right now. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setIsSubmitting(false);
      return;
    }

    if (profileData?.role === "pending_lecturer") {
      router.push("/pending-approval");
      router.refresh();
      return;
    }

    if (!profileData || !["lecturer", "admin"].includes(profileData.role)) {
      await supabase.auth.signOut();
      setError("This portal is restricted to approved OG Vibes staff accounts.");
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-background/90 shadow-sm">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={40} height={40} className="object-cover" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">OG Vibes Staff</p>
          <p className="text-sm text-muted-foreground">Lecturer portal</p>
        </div>
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Sign in to your dashboard
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use the email and password from your approved lecturer account.
      </p>

      <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        New lecturer? <Link href="/signup" className="font-medium text-primary hover:text-primary/80">Create an account</Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@university.ac.za"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={passwordId} className="text-sm font-medium text-foreground">Password</label>
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:text-primary/80">Forgot password?</Link>
          </div>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••••"
          />
        </div>

        {/*
          role="alert" + aria-live ensures screen reader users actually
          hear the error — without this, the text appears visually but
          assistive tech gives no indication anything changed.
        */}
        <div role="alert" aria-live="polite">
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-1 h-10">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
