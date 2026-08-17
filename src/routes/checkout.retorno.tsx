import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/retorno")({
  head: () => ({
    meta: [
      { title: "Pagamento Concluído - XFTS Inteligência Analítica" },
      { name: "description", content: "Seu pagamento foi processado com sucesso." },
    ],
  }),
  component: CheckoutReturnPage,
});

function CheckoutReturnPage() {
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const sessionId = searchParams.get("session_id");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-surface px-4 py-20">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-10 text-center shadow-xl shadow-primary/5">
        <Logo size={40} variant="mark" className="mx-auto mb-6" />
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-cta/10">
          <Check className="h-10 w-10 text-cta" />
        </div>

        
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          Pagamento Confirmado!
        </h1>
        
        <p className="mt-4 text-lg text-muted-foreground">
          {sessionId
            ? "Sua assinatura foi processada com sucesso. Em instantes seu acesso será liberado no dashboard."
            : "Nenhuma informação de sessão encontrada. Se você acredita que isso é um erro, entre em contato com o suporte."}
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
          <Shield className="h-4 w-4 text-cta" />
          <span>Ambiente seguro e processado por Stripe</span>
        </div>
      </div>
    </div>
  );
}
