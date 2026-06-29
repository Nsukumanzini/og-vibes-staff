import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client. Use this inside Server Components, Server
 * Actions, and Route Handlers — never in Client Components (use
 * `lib/supabase/client.ts` there instead).
 *
 * Cookie writes work fine here in Route Handlers and Server Actions (e.g.
 * the sign-out handler at app/auth/sign-out/route.ts relies on this to
 * actually clear session cookies). The try/catch below exists only for
 * the Server Component render case, where Next.js forbids writing
 * cookies and throws — proxy.ts (middleware) handles token refresh for
 * that case instead, so silently ignoring the error there is safe.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes the
            // session instead, so this can be safely ignored here.
          }
        },
      },
    },
  );
}
