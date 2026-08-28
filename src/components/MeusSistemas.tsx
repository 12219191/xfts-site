import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Lock, Clock } from "lucide-react";
import { AcessarSistemaButton } from "@/components/AcessarSistemaButton";
import {
  ACTIVE_STATUSES,
  FLEXUS_APPS,
  appKeyFromPriceId,
  planTierFromPriceId,
  seatsFromPriceId,
  seatsLabel,
} from "@/lib/flexus-apps";

export interface SistemaSubscription {
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
}

function statusInfo(sub: SistemaSubscription | undefined) {
  if (!sub) return { label: "Não assinado", tone: "muted" as const, liberado: false };
  const periodOk =
    !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
  if (sub.status === "past_due" || sub.status === "unpaid") {
    return { label: "Pagamento pendente", tone: "warn" as const, liberado: periodOk };
  }
  if (sub.cancel_at_period_end && periodOk) {
    return { label: "Cancelamento agendado", tone: "warn" as const, liberado: true };
  }
  if (sub.status === "canceled") {
    return { label: periodOk ? "Ativo até o fim do período" : "Cancelado", tone: periodOk ? "warn" as const : "muted" as const, liberado: periodOk };
  }
  if (ACTIVE_STATUSES.includes(sub.status) && periodOk) {
    return { label: "Ativo", tone: "ok" as const, liberado: true };
  }
  return { label: "Bloqueado", tone: "muted" as const, liberado: false };
}

export function MeusSistemas({
  subscriptions,
  products = [],
}: {
  subscriptions: SistemaSubscription[];
  products?: CatalogProduct[];
}) {
  const hubOpen = (key: string) => {
    const product = products.find((p) => p.key === key);
    return product ? canAccess(product) : false;
  };
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground">
        <LayoutGrid className="h-5 w-5 text-primary" />
        Meus Sistemas
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        O acesso como titular é sempre por aqui: clique em “Abrir sistema” e entramos com
        você, sem digitar senha de novo. Sua equipe entra pelo login do próprio sistema,
        somente por convite.
      </p>


      <div className="grid gap-4 sm:grid-cols-2">
        {FLEXUS_APPS.map((app) => {
          const sub = subscriptions.find((s) => appKeyFromPriceId(s.price_id) === app.key);
          const info = statusInfo(sub);

          return (
            <Card key={app.key} className={info.liberado ? "border-cta/30" : "border-border"}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.available
                        ? app.url.replace("https://", "")
                        : "Disponível em breve"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      info.tone === "ok"
                        ? "border-cta/40 text-primary"
                        : info.tone === "warn"
                        ? "border-gold-deep/40 text-gold-deep"
                        : "text-muted-foreground"
                    }
                  >
                    {info.label}
                  </Badge>
                </div>

                {sub && (
                  <p className="text-xs text-muted-foreground">
                    Plano {planTierFromPriceId(sub.price_id)}
                    {` • ${seatsLabel(seatsFromPriceId(sub.price_id))}`}
                    {sub.current_period_end &&
                      ` • até ${new Date(sub.current_period_end).toLocaleDateString("pt-BR")}`}
                  </p>
                )}

                <div className="mt-auto pt-2">
                  {!app.available ? (
                    <Button variant="outline" size="sm" disabled className="w-full">
                      <Clock className="mr-2 h-4 w-4" />
                      Em breve
                    </Button>
                  ) : info.liberado ? (
                    <AcessarSistemaButton
                      app={app.key}
                      size="sm"
                      className="w-full bg-cta text-cta-foreground hover:bg-cta/90"
                      label="Abrir sistema"
                      redirectPath="/minha-conta"
                    />
                  ) : (
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to={app.landing}>
                        <Lock className="mr-2 h-4 w-4" />
                        {sub ? "Regularizar acesso" : "Ver planos"}
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
