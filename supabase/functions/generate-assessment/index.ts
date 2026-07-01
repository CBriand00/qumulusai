import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_URL = "https://oomdaguzvdheotrkqdxs.supabase.co";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }});
  }

  try {
    const body = await req.json();
    const { application_id, candidate_name, candidate_email, role_title, department } = body;

    if (!application_id || !candidate_name || !candidate_email || !role_title) {
      return new Response(JSON.stringify({ error: "Missing required fields", received: Object.keys(body) }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    // Step 1: Generate questions via Anthropic directly
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Generate a candidate assessment for ${role_title} at QumulusAI.
          Create 10 questions mixing behavioral, situational, and role-specific types.
          Return ONLY a JSON array: [{"type":"behavioral","question":"...","input_type":"text"},...]`
        }]
      })
    });

    const aiData = await aiRes.json();
    let questions = [];
    try {
      const text = aiData.content?.[0]?.text || "[]";
      const clean = text.replace(/```json|```/g, "").trim();
      questions = JSON.parse(clean);
    } catch(e) {
      questions = [{ type: "behavioral", question: "Tell us about yourself and why you're interested in this role.", input_type: "text" }];
    }

    // Step 2: Insert into candidate_assessments
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/candidate_assessments`, {
      method: "POST",
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        application_id,
        candidate_name,
        candidate_email,
        role_title,
        questions: questions,
        status: "pending",
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const insertData = await insertRes.json();

    if (!insertRes.ok) {
      return new Response(JSON.stringify({
        error: "DB insert failed",
        status: insertRes.status,
        details: insertData,
        insertBody: {
          application_id,
          candidate_name,
          candidate_email,
          role_title,
          questions: `array of ${questions.length} items`,
          status: "pending",
        }
      }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    const assessment = Array.isArray(insertData) ? insertData[0] : insertData;
    const assessToken = assessment?.assessment_token;
    const assessLink = `https://qumulusai.vercel.app?assess=${assessToken}`;

    // Step 3: Send email
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-offer-email`, {
        method: "POST",
        headers: {
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          candidateEmail: candidate_email,
          candidateName: candidate_name,
          role: role_title,
          signingLink: assessLink,
          subject: `Your QumulusAI Assessment — ${role_title}`,
          customBody: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0A2540;">Hi ${candidate_name},</h2>
            <p>Thank you for applying for <strong>${role_title}</strong> at QumulusAI!</p>
            <p>The next step is to complete a brief assessment. This takes approximately 20-30 minutes.</p>
            <p style="margin: 24px 0;">
              <a href="${assessLink}" style="background: #0A2540; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Your Assessment
              </a>
            </p>
            <p style="color: #7E8FA3; font-size: 14px;">This link expires in 7 days. If the button doesn't work: ${assessLink}</p>
            <p>Good luck!</p>
            <p>— QumulusAI People & Culture</p>
          </div>`
        })
      });
    } catch(emailErr) {
      console.error("Email send failed:", emailErr);
    }

    return new Response(JSON.stringify({ success: true, token: assessToken, link: assessLink }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});

  } catch(err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});
  }
});
