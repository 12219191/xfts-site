import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { getStripeEnvironment } from "@/lib/stripe";
import { getCheckoutStatus } from "@/lib/checkout.functions";

export const Route = createFileRoute("/checkout/retorno")({
  head: () => ({
    meta: [
      { title: "Pagamento Concluído - XFTS Inteligência Analítica" },
      { name: "description", content: "Confirmação da sua assinatura FLEXUS e liberação de acesso." },
      { property: "og:title", content: "Pagamento Concluído - XFTS" },
      { property: "og:description", content: "Confirmação da sua assinatura FLEXUS e liberação de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
});

type State =
  | { kind: "loading" }
  | { kind: "ok"; provisioned: boolean }
  | { kind: "pending" }
  | { kind: "error"; message: string };

function CheckoutReturnPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setState({ kind: "error", message: "Nenhuma informação de sessão encontrada." });
      return;
    }

    let active = true;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      try {
        const result = await getCheckoutStatus({
          data: { sessionId, environment: getStripeEnvironment() as "sandbox" | "live" },
        });
        if (!active) return;

        if ("error" in result) {
          setState({ kind: "error", message: result.error });
          return;
        }

        const paid = result.paymentStatus !== "unpaid";
        if (result.status === "complete" && paid) {
          setState({ kind: "ok", provisioned: result.provisioned });
          // O webhook pode chegar logo depois: continua tentando por alguns segundos.
          if (!result.provisioned && attempts < 8) setTimeout(check, 2500);
          return;
        }

        if (attempts < 8) {
          setState({ kind: "loading" });
          setTimeout(check, 2500);
        } else {
          setState({ kind: "pending" });
        }
      } catch (e) {
        if (active) {
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "Não foi possível confirmar o pagamento.",
          });
        }
      }
    };

    void check();
    return () => {
      active = false;
    };
  }, []);

  const isOk = state.kind === "ok";
  const isError = state.kind === "error";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface px-4 py-20">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-xl shadow-primary/5">
        <Logo size={40} variant="mark" className="mx-auto mb-6" />

        <div
          className={`mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full ${
            isError ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {state.kind === "loading" ? (
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          ) : isOk ? (
            <Check className="h-10 w-10 text-primary" />
          ) : (
            <AlertTriangle className={`h-9 w-9 ${isError ? "text-destructive" : "text-gold-deep"}`} />
          )}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {state.kind === "loading"
            ? "Confirmando pagamento..."
            : isOk
            ? "Pagamento confirmado!"
            : isError
            ? "Não foi possível confirmar"
            : "Pagamento em processamento"}
        </h1>

        <p className="mt-4 text-lg text-muted-foreground">
          {state.kind === "loading" &&
            "Estamos validando sua transação com o provedor de pagamento. Isso leva alguns segundos."}
          {isOk &&
            (state.provisioned
              ? "Sua assinatura está ativa e o acesso ao sistema já foi liberado."
              : "Pagamento aprovado. A liberação do acesso está sendo concluída e aparece em Minha Conta em instantes.")}
          {state.kind === "pending" &&
            "Recebemos sua solicitação, mas a confirmação do pagamento ainda não chegou. Você receberá um e-mail assim que for aprovada."}
          {isError && state.message}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link to="/minha-conta">
            <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Ir para Minha Conta
            </Button>
          </Link>
          <Link to="/">
            <Button size="lg" variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </Link>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 border-t border-border pt-8 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Ambiente seguro e processado por Stripe</span>
        </div>
      </div>
    </div>
  );
}
