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

    const params = new URLSearchParams({
      job_title: role_title || "engineer",
      location_locality: location || "Atlanta",
      size: "10",
      pretty: "true"
    });

    const res = await fetch(
      `https://api.peopledatalabs.com/v5/person/search?${params}`,
      {
        method: "GET",
        headers: {
          "X-Api-Key": PDL_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await res.json();

    return new Response(JSON.stringify({
      status: res.status,
      data: data
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
