import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const {
          HANDLED_EVENTS,
          eventSummary,
          handleStripeEvent,
          logWebhookEvent,
        } = await import("@/lib/payments-webhook.server");

        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook com env inválido:", rawEnv);
          await logWebhookEvent({
            stripe_event_id: null,
            event_type: "desconhecido",
            environment: String(rawEnv ?? "desconhecido"),
            status: "failed",
            error: "Parâmetro env inválido ou ausente na URL do webhook",
            duration_ms: Date.now() - startedAt,
          });
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        let event: any = null;
        try {
          event = await verifyWebhook(request, env);
          console.log("Received event:", event.type, "env:", env);
          await handleStripeEvent(event, env);
          await logWebhookEvent({
            stripe_event_id: event.id ?? null,
            event_type: event.type,
            environment: env,
            status: HANDLED_EVENTS.has(event.type) ? "processed" : "ignored",
            duration_ms: Date.now() - startedAt,
            summary: eventSummary(event),
          });
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          await logWebhookEvent({
            stripe_event_id: event?.id ?? null,
            event_type: event?.type ?? "assinatura_invalida",
            environment: env,
            status: "failed",
            error: e instanceof Error ? e.message : String(e),
            duration_ms: Date.now() - startedAt,
            summary: event ? eventSummary(event) : {},
          });
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
