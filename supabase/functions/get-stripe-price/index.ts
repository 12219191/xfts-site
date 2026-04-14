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

    if (!connectionApiKey || !lovableApiKey) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct gateway call to list prices by lookup_key
    const params = new URLSearchParams();
    params.append('lookup_keys[]', priceId);
    
    const res = await fetch(`https://connector-gateway.lovable.dev/stripe/v1/prices?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connectionApiKey}`,
        'X-Connection-Api-Key': connectionApiKey,
        'Lovable-API-Key': lovableApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await res.json();
    console.log("Gateway response status:", res.status, "data:", JSON.stringify(data));

    if (!data?.data?.length) {
      return new Response(JSON.stringify({ error: "Price not found", gatewayResponse: data }), {
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
