import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Server-side sign-out. POST only (not GET) so this can't be triggered by
 * a stray <link> prefetch, crawler, or accidental navigation — signing out
 * is a state-changing action and deserves the same treatment as any other
 * mutation.
 *
 * Checks for a signed-in user first, per Supabase's documented pattern,
 * rather than blindly calling signOut() regardless of session state.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getUser();

  if (data.user) {
    await supabase.auth.signOut();
  }

  // Cookie clearing happens inside supabase.auth.signOut() via the
  // server client's setAll callback (see lib/supabase/server.ts), so by
  // the time we redirect, the Set-Cookie headers removing the session are
  // already attached to this response.
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
