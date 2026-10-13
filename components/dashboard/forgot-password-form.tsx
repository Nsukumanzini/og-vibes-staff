"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setBusy(false);
    if (resetError) return setError(resetError.message);
    setSent(true);
  }

  return <div className="w-full max-w-md rounded-3xl border border-border/70 bg-background/95 p-7 shadow-xl">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><MailCheck className="h-6 w-6" /></div>
    <h1 className="mt-5 text-2xl font-bold tracking-tight">Reset your password</h1>
    <p className="mt-2 text-sm text-muted-foreground">Enter your lecturer email. We will send a secure password-reset link if the account exists.</p>
    {sent ? <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Check your email and open the reset link. You can close this page afterwards.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block space-y-2"><span className="text-sm font-semibold">Email address</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="lecturer@college.ac.za" /></label>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button className="h-11 w-full rounded-xl" disabled={busy}>{busy ? "Sending reset link…" : "Send reset link"}</Button></form>}
    <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
  </div>;
}
