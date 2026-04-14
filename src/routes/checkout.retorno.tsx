import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cta/10">
          <Check className="h-8 w-8 text-cta" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Pagamento Concluído!</h1>
        <p className="mt-3 text-muted-foreground">
          {sessionId
            ? "Seu pagamento foi processado com sucesso. Você receberá um email de confirmação em breve."
            : "Nenhuma informação de sessão encontrada."}
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
