import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { getStripeEnvironment } from "@/lib/stripe";

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Valida o acesso e cria a sessão de pagamento ANTES de abrir o checkout.
   * Se o servidor recusar (assinatura duplicada, produto indisponível, falha
   * do provedor), a mensagem em português é mostrada aqui e o checkout não é
   * montado — antes disso, o erro virava a tela genérica do provedor.
   */
  const openCheckout = useCallback(
    async (opts: CheckoutOptions) => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        toast.info("Faça login para concluir a assinatura.");
        const redirect =
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "/";
        navigate({ to: "/login", search: { redirect } });
        return;
      }

      const fallbackReturn =
        typeof window !== "undefined"
          ? `${window.location.origin}/checkout/retorno?session_id={CHECKOUT_SESSION_ID}`
          : undefined;

      setIsLoading(true);
      try {
        const result = await createCheckoutSession({
          data: {
            priceId: opts.priceId,
            quantity: opts.quantity,
            returnUrl: opts.returnUrl ?? fallbackReturn,
            environment: getStripeEnvironment() as "sandbox" | "live",
          },
        });

        if ("error" in result) {
          const jaAssina = result.error.toLowerCase().includes("assinatura ativa");
          toast.error(result.error, {
            duration: 8000,
            ...(jaAssina && {
              action: {
                label: "Minha conta",
                onClick: () => navigate({ to: "/minha-conta" }),
              },
            }),
          });
          return;
        }

        if (!result.clientSecret) {
          toast.error("Não foi possível iniciar o pagamento. Tente novamente.");
          return;
        }

        setClientSecret(result.clientSecret);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o pagamento. Tente novamente.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  const closeCheckout = useCallback(() => {
    setClientSecret(null);
  }, []);

  const isOpen = clientSecret !== null;

  const CheckoutForm = useMemo(
    () => (clientSecret ? () => <StripeEmbeddedCheckout clientSecret={clientSecret} /> : null),
    [clientSecret],
  );

  return { openCheckout, closeCheckout, isOpen, isLoading, CheckoutForm };
}
