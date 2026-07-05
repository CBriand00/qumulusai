import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// Roles allowed to approve or mark payroll as paid.
const APPROVER_ROLES = ["executive", "ceo", "chro", "admin"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { "Content-Type": "application/json", ...CORS };

async function dbGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json();
}

async function dbPatch(table: string, query: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// Resolve the calling user from their JWT.
async function getCaller(req: Request): Promise<{ id: string; role: string; name: string } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY!, Authorization: auth },
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.id) return null;
  const profs = await dbGet(`profiles?id=eq.${user.id}&select=id,role,full_name`);
  const prof = Array.isArray(profs) ? profs[0] : null;
  return { id: user.id, role: prof?.role || "unknown", name: prof?.full_name || user.email || "Unknown" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { payroll_run_id, status } = body;

    if (!payroll_run_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: payroll_run_id, status" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const allowedStatuses = ["review", "approved", "paid"];
    if (!allowedStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    // Enforce the approval chain: approving or paying requires an executive role.
    const caller = await getCaller(req);
    if (status === "approved" || status === "paid") {
      if (!caller) {
        return new Response(
          JSON.stringify({ error: "Could not verify your identity. Sign in again and retry." }),
          { status: 401, headers: JSON_HEADERS },
        );
      }
      if (!APPROVER_ROLES.includes(caller.role)) {
        return new Response(
          JSON.stringify({ error: `Only an executive can ${status === "paid" ? "mark payroll as paid" : "approve payroll"}. Your role: ${caller.role}.` }),
          { status: 403, headers: JSON_HEADERS },
        );
      }
    }

    const now = new Date().toISOString();

    const runUpdate: Record<string, unknown> = { status };
    if (status === "approved") {
      runUpdate.approved_at = now;
      runUpdate.approved_by = caller!.id;
    }
    if (status === "paid") {
      runUpdate.paid_at = now;
    }

    const runResult = await dbPatch(
      "payroll_runs",
      `id=eq.${payroll_run_id}`,
      runUpdate,
    );

    if (!runResult.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to update payroll_run", details: runResult.data }),
        { status: 500, headers: JSON_HEADERS },
      );
    }

    const updatedRun = Array.isArray(runResult.data) ? runResult.data[0] : runResult.data;

    let stubsUpdated = 0;
    if (status === "paid") {
      const stubResult = await dbPatch(
        "pay_stubs",
        `payroll_run_id=eq.${payroll_run_id}`,
        { status: "paid" },
      );
      if (!stubResult.ok) {
        return new Response(
          JSON.stringify({
            error: "payroll_run updated to paid but pay_stubs update failed",
            run: updatedRun,
            stubs_error: stubResult.data,
          }),
          { status: 500, headers: JSON_HEADERS },
        );
      }
      stubsUpdated = Array.isArray(stubResult.data) ? stubResult.data.length : 0;
    }

    return new Response(
      JSON.stringify({
        success:       true,
        payroll_run:   updatedRun,
        stubs_updated: stubsUpdated,
        approver:      caller ? { id: caller.id, name: caller.name } : null,
        message:       status === "paid"
          ? `Payroll run marked as paid by ${caller!.name}. ${stubsUpdated} pay stub(s) updated.`
          : status === "approved"
          ? `Payroll approved by ${caller!.name}.`
          : `Payroll run status updated to '${status}'.`,
      }),
      { headers: JSON_HEADERS },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, stack: (err as Error).stack }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
});
