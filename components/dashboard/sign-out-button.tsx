"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Signs out via the server-side /auth/sign-out Route Handler rather than
 * calling supabase.auth.signOut() directly in the browser. This way cookie
 * clearing happens once, authoritatively, in the server response — see
 * app/auth/sign-out/route.ts for where that actually happens.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await fetch("/auth/sign-out", { method: "POST" });
    } finally {
      // Full navigation (not router.push) so every client-side cache and
      // any in-memory Supabase state is thrown away along with the page —
      // there should be nothing left over from the signed-in session.
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSignOut}
      disabled={isSigningOut}
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
