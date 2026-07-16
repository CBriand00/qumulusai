"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. Uses the public anon key and is always subject to
 * Row Level Security. Never import the service role key into client code.
 *
 * Read result shapes are typed explicitly at call sites via `.single<T>()` /
 * `.returns<T>()`; see src/lib/database.types.ts for the model definitions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
