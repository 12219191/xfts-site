import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutOptions {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  /**
   * Exige login antes do checkout: sem usuário autenticado a assinatura
   * não consegue ser vinculada à conta (metadata.userId) pelo webhook.
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

      setOptions({
        ...opts,
        userId: user.id,
        customerEmail: opts.customerEmail ?? user.email ?? undefined,
      });
      setIsOpen(true);
    },
    [navigate],
  );

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const CheckoutForm = isOpen && options
    ? () => <StripeEmbeddedCheckout {...options} />
    : null;

  return { openCheckout, closeCheckout, isOpen, CheckoutForm };
}
