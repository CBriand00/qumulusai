import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * SERVICE-ROLE client — bypasses Row Level Security.
 *
 * `server-only` guarantees this module can never be bundled into client code.
 * Use ONLY inside trusted server code (Route Handlers, Server Actions, cron)
 * for operations that legitimately require elevated access, e.g. writing audit
 * logs or admin-side reads. Prefer the RLS-bound server client everywhere else.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
