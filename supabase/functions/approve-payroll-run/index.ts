import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = "https://oomdaguzvdheotrkqdxs.supabase.co";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { "Content-Type": "application/json", ...CORS };

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { payroll_run_id, status, approved_by } = body;

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

    const now = new Date().toISOString();

    // Build the run update payload
    const runUpdate: Record<string, unknown> = { status };
    if (status === "approved") {
      runUpdate.approved_at = now;
      if (approved_by) runUpdate.approved_by = approved_by;
    }
    if (status === "paid") {
      runUpdate.paid_at = now;
    }

    // Update payroll_run
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

    // If marking as paid, also update all linked pay_stubs
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
        message:       status === "paid"
          ? `Payroll run marked as paid. ${stubsUpdated} pay stub(s) updated.`
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
