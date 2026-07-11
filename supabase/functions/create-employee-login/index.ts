import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Company identity for new-hire-facing copy — set per tenant (see .env.example).
const COMPANY_NAME = Deno.env.get("COMPANY_NAME") || "QumulusAI";
const COMPANY_CONTEXT = Deno.env.get("COMPANY_CONTEXT") || "a fast-growing GPU AI infrastructure company in Atlanta, GA";
const APP_URL = Deno.env.get("APP_URL") || "https://qumulusai.vercel.app";

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

function randomPassword(len = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) pw += chars[b % chars.length];
  return pw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { employeeId, email, fullName, roleTitle, startDate } = await req.json();

    if (!employeeId || !email || !fullName) {
      return json({ error: "employeeId, email, and fullName are required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate temp password and create auth user
    const tempPassword = randomPassword(12);
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "employee" },
    });

    if (authError && !authError.message.includes("already been registered")) {
      return json({ error: authError.message }, 400);
    }

    // Update profiles table — set role to employee
    if (authData?.user?.id) {
      await admin.from("profiles").upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: "employee",
      });
    }

    // Generate personalized first day agenda via ai-query
    let agenda = `Your manager will share your personalized Day 1 schedule shortly. Welcome to ${COMPANY_NAME}!`;
    try {
      const aiRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          max_tokens: 500,
          system: `You are ${COMPANY_NAME}'s AI Chief of Staff. Write a warm, practical first-day agenda for a new hire. Be specific to their role. Format with clear time blocks. Keep it under 300 words.`,
          messages: [{
            role: "user",
            content: `Create a first-day agenda for ${fullName}, a new ${roleTitle || "team member"} starting on ${startDate || "their first day"} at ${COMPANY_NAME} (${COMPANY_CONTEXT}).`,
          }],
        }),
      });
      const aiData = await aiRes.json();
      agenda = aiData?.content?.[0]?.text || agenda;
    } catch (_) { /* use fallback agenda */ }

    // Send welcome email with login credentials
    const loginUrl = APP_URL;
    const firstName = fullName.split(" ")[0];
    const startDisplay = startDate ? new Date(startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "your start date";

    const emailBody = `Hi ${firstName},

Welcome to ${COMPANY_NAME}! We're thrilled to have you joining us.

Your employee account is ready. Here are your login credentials:

🔗 Login URL: ${loginUrl}
📧 Email: ${email}
🔑 Temporary Password: ${tempPassword}

Please log in and change your password on your first visit.

📅 Your Start Date: ${startDisplay}

📋 Your Personalized First Day Agenda:

${agenda}

If you have any questions before your start date, don't hesitate to reach out to People & Culture.

Welcome aboard,
The ${COMPANY_NAME} Team`;

    await fetch(`${SUPABASE_URL}/functions/v1/send-offer-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        candidateEmail: email,
        candidateName: fullName,
        role: roleTitle || "Team Member",
        signingLink: loginUrl,
        subject: `Welcome to ${COMPANY_NAME} — Your Login & First Day Agenda`,
        bodyText: emailBody,
      }),
    });

    return json({ success: true, userId: authData?.user?.id });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
