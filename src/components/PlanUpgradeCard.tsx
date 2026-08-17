import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Minus } from "lucide-react";

interface PlanInfo {
  name: string;
  price: string;
  features: string[];
}

interface PlanUpgradeCardProps {
  currentPlan: PlanInfo;
  targetPlan: PlanInfo;
  isUpgrade: boolean;
  prorataMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlanUpgradeCard({
  currentPlan,
  targetPlan,
  isUpgrade,
  prorataMessage,
  onConfirm,
  onCancel,
}: PlanUpgradeCardProps) {
  // Features gained or lost
  const newFeatures = targetPlan.features.filter((f) => !currentPlan.features.includes(f));
  const lostFeatures = currentPlan.features.filter((f) => !targetPlan.features.includes(f));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
      <h3 className="text-lg font-bold text-foreground">
        {isUpgrade ? "Fazer Upgrade" : "Alterar Plano"}
      </h3>

      {/* Side by side comparison */}
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Current */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Atual</p>
          <p className="mt-1 text-lg font-bold text-foreground">{currentPlan.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{currentPlan.price}/mês</p>
        </div>

        <ArrowRight className="h-5 w-5 text-primary" />

        {/* Target */}
        <div className={`rounded-xl border-2 p-4 text-center ${isUpgrade ? "border-cta bg-primary/5" : "border-gold-deep/40 bg-gold/5"}`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Novo</p>
          <p className="mt-1 text-lg font-bold text-foreground">{targetPlan.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{targetPlan.price}/mês</p>
        </div>
      </div>

      {/* What you gain */}
      {isUpgrade && newFeatures.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-primary">O que você ganha:</p>
          <ul className="mt-2 space-y-2">
            {newFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What you lose */}
      {!isUpgrade && lostFeatures.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-destructive/80">Funcionalidades que você perde:</p>
          <ul className="mt-2 space-y-2">
            {lostFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Minus className="h-4 w-4 text-destructive/50" /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pro-rata */}
      {prorataMessage && (
        <div className="mt-5 rounded-lg bg-primary/5 border border-cta/20 px-4 py-3 text-sm text-foreground">
          {prorataMessage}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Button
          onClick={onConfirm}
          className={`flex-1 ${isUpgrade ? "bg-cta text-cta-foreground hover:bg-cta/90 shadow-md shadow-cta/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
        >
          {isUpgrade ? "Fazer Upgrade Agora" : "Confirmar Alteração"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
