import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, type buttonVariants } from "@/components/ui/button";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { supabase } from "@/integrations/supabase/client";
import { createSsoLink, canUseFlowAdminPreview } from "@/lib/sso.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { getFlexusApp, type FlexusAppKey } from "@/lib/flexus-apps";

interface Props extends VariantProps<typeof buttonVariants> {
  app: FlexusAppKey;
  className?: string;
  label?: string;
  /** Caminho para voltar após o login, quando o usuário não está autenticado. */
  redirectPath?: string;
}

/**
 * Leva o cliente logado direto ao sistema do produto (outro domínio) via SSO.
 * Sem login -> /login com retorno. Sem assinatura -> avisa e mostra os planos.
 */
export function AcessarSistemaButton({
  app,
  className,
  label = "Acessar Sistema",
  redirectPath,
  size,
  variant,
}: Props) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const meta = getFlexusApp(app);

  const handleClick = async () => {
    if (!meta) return;

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const back =
          redirectPath ??
          (typeof window !== "undefined" ? window.location.pathname : meta.landing);
        toast.info("Faça login para acessar o sistema.");
        navigate({ to: "/login", search: { redirect: back } });
        return;
      }

      const env = getStripeEnvironment() === "live" ? "live" : "sandbox";
      const result = await createSsoLink({ data: { app, environment: env } });

      if ("error" in result) {
        toast.error(result.error);
        navigate({ to: meta.landing });
        return;
      }
      window.location.href = result.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o sistema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className={className} size={size} variant={variant} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {label}
      {!loading && <ArrowUpRight className="ml-2 h-4 w-4" />}
    </Button>
  );
}

/** Flow "Em breve": aparece só para administradores do Control Center (conferido no servidor). */
export function FlowAdminPreviewButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const ok = await canUseFlowAdminPreview();
        if (alive) setShow(ok === true);
      } catch {
        /* sem liberação */
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!show) return null;
  return <AcessarSistemaButton app="flow" size="lg" variant="heroOutline" label="Acessar Sistema (admin)" />;
}
