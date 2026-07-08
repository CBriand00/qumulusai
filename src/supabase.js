import { createClient } from "@supabase/supabase-js";

// Supabase connection is per-deployment: each company gets its OWN Supabase
// project, so the URL + anon key come from build-time env vars (Vite exposes
// vars prefixed with VITE_ on import.meta.env). See .env.example and SETUP.md.
//
// These are set in .env.local for local dev and in the hosting provider's
// environment settings (e.g. Vercel Project → Settings → Environment Variables)
// for production. The anon key is safe to ship in the bundle — it is protected
// by Row-Level Security (see supabase/migrations/*_enable_rls_security.sql).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail loudly rather than silently connecting to the wrong (or no) project —
// this prevents a new tenant that forgot to set env vars from writing into
// another company's database.
if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
    "(copy .env.example to .env.local for local dev, or set them in your host's " +
    "environment settings). See SETUP.md."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,  // Silently refreshes the JWT before expiry
    persistSession:   true,  // Writes session to localStorage
    detectSessionInUrl: true, // Picks up #access_token from password-reset links
  },
});
