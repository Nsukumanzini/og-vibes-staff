"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [linkState, setLinkState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setLinkState(data.session ? "ready" : "invalid"); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === "PASSWORD_RECOVERY" || session)) setLinkState("ready");
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setBusy(false); return setError(updateError.message); }
    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return <div className="w-full max-w-md rounded-3xl border border-border/70 bg-background/95 p-7 shadow-xl">
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="h-6 w-6" /></div>
    <h1 className="mt-5 text-2xl font-bold tracking-tight">Choose a new password</h1>
    <p className="mt-2 text-sm text-muted-foreground">Create a secure password for your OG Vibes Staff account.</p>
    {linkState === "checking" ? <div className="mt-6 flex items-center gap-2 rounded-xl bg-muted p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Validating your reset link…</div> : linkState === "invalid" ? <div role="alert" className="mt-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">This reset link is invalid or has expired. Request a new link from the sign-in page.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block space-y-2"><span className="text-sm font-semibold">New password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><label className="block space-y-2"><span className="text-sm font-semibold">Confirm password</span><input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<Button className="h-11 w-full rounded-xl" disabled={busy}>{busy ? "Updating password…" : "Update password"}</Button></form>}
  </div>;
}
