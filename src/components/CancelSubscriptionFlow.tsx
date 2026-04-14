import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Gift, Pause, ArrowDown, X, Heart } from "lucide-react";

interface CancelSubscriptionFlowProps {
  open: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string) => void;
  onPause?: () => void;
  onDowngrade?: () => void;
  accessUntil?: string;
  planName?: string;
}

const reasons = [
  { id: "price", label: "Está muito caro para mim", icon: "💰" },
  { id: "features", label: "Não uso todas as funcionalidades", icon: "🔧" },
  { id: "competitor", label: "Encontrei outra solução", icon: "🔄" },
  { id: "temporary", label: "Preciso pausar temporariamente", icon: "⏸️" },
  { id: "other", label: "Outro motivo", icon: "💬" },
];

const retentionOffers: Record<string, { icon: typeof Gift; title: string; description: string; action: string }> = {
  price: { icon: Gift, title: "Que tal um desconto?", description: "Podemos oferecer 30% de desconto nos próximos 3 meses para você continuar aproveitando.", action: "Aceitar Desconto" },
  features: { icon: ArrowDown, title: "Considere o plano Básico", description: "Você pode fazer downgrade para o plano Básico e pagar menos, mantendo as funcionalidades essenciais.", action: "Ver Plano Básico" },
  competitor: { icon: Heart, title: "Conte-nos mais", description: "Gostaríamos de entender o que podemos melhorar. Nossa equipe pode ajudar a aproveitar ao máximo o FLEXUS.", action: "Falar com Suporte" },
  temporary: { icon: Pause, title: "Pause sua assinatura", description: "Você pode pausar sua assinatura por até 3 meses sem perder seus dados. Retome quando quiser.", action: "Pausar Assinatura" },
  other: { icon: Heart, title: "Fale conosco", description: "Nossa equipe está pronta para ajudar com qualquer questão. Ficaremos felizes em resolver.", action: "Falar com Suporte" },
};

export function CancelSubscriptionFlow({
  open,
  onClose,
  onConfirmCancel,
  onPause,
  onDowngrade,
  accessUntil,
  planName,
}: CancelSubscriptionFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState("");

  const retention = selectedReason ? retentionOffers[selectedReason] : null;
  const RetentionIcon = retention?.icon || Gift;

  const handleRetentionAction = () => {
    if (selectedReason === "temporary" && onPause) {
      onPause();
    } else if (selectedReason === "features" && onDowngrade) {
      onDowngrade();
    }
    onClose();
  };

  const reset = () => {
    setStep(1);
    setSelectedReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {step === 1 && "Sentiremos sua falta 😢"}
            {step === 2 && "Antes de ir..."}
            {step === 3 && "Confirmar cancelamento"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Reason */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nos ajude a melhorar! Por que está cancelando?</p>
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelectedReason(r.id); setStep(2); }}
                className={`flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3.5 text-left text-sm transition-all hover:border-primary/30 hover:bg-muted/50 ${
                  selectedReason === r.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <span className="text-lg">{r.icon}</span>
                <span className="text-foreground">{r.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Retention offer */}
        {step === 2 && retention && (
          <div className="space-y-5">
            <div className="rounded-xl bg-cta/5 border border-cta/20 p-5 text-center">
              <RetentionIcon className="mx-auto h-10 w-10 text-cta" />
              <h4 className="mt-3 text-lg font-semibold text-foreground">{retention.title}</h4>
              <p className="mt-2 text-sm text-muted-foreground">{retention.description}</p>
              <Button
                onClick={handleRetentionAction}
                className="mt-4 w-full bg-cta text-cta-foreground hover:bg-cta/90"
              >
                {retention.action}
              </Button>
            </div>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(3)}>
              Não, quero cancelar mesmo
            </Button>
            <Button variant="outline" className="w-full font-semibold" onClick={() => { reset(); onClose(); }}>
              Manter Meu Plano
            </Button>
          </div>
        )}

        {/* Step 3: Final confirmation */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Ao cancelar, você perderá acesso a:</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Todas as funcionalidades do plano {planName || "atual"}</li>
                    <li>• Relatórios e dashboards analíticos</li>
                    <li>• Notificações automáticas para clientes</li>
                    <li>• Suporte prioritário</li>
                  </ul>
                </div>
              </div>
            </div>

            {accessUntil && (
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
                Acesso mantido até <span className="font-semibold text-foreground">{accessUntil}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full font-semibold border-cta text-cta hover:bg-cta/5"
                onClick={() => { reset(); onClose(); }}
              >
                Manter Meu Plano
              </Button>
              <Button
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/5"
                onClick={() => {
                  onConfirmCancel(selectedReason);
                  reset();
                }}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
