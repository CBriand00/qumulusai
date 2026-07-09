import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Real candidate sourcing via People Data Labs (PDL) Person Search API.
// Builds a query from the role title, skills, and location the recruiter typed,
// then normalizes PDL's response into clean candidate cards for the UI.
//
// Requires PDL_API_KEY (set with `supabase secrets set PDL_API_KEY=...`). When the
// key is absent the function returns configured:false with an empty list so the
// UI can show a "connect PDL" state instead of erroring or inventing people.

const PDL_API_KEY = Deno.env.get("PDL_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { role_title = "", location = "", skills = [], size = 10 } = await req.json();

    if (!PDL_API_KEY) {
      return json({
        configured: false,
        total: 0,
        candidates: [],
        message: "Candidate sourcing is not connected. Set PDL_API_KEY on the Supabase project to pull real candidates.",
      });
    }

    // Build an Elasticsearch-style bool query from the recruiter's inputs.
    const must: object[] = [];
    const should: object[] = [];

    if (role_title) must.push({ match: { job_title: role_title } });

    if (location) {
      // Match against locality/region/name so "Atlanta, GA" or "Atlanta" both work.
      should.push({ match: { location_locality: location } });
      should.push({ match: { location_region: location } });
      should.push({ match: { location_name: location } });
    }

    const skillList = Array.isArray(skills)
      ? skills
      : String(skills).split(",").map((s) => s.trim()).filter(Boolean);
    for (const s of skillList) should.push({ term: { skills: s.toLowerCase() } });

    // Require at least one constraint; otherwise PDL rejects the query.
    if (must.length === 0 && should.length === 0) {
      must.push({ exists: { field: "linkedin_url" } });
    }

    const res = await fetch("https://api.peopledatalabs.com/v5/person/search", {
      method: "POST",
      headers: { "X-Api-Key": PDL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: { bool: { must, should } },
        size: Math.min(Math.max(Number(size) || 10, 1), 25),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return json({
        configured: true,
        total: 0,
        candidates: [],
        error: data?.error?.message || `PDL returned ${res.status}`,
      }, res.status === 404 ? 200 : res.status);
    }

    const candidates = (data?.data || []).map((p: Record<string, unknown>) => {
      const li = (p.linkedin_url as string) || "";
      return {
        name: p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(" "),
        title: p.job_title ?? null,
        company: p.job_company_name ?? null,
        location: p.location_name ?? null,
        linkedin_url: li ? (li.startsWith("http") ? li : `https://${li}`) : null,
        skills: Array.isArray(p.skills) ? (p.skills as string[]).slice(0, 8) : [],
        years_experience: p.inferred_years_experience ?? null,
        email: p.work_email ?? (Array.isArray(p.emails) && p.emails.length ? (p.emails[0] as Record<string, unknown>).address : null),
      };
    });

    return json({ configured: true, total: data?.total ?? candidates.length, candidates });
  } catch (error) {
    return json({ configured: !!PDL_API_KEY, total: 0, candidates: [], error: (error as Error).message }, 500);
  }
});
