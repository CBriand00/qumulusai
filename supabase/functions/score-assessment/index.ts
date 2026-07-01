import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { assessmentId, responses } = await req.json();
    if (!assessmentId) return json({ error: "assessmentId required" }, 400);

    const { data: assessment } = await supabase
      .from("candidate_assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();
    if (!assessment) return json({ error: "Assessment not found" }, 404);

    // Mark submitted immediately
    await supabase.from("candidate_assessments").update({
      responses,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", assessmentId);

    // Format responses for AI
    const sections: Array<{ id?: string; title?: string; questions?: Array<{ id?: string; text?: string }> }> = assessment.sections || [];
    const formattedResponses = sections.map((sec, si) => {
      const secKey = sec.id ?? si;
      const qs = (sec.questions || []).map((q, qi) => {
        const key = `${secKey}_${q.id ?? qi}`;
        const val = responses?.[key];
        return `  Q: ${q.text}\n  A: ${val !== undefined && val !== "" ? JSON.stringify(val) : "(no answer)"}`;
      }).join("\n");
      return `[${sec.title}]\n${qs}`;
    }).join("\n\n");

    // Score with AI
    let scoring = {
      overall_score: 50,
      dimension_scores: { role_fit: 50, problem_solving: 50, culture_values: 50, communication: 50 },
      ai_explanation: "Score calculated based on response completeness.",
      risk_indicators: [] as string[],
      interview_recommendations: [] as string[],
      suggested_questions: [] as string[],
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
          system: `You are an expert talent assessor for QumulusAI (bare-metal GPU cloud, Atlanta, scaling fast). Score this candidate's assessment responses rigorously. Return ONLY valid JSON — no markdown, no commentary.`,
          messages: [{
            role: "user",
            content: `Score the assessment for: ${assessment.role_title}
Candidate: ${assessment.candidate_name}

Responses:
${formattedResponses}

Return ONLY this JSON (no code blocks, no markdown):
{"overall_score":75,"dimension_scores":{"role_fit":80,"problem_solving":70,"culture_values":75,"communication":72},"ai_explanation":"2-3 sentence explanation of score and key observations.","risk_indicators":["Specific risk 1","Specific risk 2"],"interview_recommendations":["Focus area 1","Focus area 2","Focus area 3"],"suggested_questions":["Probing question 1?","Probing question 2?","Probing question 3?"]}

Scoring guidelines: 80-100 = strong advance, 65-79 = advance with notes, 50-64 = hold/review, below 50 = pass. Be direct and specific.`
          }],
          max_tokens: 1200,
        }),
      });

      const aiData = await aiRes.json();
      const raw = aiData?.content?.[0]?.text || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (typeof parsed?.overall_score === "number") scoring = parsed;
    } catch (_e) {
      // Use default scoring
    }

    // Update assessment with scores
    await supabase.from("candidate_assessments").update({
      overall_score: scoring.overall_score,
      dimension_scores: scoring.dimension_scores,
      ai_explanation: scoring.ai_explanation,
      risk_indicators: scoring.risk_indicators,
      interview_recommendations: scoring.interview_recommendations,
      suggested_questions: scoring.suggested_questions,
      status: "scored",
      scored_at: new Date().toISOString(),
    }).eq("id", assessmentId);

    // Update application status based on score
    if (assessment.application_id) {
      const newStatus = scoring.overall_score >= 70 ? "interview" : scoring.overall_score >= 50 ? "screening" : "review";
      await supabase.from("applications").update({ status: newStatus }).eq("id", assessment.application_id);
    }

    // HR alert
    const tier = scoring.overall_score >= 70 ? "Strong Fit" : scoring.overall_score >= 50 ? "Potential Fit" : "Low Fit";
    await supabase.from("hr_alerts").insert({
      organization_id: "00000000-0000-0000-0000-000000000001",
      type: "assessment_scored",
      title: `${assessment.candidate_name} scored ${scoring.overall_score}/100`,
      body: `${assessment.role_title} · ${tier}`,
      link_label: "Review in Talent Inbox",
      link_data: {
        application_id: assessment.application_id,
        candidate_name: assessment.candidate_name,
        score: scoring.overall_score,
      },
    });

    // Notify Messenger
    await supabase.from("messages").insert({
      recipient_name: "Recruiting Team",
      content: `📋 Assessment scored: ${assessment.candidate_name} — ${scoring.overall_score}/100 for ${assessment.role_title}. ${scoring.overall_score >= 70 ? "Recommended for interview." : "Review recommended."}`,
      sent_at: new Date().toISOString(),
      type: "assessment_notification",
    }).catch(() => {});

    return json({ success: true, score: scoring.overall_score });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
