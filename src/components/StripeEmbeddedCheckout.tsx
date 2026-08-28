import { useMemo } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

interface StripeEmbeddedCheckoutProps {
  /** Sessão já criada no servidor (validada antes de montar o checkout). */
  clientSecret: string;
}

/**
 * Só é montado quando a sessão de pagamento já existe. Assim, uma recusa por
 * regra de negócio (assinatura duplicada, produto indisponível) é mostrada em
 * português pelo app, em vez da tela genérica "Something went wrong".
 */
export function StripeEmbeddedCheckout({ clientSecret }: StripeEmbeddedCheckoutProps) {
  const options = useMemo(
    () => ({ fetchClientSecret: async () => clientSecret }),
    [clientSecret],
  );

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
