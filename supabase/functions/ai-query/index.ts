import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// ─── Centralized AI configuration ────────────────────────────────────────────
// One source of truth for the model and defaults, so every AI capability in the
// product is governed here rather than hardcoded across a dozen call sites.
// Decision-grade features (scoring, evaluation) should pass a low temperature
// for reproducibility; if a caller omits temperature we preserve prior behavior
// by not sending one (provider default).
const AI_CONFIG = {
  model: "claude-sonnet-4-6",
  maxTokensDefault: 1000,
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Decode the caller's user id from the JWT (no verification needed — the gateway
// already authenticated it; this is only for attribution in the audit log).
function actorFromAuth(req: Request): string | null {
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return json.sub || null;
  } catch {
    return null;
  }
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Protected-attribute firewall ────────────────────────────────────────────
// For decision-grade features (evaluation / scoring), scrub protected-class
// markers and sensitive PII from the prompt BEFORE the model sees them, so an
// employment decision can't be influenced by (or leak) that data. This is
// defense-in-depth — the primary control is simply never querying self-ID into
// an evaluation prompt.
const DECISION_FEATURES = new Set(["candidate_eval", "assessment_score", "interview_debrief"]);

const REDACTIONS: Array<[RegExp, string]> = [
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]"],                       // SSN
  [/\b\d{13,19}\b/g, "[REDACTED-NUM]"],                              // card / account numbers
  // Protected-class attributes stated as "field: value"
  [/\b(race|ethnicity|gender|sex|disability|disabled|veteran|pregnan\w*|religion|national origin|date of birth|dob|marital status|age)\b\s*[:=]\s*\S[^\n]*/gi, "[REDACTED-PROTECTED]"],
];

function firewall(messages: Array<{ role: string; content: unknown }>, feature: string) {
  if (!DECISION_FEATURES.has(feature)) return { messages, count: 0 };
  let count = 0;
  const scrub = (text: string) => {
    let t = text;
    for (const [re, repl] of REDACTIONS) {
      t = t.replace(re, () => { count++; return repl; });
    }
    return t;
  };
  const out = messages.map((m) =>
    typeof m.content === "string" ? { ...m, content: scrub(m.content) } : m
  );
  return { messages: out, count };
}

// Best-effort write to the audit log. Never throws — logging must not break a
// user-facing AI call.
async function logAudit(row: Record<string, unknown>) {
  if (!SUPABASE_URL || !SERVICE_ROLE) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_audit_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch (_) {
    // swallow — audit logging is best-effort
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const started = Date.now();
  let feature = "general";
  let promptVersion: string | null = null;
  let temperature: number | undefined;
  let maxTokens = AI_CONFIG.maxTokensDefault;
  let entityType: string | null = null;
  let entityId: string | null = null;
  const actor = actorFromAuth(req);

  try {
    const body = await req.json();
    const { system, messages } = body;
    feature = body.feature || "general";
    promptVersion = body.prompt_version || null;
    temperature = typeof body.temperature === "number" ? body.temperature : undefined;
    maxTokens = body.max_tokens || AI_CONFIG.maxTokensDefault;
    entityType = body.entity_type || null;
    entityId = body.entity_id || null;

    if (!messages) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // Firewall: strip protected-class / PII spans from decision-grade prompts.
    const { messages: safeMessages, count: redactions } = firewall(messages, feature);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        max_tokens: maxTokens,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(system ? { system } : {}),
        messages: safeMessages,
      }),
    });

    const data = await res.json();
    const inputStr = (system ? system + "\n" : "") + JSON.stringify(safeMessages);

    if (!res.ok) {
      await logAudit({
        actor_id: actor, feature, model: AI_CONFIG.model, prompt_version: promptVersion,
        temperature, max_tokens: maxTokens,
        input_hash: await sha256(inputStr), input_chars: inputStr.length,
        latency_ms: Date.now() - started, redactions, status: "error",
        error: typeof data?.error === "string" ? data.error : JSON.stringify(data?.error || data),
        entity_type: entityType, entity_id: entityId,
      });
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    const outText = Array.isArray(data?.content)
      ? data.content.map((b: { text?: string }) => b.text || "").join("")
      : "";

    await logAudit({
      actor_id: actor, feature, model: AI_CONFIG.model, model_version: data?.model || null,
      prompt_version: promptVersion, temperature, max_tokens: maxTokens,
      input_hash: await sha256(inputStr), input_chars: inputStr.length,
      output_preview: outText.slice(0, 2000), output_chars: outText.length,
      input_tokens: data?.usage?.input_tokens ?? null,
      output_tokens: data?.usage?.output_tokens ?? null,
      latency_ms: Date.now() - started, redactions, status: "ok",
      entity_type: entityType, entity_id: entityId,
    });

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (error) {
    await logAudit({
      actor_id: actor, feature, model: AI_CONFIG.model, prompt_version: promptVersion,
      temperature, max_tokens: maxTokens, latency_ms: Date.now() - started,
      status: "error", error: (error as Error).message,
      entity_type: entityType, entity_id: entityId,
    });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
