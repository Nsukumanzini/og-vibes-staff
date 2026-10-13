"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const RESEND_LIMIT = 3;
const RESEND_COOLDOWN_SECONDS = 60;

export function LecturerEmailVerification() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  function verificationErrorMessage(message?: string) {
    const normalized = message?.toLowerCase() ?? "";
    if (normalized.includes("expired") || normalized.includes("invalid")) {
      return "This code has expired or was replaced. Send a new code, then use only the newest email.";
    }
    if (normalized.includes("rate") || normalized.includes("too many")) {
      return "Too many verification attempts. Wait a few minutes, then request one new code.";
    }
    return "That code could not be verified. Check all six digits and use the newest code sent to your email.";
  }

  function resendErrorMessage(message?: string) {
    const normalized = message?.toLowerCase() ?? "";
    if (normalized.includes("rate") || normalized.includes("too many")) {
      return "A code was requested too recently. Wait a minute and try again.";
    }
    return "We could not send a new code right now. Check your connection and try again.";
  }

  useEffect(() => {
    setEmail(window.sessionStorage.getItem("og-vibes-staff-verification-email")?.trim() ?? "");
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!email) return setError("Return to sign up and enter your email address again.");
    if (!/^\d{6}$/.test(code)) return setError("Enter the complete six-digit code.");

    setError(null);
    setNotice(null);
    setIsVerifying(true);
    const { data, error: verificationError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (verificationError || !data.user?.email_confirmed_at) {
      setError(verificationErrorMessage(verificationError?.message));
      if (verificationError?.message.toLowerCase().match(/expired|invalid/)) {
        setCooldown(0);
      }
      setCode("");
      setIsVerifying(false);
      return;
    }

    await supabase.auth.signOut();
    window.sessionStorage.removeItem("og-vibes-staff-verification-email");
    router.replace("/pending-approval?verified=1");
    router.refresh();
  }

  async function resendCode() {
    if (!email || isResending || cooldown > 0) return;
    if (resendAttempts >= RESEND_LIMIT) {
      setError("You have reached the resend limit. Please try again later.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (resendError) {
      setError(resendErrorMessage(resendError.message));
    } else {
      setCode("");
      setResendAttempts((current) => current + 1);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice("A new code was sent. Only the newest six-digit code will work.");
    }
    setIsResending(false);
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-background/95 p-6 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.35)] sm:p-8">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-sm">
          <Image src="/assets/logo.jpeg" alt="OG Vibes Staff logo" width={48} height={48} className="object-cover" />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight">OG Vibes Staff</p>
          <p className="text-sm text-muted-foreground">Secure email verification</p>
        </div>
      </div>

      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Enter the six-digit code sent to <strong className="font-semibold text-foreground">{email || "your email"}</strong>. No email link is required.
      </p>

      <form onSubmit={verifyCode} className="mt-7 space-y-5">
        <div>
          <label htmlFor="verification-code" className="text-sm font-medium text-foreground">Verification code</label>
          <div className="relative mt-2">
            <KeyRound aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="verification-code"
              name="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
                setNotice(null);
              }}
              className="h-14 w-full rounded-2xl border border-input bg-background pl-12 pr-4 text-center text-2xl font-bold tracking-[0.45em] outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="000000"
              aria-describedby="verification-help verification-error"
            />
          </div>
          <p id="verification-help" className="mt-2 text-xs text-muted-foreground">The code expires for your security. If you request another code, only the newest one will work. Check your spam folder if needed.</p>
        </div>

        {error && <div id="verification-error" role="alert" aria-live="polite" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {notice && <div role="status" aria-live="polite" className="rounded-xl bg-primary/10 p-3 text-sm text-primary">{notice}</div>}

        <Button type="submit" disabled={isVerifying || code.length !== 6 || !email} className="h-11 w-full gap-2 rounded-xl">
          {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {isVerifying ? "Verifying securely…" : "Verify email"}
        </Button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Button type="button" variant="ghost" disabled={isResending || cooldown > 0 || resendAttempts >= RESEND_LIMIT || !email} onClick={resendCode} className="gap-2">
          {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isResending ? "Sending…" : cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
        </Button>
        <Link href="/signup" onClick={() => window.sessionStorage.removeItem("og-vibes-staff-verification-email")} className="font-medium text-primary hover:text-primary/80">Use a different email</Link>
      </div>

      <p className="mt-6 border-t border-border/70 pt-4 text-center text-xs text-muted-foreground">Need help? Info@ogtechnologies.co.za</p>
    </div>
  );
}
