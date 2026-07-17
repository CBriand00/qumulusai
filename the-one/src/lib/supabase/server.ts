import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client bound to the request's cookies. Subject to RLS as the
 * signed-in user. Use in Server Components, Route Handlers, and Server Actions.
 *
 * Read result shapes are typed explicitly at call sites via `.single<T>()` /
 * `.returns<T>()`; see src/lib/database.types.ts for the model definitions.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Session refresh is handled by the middleware instead.
          }
        },
      },
    },
  );
}
