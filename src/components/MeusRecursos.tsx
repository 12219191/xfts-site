import { Check, Lock, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getFlexusApp } from "@/lib/flexus-apps";
import { formatLimit } from "@/lib/entitlements";
import { useEntitlements } from "@/hooks/useEntitlements";

/**
 * Mostra ao cliente exatamente o que o plano dele libera e onde estão os
 * limites. Os valores vêm resolvidos do servidor (catálogo + assinatura).
 */
export function MeusRecursos() {
  const { entitlements, loading } = useEntitlements();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando seus recursos…
      </div>
    );
  }

  if (entitlements.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <ShieldCheck className="h-5 w-5 text-primary" />
        O que seu plano libera
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {entitlements.map((ent) => {
          const app = getFlexusApp(ent.productKey);
          const features = ent.definicoes.filter((d) => d.kind === "feature");
          const limits = ent.definicoes.filter((d) => d.kind === "limit");
          return (
            <Card key={ent.productKey} className={ent.ativo ? "" : "opacity-70"}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{app?.name ?? ent.productKey}</p>
                  <Badge variant={ent.ativo ? "default" : "secondary"}>
                    {ent.planoNome ?? ent.plano ?? "—"}
                  </Badge>
                </div>

                {limits.length > 0 && (
                  <div className="space-y-3">
                    {limits.map((def) => {
                      const max = ent.limites[def.key] ?? 0;
                      const used = def.key === "usuarios" ? ent.seatsUsed : 0;
                      const pct = max === null || max === 0 ? 0 : Math.min(100, (used / max) * 100);
                      return (
                        <div key={def.key}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{def.label}</span>
                            <span className="font-medium text-foreground">
                              {def.key === "usuarios"
                                ? `${used} / ${formatLimit(max, def.unit)}`
                                : formatLimit(max, def.unit)}
                            </span>
                          </div>
                          {def.key === "usuarios" && max !== null ? (
                            <Progress value={pct} className="mt-1.5 h-1.5" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                <ul className="space-y-1.5">
                  {features.map((def) => {
                    const on = ent.features[def.key] === true;
                    return (
                      <li
                        key={def.key}
                        className={`flex items-center gap-2 text-sm ${
                          on ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {on ? (
                          <Check className="h-4 w-4 shrink-0 text-cta" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0 opacity-60" />
                        )}
                        {def.label}
                      </li>
                    );
                  })}
                </ul>

                {ent.capabilities.length > 0 && (
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Funcionalidades liberadas ({ent.capabilities.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ent.capabilities.map((key) => (
                        <Badge key={key} variant="secondary" className="font-normal">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {!ent.ativo && (
                  <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    Acesso bloqueado: assinatura inativa. Regularize para liberar os recursos.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
