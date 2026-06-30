import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { role_title, location, skills } = await req.json();
    const apolloKey = Deno.env.get("APOLLO_API_KEY");

    if (!apolloKey) {
      return new Response(JSON.stringify({ error: "APOLLO_API_KEY not configured in Supabase secrets." }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body: Record<string, unknown> = {
      person_titles: [role_title],
      person_locations: [location || "Atlanta, Georgia"],
      per_page: 10,
    };
    if (skills) {
      body.q_keywords = skills;
    }

    const res = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apolloKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    const candidates = (data.people || []).map((p: Record<string, unknown>) => ({
      name: p.name,
      title: p.title,
      company: (p.organization as Record<string, unknown>)?.name ?? p.employment_history?.[0]?.organization_name ?? null,
      linkedin_url: p.linkedin_url,
      email: p.email,
    }));

    return new Response(JSON.stringify({ candidates }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
