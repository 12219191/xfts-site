import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  formatLimit,
  hasFeature,
  limitOf,
  type ResolvedEntitlements,
} from "@/lib/entitlements";

interface Props {
  entitlements: ResolvedEntitlements | null | undefined;
  /** Chave do recurso (feature) exigido. */
  feature?: string;
  /** Chave do limite exigido + uso atual. */
  limit?: { key: string; used: number };
  children: React.ReactNode;
  /** Rótulo do recurso mostrado no bloqueio. */
  label?: string;
}

/**
 * Bloqueia o conteúdo quando o plano do cliente não libera o recurso/limite.
 * Fail-closed: sem entitlements resolvidos, o conteúdo fica bloqueado.
 */
export function EntitlementGate({ entitlements, feature, limit, children, label }: Props) {
  let allowed = true;
  let reason = "";

  if (feature) {
    allowed = hasFeature(entitlements, feature);
    reason = "Este recurso não está incluído no seu plano.";
  }
  if (allowed && limit) {
    const max = limitOf(entitlements, limit.key);
    allowed = max === null || limit.used < max;
    reason = `Você atingiu o limite do plano (${formatLimit(max)}).`;
  }
  if (!entitlements?.ativo) {
    allowed = false;
    reason = "Sua assinatura deste sistema não está ativa.";
  }

  if (allowed) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none opacity-40 blur-[3px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/85 p-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        {label ? <p className="text-sm font-semibold text-foreground">{label}</p> : null}
        <p className="max-w-xs text-xs text-muted-foreground">{reason}</p>
        <Button asChild size="sm">
          <Link to="/minha-conta">Ver planos e fazer upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
