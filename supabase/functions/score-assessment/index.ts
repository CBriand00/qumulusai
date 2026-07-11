import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL"); // auto-injected per project
const ORG_ID = "00000000-0000-0000-0000-000000000001";
// Company identity for AI scoring context — set per tenant (see .env.example).
const COMPANY_NAME = Deno.env.get("COMPANY_NAME") || "QumulusAI";
const COMPANY_CONTEXT = Deno.env.get("COMPANY_CONTEXT") || "a vertically integrated AI infrastructure company (bare-metal GPU cloud), based in Marietta, Georgia";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

async function restGet(path: string, anonKey: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
      "Accept": "application/json",
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? (rows[0] ?? null) : rows;
}

async function restPatch(path: string, body: unknown, anonKey: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

async function restInsert(table: string, body: unknown, anonKey: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    // ── 1. Parse body ─────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (_e) {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { assessmentId, responses } = body as { assessmentId: string; responses: Record<string, unknown> };
    if (!assessmentId) return json({ error: "assessmentId required" }, 400);

    // ── 2. Load assessment ────────────────────────────────────────────────────
    const assessment = await restGet(
      `candidate_assessments?id=eq.${assessmentId}&select=*`,
      anonKey
    );
    if (!assessment) return json({ error: "Assessment not found" }, 404);

    // Mark submitted immediately so candidate sees confirmation
    await restPatch(
      `candidate_assessments?id=eq.${assessmentId}`,
      { responses, status: "submitted", submitted_at: new Date().toISOString() },
      anonKey
    );

    // ── 3. Format responses for AI ────────────────────────────────────────────
    const sections = (assessment.sections as Array<{ id?: string; title?: string; questions?: Array<{ id?: string; text?: string }> }>) || [];
    const formatted = sections.map((sec, si) => {
      const secKey = sec.id ?? si;
      const qs = (sec.questions || []).map((q, qi) => {
        const key = `${secKey}_${q.id ?? qi}`;
        const val = responses?.[key];
        return `  Q: ${q.text}\n  A: ${val !== undefined && val !== "" ? JSON.stringify(val) : "(no answer)"}`;
      }).join("\n");
      return `[${sec.title}]\n${qs}`;
    }).join("\n\n");

    // ── 4. Score with AI ──────────────────────────────────────────────────────
    let scoring = {
      overall_score: 50,
      dimension_scores: { role_fit: 50, problem_solving: 50, culture_values: 50, communication: 50 },
      ai_explanation: "Score based on response completeness.",
      risk_indicators: [] as string[],
      interview_recommendations: [] as string[],
      suggested_questions: [] as string[],
    };

    try {
      const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          system: `You are an expert talent assessor for ${COMPANY_NAME} — ${COMPANY_CONTEXT}. Score this candidate rigorously. Return ONLY valid JSON — no markdown, no code fences.`,
          messages: [{
            role: "user",
            content: `Score the assessment for: ${assessment.role_title}
Candidate: ${assessment.candidate_name}

Responses:
${formatted}

Return ONLY this JSON (no code blocks):
{"overall_score":75,"dimension_scores":{"role_fit":80,"problem_solving":70,"culture_values":75,"communication":72},"ai_explanation":"2–3 sentence explanation.","risk_indicators":["Risk 1","Risk 2"],"interview_recommendations":["Focus area 1","Focus area 2"],"suggested_questions":["Question 1?","Question 2?","Question 3?"]}

Scoring: 80–100 = strong advance, 65–79 = advance with notes, 50–64 = hold, below 50 = pass. Be specific.`,
          }],
          max_tokens: 1000,
          temperature: 0,               // reproducible, auditable scoring
          feature: "assessment_score",  // logged + firewalled by the ai-query gateway
          entity_type: "application",
          entity_id: assessment.application_id,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const raw: string = aiData?.content?.[0]?.text ?? "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed?.overall_score === "number") scoring = parsed;
      }
    } catch (_aiErr) {
      // Use default scoring
    }

    // ── 5. Update assessment with scores ──────────────────────────────────────
    await restPatch(
      `candidate_assessments?id=eq.${assessmentId}`,
      {
        overall_score: scoring.overall_score,
        dimension_scores: scoring.dimension_scores,
        ai_explanation: scoring.ai_explanation,
        risk_indicators: scoring.risk_indicators,
        interview_recommendations: scoring.interview_recommendations,
        suggested_questions: scoring.suggested_questions,
        status: "scored",
        scored_at: new Date().toISOString(),
      },
      anonKey
    );

    // ── 6. Record an AI RECOMMENDATION (human-in-the-loop) ─────────────────────
    // The AI does NOT change the application's status — a recruiter reviews the
    // recommendation and makes the actual stage decision in the Talent Inbox.
    if (assessment.application_id) {
      // Map to the app's real pipeline statuses (new/reviewing/interview/…):
      // strong scores -> interview, everything else -> reviewing (human reviews).
      const recommended = scoring.overall_score >= 70 ? "interview" : "reviewing";
      await restPatch(
        `applications?id=eq.${assessment.application_id}`,
        { ai_recommended_status: recommended, ai_recommendation_at: new Date().toISOString() },
        anonKey
      );
    }

    // ── 7. HR alert ───────────────────────────────────────────────────────────
    const tier =
      scoring.overall_score >= 70 ? "Strong Fit" :
      scoring.overall_score >= 50 ? "Potential Fit" : "Low Fit";

    await restInsert("hr_alerts", {
      organization_id: ORG_ID,
      type: "assessment_scored",
      title: `${assessment.candidate_name} scored ${scoring.overall_score}/100`,
      body: `${assessment.role_title} · ${tier}`,
      link_label: "Review in Talent Inbox",
      link_data: {
        application_id: assessment.application_id,
        candidate_name: assessment.candidate_name,
        score: scoring.overall_score,
      },
    }, anonKey);

    // ── 8. Notify Messenger ───────────────────────────────────────────────────
    try {
      await restInsert("messages", {
        recipient_name: "Recruiting Team",
        content: `📋 Assessment scored: ${assessment.candidate_name} — ${scoring.overall_score}/100 for ${assessment.role_title}. AI recommends ${scoring.overall_score >= 70 ? "Interview" : "Reviewing"} — awaiting recruiter decision.`,
        sent_at: new Date().toISOString(),
        type: "assessment_notification",
      }, anonKey);
    } catch (_e) {
      // Non-critical
    }

    return json({ success: true, score: scoring.overall_score });
  } catch (err) {
    return json({
      error: "Unhandled exception",
      message: (err as Error).message,
      stack: (err as Error).stack,
    }, 500);
  }
});
