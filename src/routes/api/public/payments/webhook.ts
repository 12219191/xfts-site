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
          claimWebhookEvent,
          finalizeWebhookEvent,
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
        let claimed = false;
        let attempts = 1;
        try {
          event = await verifyWebhook(request, env);
          console.log("Received event:", event.type, "env:", env);

          // Idempotência: cada stripe_event_id é processado uma única vez.
          const claim = await claimWebhookEvent({
            eventId: event.id ?? null,
            eventType: event.type,
            environment: env,
          });
          attempts = claim.attempts;
          if (!claim.proceed) {
            console.log("Evento duplicado ignorado:", event.id, claim.reason);
            return Response.json({ received: true, duplicate: true, reason: claim.reason });
          }
          claimed = true;

          await handleStripeEvent(event, env);
          await finalizeWebhookEvent({
            stripe_event_id: event.id ?? null,
            event_type: event.type,
            environment: env,
            status: HANDLED_EVENTS.has(event.type) ? "processed" : "ignored",
            duration_ms: Date.now() - startedAt,
            summary: eventSummary(event),
            attempts,
          });
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          const failure = {
            stripe_event_id: event?.id ?? null,
            event_type: event?.type ?? "assinatura_invalida",
            environment: env,
            status: "failed" as const,
            error: e instanceof Error ? e.message : String(e),
            duration_ms: Date.now() - startedAt,
            summary: event ? eventSummary(event) : {},
          };
          if (claimed) await finalizeWebhookEvent({ ...failure, attempts });
          else await logWebhookEvent(failure);
          // Status 400 faz o Stripe reenviar; a reserva já foi liberada como "failed".
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
