import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, environment } = await req.json();
    
    const env = environment || 'sandbox';
    const connectionApiKey = env === 'sandbox'
      ? Deno.env.get('STRIPE_SANDBOX_API_KEY')
      : Deno.env.get('STRIPE_LIVE_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    console.log("connectionApiKey exists:", !!connectionApiKey, "length:", connectionApiKey?.length);
    console.log("lovableApiKey exists:", !!lovableApiKey, "length:", lovableApiKey?.length);
    console.log("connectionApiKey prefix:", connectionApiKey?.substring(0, 10));

    if (!connectionApiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct gateway call
    const params = new URLSearchParams();
    params.append('lookup_keys[]', priceId);
    
    const url = `https://connector-gateway.lovable.dev/stripe/v1/prices?${params.toString()}`;
    console.log("Fetching:", url);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connectionApiKey}`,
        'X-Connection-Api-Key': connectionApiKey,
        'Lovable-API-Key': lovableApiKey,
      },
    });

    const responseText = await res.text();
    console.log("Gateway response status:", res.status, "body:", responseText);

    let data;
    try { data = JSON.parse(responseText); } catch { data = { raw: responseText }; }

    if (!data?.data?.length) {
      return new Response(JSON.stringify({ error: "Price not found", status: res.status }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ stripeId: data.data[0].id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
