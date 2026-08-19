import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PlanSyncState = "active" | "syncing" | "processing" | "error";

interface Props {
  state: PlanSyncState;
  /** Mensagem do erro que impediu a última operação, quando houver. */
  error?: string | null;
  /** Momento da última leitura confirmada do banco. */
  lastSyncAt?: Date | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const CONFIG: Record<
  PlanSyncState,
  { icon: typeof CheckCircle2; label: string; description: string; className: string }
> = {
  active: {
    icon: CheckCircle2,
    label: "Ativo",
    description: "Seu plano está confirmado e atualizado.",
    className: "border-primary/20 bg-primary/5 text-primary",
  },
  syncing: {
    icon: Loader2,
    label: "Sincronizando",
    description: "Confirmando a mudança com o provedor de pagamento. Isso leva alguns segundos.",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  processing: {
    icon: Clock,
    label: "Em processamento",
    description:
      "A mudança já foi aceita e está sendo aplicada. Continuamos verificando automaticamente — você não precisa refazer nada.",
    className: "border-gold-deep/30 bg-gold/10 text-gold-deep",
  },
  error: {
    icon: AlertTriangle,
    label: "Falha na atualização",
    description: "Não conseguimos concluir a última operação.",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Deixa claro em que ponto está a mudança de plano, evitando confusão. */
export function PlanSyncIndicator({ state, error, lastSyncAt, onRefresh, refreshing }: Props) {
  const cfg = CONFIG[state];
  const Icon = cfg.icon;

  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-lg border p-4 ${cfg.className}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${state === "syncing" ? "animate-spin" : ""}`} />
      <div className="min-w-[14rem] flex-1">
        <p className="text-sm font-semibold">{cfg.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {state === "error" && error ? error : cfg.description}
        </p>
        {lastSyncAt && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Última verificação às {formatTime(lastSyncAt)}.
          </p>
        )}
      </div>
      {onRefresh && (
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Atualizar agora
        </Button>
      )}
    </div>
  );
}
