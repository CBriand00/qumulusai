import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PDL_API_KEY = Deno.env.get("PDL_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { role_title, location } = await req.json();

    const pdlFetch = (body: object) =>
      fetch("https://api.peopledatalabs.com/v5/person/search", {
        method: "POST",
        headers: { "X-Api-Key": PDL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    // Primary query — role-based with location preference
    let res = await pdlFetch({
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  { term: { "job_title_role": "engineering" } },
                  { term: { "job_title_sub_role": "hardware" } },
                ],
              },
            },
          ],
          should: [
            { term: { "location_country": "united states" } },
          ],
        },
      },
      size: 10,
    });

    let data = await res.json();

    // Fallback — if empty, try broadest possible query to confirm API is working
    if (!data?.data || data?.total === 0) {
      res = await pdlFetch({
        query: {
          bool: {
            must: [
              { term: { "location_country": "united states" } },
            ],
          },
        },
        size: 10,
      });
      data = await res.json();
      data._fallback = true;
    }

    return new Response(JSON.stringify({
      status: res.status,
      data: data,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
