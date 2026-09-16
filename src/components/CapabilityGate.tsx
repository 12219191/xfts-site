import { useEffect, useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "@/hooks/useEntitlements";

interface Props {
  productKey: string;
  /** Chave da capability exigida, ex.: "reports.retention_analysis". */
  capability: string;
  children: React.ReactNode;
  label?: string;
  /**
   * Confirma no servidor antes de liberar (usar em telas que executam ações
   * sensíveis). Sem isso, usa o conjunto já resolvido na sessão.
   */
  confirm?: boolean;
}

/**
 * Bloqueio de tela por capability. Fail-closed: enquanto carrega ou sem
 * resposta do servidor, o conteúdo fica bloqueado. O bloqueio real de dados
 * continua no servidor (`requireCapability` / /api/public/capability-check).
 */
export function CapabilityGate({ productKey, capability, children, label, confirm }: Props) {
  const { loading, canCapability, confirmCapability } = useEntitlements();
  const [serverAllowed, setServerAllowed] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!confirm || loading) return;
    let active = true;
    void confirmCapability(productKey, capability)
      .then((res) => {
        if (!active) return;
        setServerAllowed(res.allowed);
        setReason(res.reason);
      })
      .catch(() => {
        if (active) setServerAllowed(false);
      });
    return () => {
      active = false;
    };
  }, [confirm, loading, productKey, capability, confirmCapability]);

  if (loading || (confirm && serverAllowed === null)) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando seu acesso…
      </div>
    );
  }

  const allowed = confirm ? serverAllowed === true : canCapability(productKey, capability);
  if (allowed) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none opacity-40 blur-[3px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/85 p-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        {label ? <p className="text-sm font-semibold text-foreground">{label}</p> : null}
        <p className="max-w-xs text-xs text-muted-foreground">
          {reason ?? "Este recurso não está liberado para o seu plano ou perfil."}
        </p>
        <Button asChild size="sm">
          <Link to="/minha-conta">Ver planos e fazer upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
