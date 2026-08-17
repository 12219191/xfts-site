import { Check, Clock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid" | "paused";

interface SubscriptionStatusProps {
  status: SubStatus;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  trialEnd?: string | null;
  productName?: string;
  planTier?: string;
}

const statusConfig: Record<SubStatus, { label: string; color: string; bgColor: string; icon: typeof Check }> = {
  active: { label: "Ativa", color: "text-primary", bgColor: "bg-primary/10", icon: Check },
  trialing: { label: "Período de teste", color: "text-blue-600", bgColor: "bg-blue-500/10", icon: Clock },
  past_due: { label: "Pagamento pendente", color: "text-gold-deep", bgColor: "bg-gold/10", icon: AlertTriangle },
  canceled: { label: "Cancelada", color: "text-muted-foreground", bgColor: "bg-muted", icon: XCircle },
  incomplete: { label: "Incompleta", color: "text-gold-deep", bgColor: "bg-gold/10", icon: Loader2 },
  unpaid: { label: "Não paga", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle },
  paused: { label: "Pausada", color: "text-blue-600", bgColor: "bg-blue-500/10", icon: Clock },
};

export function SubscriptionStatus({
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  trialEnd,
  productName,
  planTier,
}: SubscriptionStatusProps) {
  const config = statusConfig[status] || statusConfig.active;
  const Icon = config.icon;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // Trial progress
  let trialProgress = 0;
  let trialDaysLeft = 0;
  if (status === "trialing" && trialEnd) {
    const now = Date.now();
    const end = new Date(trialEnd).getTime();
    const totalDays = 7;
    const msLeft = end - now;
    trialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    trialProgress = Math.min(100, Math.max(0, ((totalDays - trialDaysLeft) / totalDays) * 100));
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            {productName && <p className="text-xs text-muted-foreground">{productName}</p>}
            <p className="font-semibold text-foreground">{planTier || "Assinatura"}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Trial progress bar */}
      {status === "trialing" && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Período de teste</span>
            <span>{trialDaysLeft} dias restantes</span>
          </div>
          <Progress value={trialProgress} className="mt-2 h-1.5" />
        </div>
      )}

      {/* Renewal / expiry info */}
      {currentPeriodEnd && (
        <div className="mt-4 rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
          {cancelAtPeriodEnd ? (
            <p className="text-muted-foreground">
              Acesso até <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span>
            </p>
          ) : status === "active" ? (
            <p className="text-muted-foreground">
              Renovação em <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">
              Expira em <span className="font-medium text-foreground">{formatDate(currentPeriodEnd)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
