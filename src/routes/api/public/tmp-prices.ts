import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/tmp-prices")({
  server: {
    handlers: {
      GET: async () => {
        const { createStripeClient } = await import("@/lib/stripe.server");
        const stripe = createStripeClient("sandbox");
        const list = await stripe.prices.list({ limit: 100, active: true });
        return Response.json(
          list.data.map((p) => ({ lookup_key: p.lookup_key, amount: p.unit_amount, interval: p.recurring?.interval })),
        );
      },
    },
  },
});
