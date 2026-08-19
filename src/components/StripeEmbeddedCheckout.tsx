import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/checkout.functions";

interface StripeEmbeddedCheckoutProps {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({
  priceId,
  quantity,
  returnUrl,
}: StripeEmbeddedCheckoutProps) {
  const fetchClientSecret = async (): Promise<string> => {
    const fallbackReturn =
      typeof window !== "undefined"
        ? `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`
        : undefined;

    const result = await createCheckoutSession({
      data: {
        priceId,
        quantity,
        returnUrl: returnUrl ?? fallbackReturn,
        environment: getStripeEnvironment() as "sandbox" | "live",
      },
    });

    if ("error" in result) throw new Error(result.error);
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
