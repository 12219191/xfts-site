import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tmp-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const env = new URL(request.url).searchParams.get("env") === "live" ? "live" : "sandbox";
        const stripe = createStripeClient(env);
        const prices = await stripe.prices.list({ limit: 100, expand: ["data.product"] });
        return Response.json(
          prices.data.map((p) => ({
            lookup_key: p.lookup_key,
            amount: p.unit_amount,
            interval: p.recurring?.interval,
            product: typeof p.product === "string" ? p.product : (p.product as { id: string; name: string; metadata?: Record<string, string> }),
          })),
        );
      },
    },
  },
});
