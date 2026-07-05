import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { employeeId, email } = await req.json();
    if (!email && !employeeId) {
      return json({ error: "email or employeeId is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve the auth user id — first via the profiles table, then via the auth list.
    let userId: string | null = null;
    let resolvedEmail: string | null = email || null;

    if (email) {
      const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = prof?.id || null;
    }
    if (!userId && employeeId) {
      const { data: emp } = await admin.from("employees").select("email").eq("id", employeeId).maybeSingle();
      if (emp?.email) {
        resolvedEmail = emp.email;
        const { data: prof } = await admin.from("profiles").select("id").eq("email", emp.email).maybeSingle();
        userId = prof?.id || null;
      }
    }
    // Fallback: scan the auth user list by email.
    if (!userId && resolvedEmail) {
      const { data: list } = await admin.auth.admin.listUsers();
      const u = list?.users?.find((u) => u.email?.toLowerCase() === resolvedEmail!.toLowerCase());
      userId = u?.id || null;
    }

    if (!userId) {
      return json({ success: true, disabled: false, note: "No login account found for this employee." });
    }

    // Ban the account for ~100 years — blocks sign-in and token refresh.
    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
      user_metadata: { role: "terminated", access_revoked_at: new Date().toISOString() },
    });
    if (banErr) return json({ error: banErr.message }, 400);

    // Mark the profile so RLS/role checks treat them as terminated.
    await admin.from("profiles").update({ role: "terminated" }).eq("id", userId);

    return json({ success: true, disabled: true, userId });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
