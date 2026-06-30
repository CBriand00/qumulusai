import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PDL_API_KEY = Deno.env.get("PDL_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }});
  }
  try {
    const { role_title, skills, location } = await req.json();
    const res = await fetch("https://api.peopledatalabs.com/v5/person/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": PDL_API_KEY },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { match: { job_title: role_title } },
              { match: { location_locality: location || "Atlanta" }}
            ]
          }
        },
        size: 10,
        pretty: true
      })
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
