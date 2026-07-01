import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

function getRoleCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("engineer") || t.includes("infra") || t.includes("gpu") || t.includes("data center") || t.includes("devops")) return "technical";
  if (t.includes("sales") || t.includes("account") || t.includes("revenue") || t.includes("business development")) return "sales";
  if (t.includes("product") || t.includes("design") || t.includes("ux")) return "product";
  if (t.includes("finance") || t.includes("cfo") || t.includes("accounting") || t.includes("controller")) return "finance";
  if (t.includes("people") || t.includes("hr") || t.includes("talent") || t.includes("recruiting") || t.includes("chro")) return "people";
  if (t.includes("vp") || t.includes("director") || t.includes("chief") || t.includes("president") || t.includes("ceo")) return "executive";
  return "general";
}

const DEFAULT_SECTIONS = (roleTitle: string) => [
  {
    id: "s1", title: "Role Fit", description: "Tell us about your relevant experience.",
    questions: [
      { id: "q1", type: "text", text: `What draws you to the ${roleTitle} role at QumulusAI?` },
      { id: "q2", type: "text", text: "Describe your most relevant experience for this role in detail." },
      { id: "q3", type: "rating", text: "How would you rate your overall readiness for this specific role? (1 = not ready, 5 = very ready)", scale: 5 },
    ]
  },
  {
    id: "s2", title: "Problem Solving & Impact", description: "Walk us through how you approach challenges.",
    questions: [
      { id: "q4", type: "text", text: "Describe a significant challenge you solved in your career. What was your approach and what was the measurable outcome?" },
      { id: "q5", type: "multiple_choice", text: "When facing an ambiguous problem, what's your first instinct?", options: ["Gather more data before acting", "Prototype quickly and iterate", "Align stakeholders first", "Define the problem precisely before anything else"] },
    ]
  },
  {
    id: "s3", title: "Culture & Values", description: "We build fast and care deeply about our people.",
    questions: [
      { id: "q6", type: "multiple_choice", text: "Which work environment brings out your best?", options: ["Fast-moving, ambiguous startup", "Structured with clear processes", "Highly collaborative team", "Independent with strong autonomy"] },
      { id: "q7", type: "text", text: "QumulusAI's mission is to universalize access to AI compute. What does that mean to you personally, and why does it matter?" },
    ]
  }
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { applicationId } = await req.json();
    if (!applicationId) return json({ error: "applicationId required" }, 400);

    const { data: app } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();
    if (!app) return json({ error: "Application not found" }, 404);

    const roleCategory = getRoleCategory(app.role_title || "");

    // Generate questions via AI
    let assessmentData: { sections: unknown[]; time_limit_minutes: number } = {
      sections: DEFAULT_SECTIONS(app.role_title || "this role"),
      time_limit_minutes: 30,
    };

    try {
      const aiRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({
          system: `You are an expert talent assessor for QumulusAI, a vertically integrated AI infrastructure company (bare-metal GPU cloud, Atlanta GA, scaling from 43 to 300+ employees, $500M financing, CEO Mike Maniscalco). Return ONLY valid JSON — no markdown, no commentary.`,
          messages: [{
            role: "user",
            content: `Create a structured candidate assessment for: ${app.role_title} (${roleCategory} category)
Candidate name: ${app.full_name}
Cover letter excerpt: ${(app.cover_letter || "").slice(0, 400)}

Return ONLY this JSON structure (no markdown, no code blocks):
{"sections":[{"id":"s1","title":"Role Fit","description":"Brief description","questions":[{"id":"q1","type":"text","text":"Question?"},{"id":"q2","type":"multiple_choice","text":"Question?","options":["A","B","C","D"]},{"id":"q3","type":"rating","text":"Rate your X (1–5)","scale":5}]},{"id":"s2","title":"Technical / Core Skills","description":"","questions":[...]},{"id":"s3","title":"Culture & Values","description":"","questions":[...]}],"time_limit_minutes":35}

Rules: 3 sections, 2-4 questions each, mix of text/multiple_choice/rating types, tailored to ${roleCategory} role at a GPU cloud company.`
          }],
          max_tokens: 2000,
        }),
      });

      const aiData = await aiRes.json();
      const raw = aiData?.content?.[0]?.text || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.sections?.length) assessmentData = parsed;
    } catch (_e) {
      // Use default sections
    }

    // Save to candidate_assessments
    const { data: assessment, error: insertErr } = await supabase
      .from("candidate_assessments")
      .insert({
        organization_id: "00000000-0000-0000-0000-000000000001",
        application_id: applicationId,
        candidate_name: app.full_name,
        candidate_email: app.email,
        role_title: app.role_title,
        sections: assessmentData.sections,
        status: "pending",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    // Create HR alert
    await supabase.from("hr_alerts").insert({
      organization_id: "00000000-0000-0000-0000-000000000001",
      type: "assessment_sent",
      title: `Assessment sent — ${app.full_name}`,
      body: `${app.role_title} candidate received an assessment link.`,
      link_label: "View candidate",
      link_data: { application_id: applicationId, candidate_name: app.full_name },
    });

    return json({ success: true, assessmentId: assessment.id, token: assessment.token });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
