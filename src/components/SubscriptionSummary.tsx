import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Layers, Users, Activity } from "lucide-react";
import { seatsFromPriceId, seatsLabel, planTierFromPriceId } from "@/lib/flexus-apps";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "default" },
  trialing: { label: "Em teste", variant: "secondary" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  unpaid: { label: "Não paga", variant: "destructive" },
  canceled: { label: "Cancelada", variant: "outline" },
  incomplete: { label: "Incompleta", variant: "outline" },
  paused: { label: "Pausada", variant: "outline" },
};

interface Props {
  planName: string;
  priceId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  /** Assentos em uso, quando conhecido. */
  seatsUsed?: number | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionSummary({
  planName,
  priceId,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  seatsUsed,
}: Props) {
  const seats = seatsFromPriceId(priceId);
  const st = statusLabels[status] ?? { label: status, variant: "outline" as const };
  const seatsText =
    seats === null
      ? seatsUsed != null
        ? `${seatsUsed} de ilimitados`
        : "Usuários ilimitados"
      : seatsUsed != null
        ? `${seatsUsed} de ${seats}`
        : seatsLabel(seats);

  const items = [
    {
      icon: Layers,
      label: "Plano",
      value:
        planName.toLowerCase() === planTierFromPriceId(priceId).toLowerCase()
          ? planName
          : `${planName} · ${planTierFromPriceId(priceId)}`,
    },
    {
      icon: Activity,
      label: "Status",
      value: st.label,
      badge: true as const,
    },
    {
      icon: CalendarClock,
      label: cancelAtPeriodEnd ? "Acesso até" : "Próxima cobrança",
      value: formatDate(currentPeriodEnd),
    },
    {
      icon: Users,
      label: "Assentos",
      value: seatsText,
    },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              {"badge" in item ? (
                <Badge variant={st.variant} className="mt-1">
                  {item.value}
                </Badge>
              ) : (
                <p className="truncate text-sm font-semibold text-foreground">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
