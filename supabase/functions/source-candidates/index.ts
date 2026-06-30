import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { role_title, skills, location } = await req.json();
    const pdlKey = Deno.env.get("PDL_API_KEY");

    if (!pdlKey) {
      return new Response(JSON.stringify({ error: "PDL_API_KEY not configured in Supabase secrets." }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const must: unknown[] = [
      { term: { job_title: role_title } },
      { term: { location_locality: location || "Atlanta" } },
    ];

    if (skills) {
      must.push({ term: { skills: skills } });
    }

    const res = await fetch("https://api.peopledatalabs.com/v5/person/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": pdlKey,
      },
      body: JSON.stringify({
        query: { bool: { must } },
        size: 10,
        pretty: true,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "PDL API error", status: res.status }), {
        status: res.status, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const candidates = (data.data || []).map((p: Record<string, unknown>) => ({
      name: p.full_name,
      title: p.job_title,
      company: p.job_company_name,
      linkedin_url: p.linkedin_url,
      email: Array.isArray(p.emails) ? (p.emails as { address: string }[])[0]?.address : null,
    }));

    return new Response(JSON.stringify({ candidates, total: data.total }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
