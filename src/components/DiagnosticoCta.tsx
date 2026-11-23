import { ClipboardCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackCTAClick } from "@/lib/tracking";
import {
  DIAGNOSTICO_BUTTON_LABEL,
  DIAGNOSTICO_COPY,
  diagnosticoUrl,
  type DiagnosticoKey,
  type DiagnosticoPlacement,
} from "@/lib/diagnostico";

/** Convite secundário para o diagnóstico gratuito — nunca compete com o teste grátis. */
export function DiagnosticoCta({
  productKey,
  placement,
  section,
}: {
  productKey: DiagnosticoKey;
  placement: Exclude<DiagnosticoPlacement, "rodape">;
  section: string;
}) {
  const href = diagnosticoUrl(productKey, placement);
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center sm:flex-row sm:text-left">
      <ClipboardCheck className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 text-sm text-muted-foreground">{DIAGNOSTICO_COPY[productKey].text}</p>
      <Button asChild variant="outline" className="shrink-0">
        <a
          href={href}
          target="_blank"
          rel="noopener"
          onClick={() =>
            trackCTAClick({
              section,
              action: `diagnostico-${productKey}`,
              label: DIAGNOSTICO_BUTTON_LABEL,
              destination: href,
            })
          }
        >
          {DIAGNOSTICO_BUTTON_LABEL}
          <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </Button>
    </div>
  );
}
