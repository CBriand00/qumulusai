import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PDL_API_KEY = Deno.env.get("PDL_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { role_title, skills, location } = await req.json();

    if (!PDL_API_KEY) {
      return new Response(JSON.stringify({ error: "PDL_API_KEY not set in Supabase secrets" }), { status: 400, headers: CORS });
    }

    // Try GET endpoint first — simpler, works on free tier
    const params = new URLSearchParams({
      job_title: role_title,
      location_locality: location || "Atlanta",
      size: "10",
      pretty: "true",
    });
    if (skills) params.set("skills", skills);

    const getRes = await fetch(`https://api.peopledatalabs.com/v5/person/search?${params.toString()}`, {
      method: "GET",
      headers: { "X-Api-Key": PDL_API_KEY },
    });

    const getData = await getRes.json();
    console.log("PDL GET response status:", getRes.status);
    console.log("PDL GET response:", JSON.stringify(getData).slice(0, 500));

    // If GET worked and returned people, use it
    if (getRes.ok && Array.isArray(getData.data)) {
      return new Response(JSON.stringify({ raw: getData, data: getData.data, total: getData.total }), { headers: CORS });
    }

    // Fall back to POST with Elasticsearch query body
    const postRes = await fetch("https://api.peopledatalabs.com/v5/person/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": PDL_API_KEY },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { match: { job_title: role_title } },
              { match: { location_country: "united states" } },
            ],
          },
        },
        size: 10,
      }),
    });

    const postData = await postRes.json();
    console.log("PDL POST response status:", postRes.status);
    console.log("PDL POST response:", JSON.stringify(postData).slice(0, 500));

    // Return raw so the client can see everything for debugging
    return new Response(
      JSON.stringify({ raw: postData, data: postData.data || [], total: postData.total || 0, pdl_error: postData.error }),
      { headers: CORS }
    );

  } catch (error) {
    console.error("source-candidates error:", error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: CORS });
  }
});
