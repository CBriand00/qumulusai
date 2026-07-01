import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = "https://oomdaguzvdheotrkqdxs.supabase.co";
const ORG_ID = "00000000-0000-0000-0000-000000000001";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

function getRoleCategory(title: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("engineer") || t.includes("infra") || t.includes("gpu") || t.includes("data center") || t.includes("devops")) return "technical";
  if (t.includes("sales") || t.includes("account") || t.includes("revenue") || t.includes("business development")) return "sales";
  if (t.includes("product") || t.includes("design") || t.includes("ux")) return "product";
  if (t.includes("finance") || t.includes("cfo") || t.includes("accounting")) return "finance";
  if (t.includes("people") || t.includes("hr") || t.includes("talent") || t.includes("recruit")) return "people";
  if (t.includes("vp") || t.includes("director") || t.includes("chief") || t.includes("ceo")) return "executive";
  return "general";
}

function defaultSections(roleTitle: string) {
  return [
    {
      id: "s1", title: "Role Fit", description: "Tell us about your relevant experience.",
      questions: [
        { id: "q1", type: "text", text: `What draws you to the ${roleTitle} role at QumulusAI?` },
        { id: "q2", type: "text", text: "Describe your most relevant experience for this role." },
        { id: "q3", type: "rating", text: "How ready do you feel for this role? (1 = not ready, 5 = fully ready)", scale: 5 },
      ],
    },
    {
      id: "s2", title: "Problem Solving", description: "Walk us through how you approach challenges.",
      questions: [
        { id: "q4", type: "text", text: "Describe a significant challenge you solved. What was your approach and the measurable outcome?" },
        { id: "q5", type: "multiple_choice", text: "When facing an ambiguous problem, what's your first instinct?", options: ["Gather more data before acting", "Prototype quickly and iterate", "Align stakeholders first", "Define the problem precisely"] },
      ],
    },
    {
      id: "s3", title: "Culture & Values", description: "We build fast and care deeply about our people.",
      questions: [
        { id: "q6", type: "multiple_choice", text: "Which environment brings out your best work?", options: ["Fast-moving, ambiguous startup", "Structured with clear processes", "Highly collaborative team", "Independent with strong autonomy"] },
        { id: "q7", type: "text", text: "QumulusAI's mission is to universalize access to AI compute. What does that mean to you personally?" },
      ],
    },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    // ── 1. Parse body ─────────────────────────────────────────────────────────
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch (_e) {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { application_id, candidate_name, candidate_email, role_title, department } = body;

    // Return received fields in error so caller can see exactly what arrived
    if (!application_id) return json({ error: "Missing required field: application_id", received: Object.keys(body) }, 400);
    if (!candidate_email) return json({ error: "Missing required field: candidate_email", received: Object.keys(body) }, 400);

    const resolvedName = candidate_name || "Candidate";
    const resolvedRole = role_title || "Open Role";
    const roleCategory = getRoleCategory(resolvedRole);

    // ── 2. Generate questions via ai-query ────────────────────────────────────
    let sections = defaultSections(resolvedRole);
    let timeLimitMinutes = 30;

    try {
      const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          system: `You are an expert talent assessor for QumulusAI (bare-metal GPU cloud, Atlanta GA, scaling to 300+ employees). Return ONLY valid JSON — no markdown, no code fences, no commentary.`,
          messages: [{
            role: "user",
            content: `Create a candidate assessment for the ${resolvedRole} role (${roleCategory} category, department: ${department || "General"}).
Candidate: ${resolvedName}

Return ONLY this JSON (no markdown, no code blocks):
{"sections":[{"id":"s1","title":"Role Fit","description":"Brief description","questions":[{"id":"q1","type":"text","text":"Question?"},{"id":"q2","type":"multiple_choice","text":"Question?","options":["A","B","C","D"]},{"id":"q3","type":"rating","text":"Rate X (1–5)","scale":5}]},{"id":"s2","title":"Core Skills","description":"","questions":[{"id":"q4","type":"text","text":"Question?"},{"id":"q5","type":"multiple_choice","text":"Question?","options":["A","B","C","D"]}]},{"id":"s3","title":"Culture & Values","description":"","questions":[{"id":"q6","type":"multiple_choice","text":"Question?","options":["A","B","C","D"]},{"id":"q7","type":"text","text":"Question?"}]}],"time_limit_minutes":30}

3 sections, 2–3 questions each, mix of text/multiple_choice/rating, tailored for ${roleCategory} at a GPU cloud company.`,
          }],
          max_tokens: 1800,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const raw: string = aiData?.content?.[0]?.text ?? "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed?.sections) && parsed.sections.length > 0) {
          sections = parsed.sections;
          if (parsed.time_limit_minutes) timeLimitMinutes = parsed.time_limit_minutes;
        }
      }
    } catch (_aiErr) {
      // Fall through to default sections — already set above
    }

    // ── 3. Insert into candidate_assessments via REST API ─────────────────────
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_assessments`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        organization_id: ORG_ID,
        application_id,
        candidate_name: resolvedName,
        candidate_email,
        role_title: resolvedRole,
        sections,
        time_limit_minutes: timeLimitMinutes,
        status: "pending",
        sent_at: new Date().toISOString(),
      }),
    });

    const insertText = await insertRes.text();
    if (!insertRes.ok) {
      return json({ error: `DB insert failed (${insertRes.status})`, detail: insertText }, 500);
    }

    let assessment: Record<string, string> = {};
    try {
      const rows = JSON.parse(insertText);
      assessment = Array.isArray(rows) ? rows[0] : rows;
    } catch (_e) {
      return json({ error: "Could not parse insert response", raw: insertText }, 500);
    }

    const assessToken = assessment.token;
    const assessmentId = assessment.id;
    const assessUrl = `https://qumulusai.com?assess=${assessToken}`;

    // ── 4. Send assessment email ───────────────────────────────────────────────
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-offer-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          to: candidate_email,
          candidateName: resolvedName,
          subject: `Your QumulusAI Skills Assessment — ${resolvedRole}`,
          body: `Hi ${resolvedName},\n\nThank you for applying to the ${resolvedRole} role at QumulusAI!\n\nWe'd love to learn more about you through a short skills assessment (~${timeLimitMinutes} minutes). Please complete it at your earliest convenience:\n\n${assessUrl}\n\nThis link is unique to you and expires in 7 days.\n\nBest,\nQumulusAI Recruiting Team`,
          signedUrl: assessUrl,
        }),
      });
    } catch (_emailErr) {
      // Email failure doesn't block success — assessment was created
    }

    // ── 5. Insert HR alert ────────────────────────────────────────────────────
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/hr_alerts`, {
        method: "POST",
        headers: {
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: ORG_ID,
          type: "assessment_sent",
          title: `Assessment sent — ${resolvedName}`,
          body: `${resolvedRole} candidate received an assessment link.`,
          link_label: "View candidate",
          link_data: { application_id, candidate_name: resolvedName },
        }),
      });
    } catch (_alertErr) {
      // Non-critical
    }

    return json({ success: true, assessmentId, token: assessToken, assessUrl });
  } catch (err) {
    return json({
      error: "Unhandled exception",
      message: (err as Error).message,
      stack: (err as Error).stack,
    }, 500);
  }
});
